import { describe, it, expect } from 'vitest';
import { extractEvmOperation } from './evm';
import { extractOperation } from './index';

// Totality (30E Ventures audit, finding N-02).
//
// Extraction re-derives an operation from an untrusted call shape, and the
// signer runs it *before* the nonce is spent. So a throw here does not merely
// return an error — it crashes the signer process, and because the nonce was
// never spent the same authorization can be presented again to crash it again.
// Every malformed shape must therefore return null (refuse), never throw.
//
// The reproducers below are the exact shapes the audit named: an array `to`, a
// numeric `data`, a non-hex amount word, and the float 1e21 (which stringifies
// to '1e+21'). Each one reached a string method on a non-string and threw a
// TypeError before this fix.

const USDT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const VENDOR = '0x7f3c000000000000000000000000000000000001';
const TRANSFER_DATA =
  '0xa9059cbb' +
  '0000000000000000000000007f3c000000000000000000000000000000000001' +
  '00000000000000000000000000000000000000000000000000000000017d7840';

const malformed: [string, unknown][] = [
  ['an array `to`', { to: [VENDOR], value: '1000' }],
  ['a numeric `to`', { to: 1234, value: '1000' }],
  ['a null `to`', { to: null, value: '1000' }],
  ['a numeric `data`', { to: USDT, data: 1 }],
  ['an object `data`', { to: USDT, data: {} }],
  ['an array `value`', { to: VENDOR, value: [1, 2] }],
  ['a non-hex amount word', { to: USDT, data: '0xa9059cbb' + 'zz'.repeat(64) }],
  ['a float value 1e21 stringified to 1e+21', { to: VENDOR, value: String(1e21) }],
  ['a bare number where a call object was expected', 42],
  ['a string where a call object was expected', '0xdeadbeef'],
  ['null', null],
];

describe('extractEvmOperation is total (never throws)', () => {
  it.each(malformed)('refuses %s with null, not a throw', (_label, call) => {
    let out: unknown;
    expect(() => {
      out = extractEvmOperation(8453, call as never);
    }).not.toThrow();
    expect(out).toBeNull();
  });

  it('still reads a well-formed call', () => {
    expect(extractEvmOperation(8453, { to: USDT, data: TRANSFER_DATA })).toMatchObject({
      asset: USDT,
      destination: VENDOR,
      amount: '25000000',
    });
  });
});

describe('extractOperation is total across families and custom shapes', () => {
  it.each(malformed)('refuses %s with null, not a throw (evm)', (_label, call) => {
    let out: unknown;
    expect(() => {
      out = extractOperation('evm:8453', call);
    }).not.toThrow();
    expect(out).toBeNull();
  });

  it('refuses a malformed tron call with null, not a throw', () => {
    let out: unknown;
    expect(() => {
      out = extractOperation('tron:0x2b6653dc', { to: [VENDOR], amount: {} });
    }).not.toThrow();
    expect(out).toBeNull();
  });

  it('refuses an unknown family and a chain with no id', () => {
    expect(extractOperation('aptos:1', { to: USDT })).toBeNull();
    expect(extractOperation('evm', { to: USDT })).toBeNull();
  });

  it('still reads a well-formed evm call through the entry point', () => {
    expect(extractOperation('evm:8453', { to: USDT, data: TRANSFER_DATA })).toMatchObject({
      asset: USDT,
      destination: VENDOR,
      amount: '25000000',
    });
  });
});
