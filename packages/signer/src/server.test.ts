import { describe, it, expect, afterEach } from 'vitest';
import { generateKeyPairSync, sign } from 'crypto';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createSignerServer } from './server';
import { Signer, type SignerOptions } from './signer';
import { MockChain } from './chain';
import { canonicalize } from './verify';
import type { SignedSpendAuthorization } from '@flashyos/wallet-wdk';

// The HTTP face must be total (30E Ventures audit, finding N-02). A malformed
// call, or a signer that throws for any reason, must come back as a coded HTTP
// response — never as an unhandled rejection that exits the process. The proof
// that matters is the second request: if the first one had crashed the signer,
// the server would be gone and the follow-up would never answer.

const USDT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const VENDOR = '0x7f3c000000000000000000000000000000000001';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const planePublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

function issue(patch: Partial<SignedSpendAuthorization> = {}): SignedSpendAuthorization {
  const payload = {
    id: `auth_${Math.random().toString(36).slice(2)}`,
    orgId: 'org_1',
    agentName: 'research-ops',
    chain: 'evm:8453',
    kind: 'transfer' as const,
    asset: USDT,
    maxAmount: '25000000',
    destination: VENDOR,
    reservationId: 'rsv_1',
    decisionId: 'dec_1',
    issuedAt: '2026-09-19T11:00:00.000Z',
    expiresAt: '2026-09-19T11:05:00.000Z',
    ...patch,
  };
  const unsigned = { ...payload, sig: '' };
  return { ...payload, sig: sign(null, canonicalize(unsigned), privateKey).toString('base64url') };
}

const NOW = () => new Date('2026-09-19T11:02:00Z');

let server: Server | undefined;
afterEach(() => server?.close());

function start(extra: Partial<SignerOptions> = {}): Promise<string> {
  const signer = new Signer({ planePublicKeyPem, chains: [new MockChain()], now: NOW, ...extra });
  server = createSignerServer(signer);
  return new Promise((resolve) => {
    server!.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server!.address() as AddressInfo).port}`));
  });
}

const post = (base: string, path: string, body: string) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });

describe('createSignerServer is total', () => {
  it('answers a malformed call (array `to`) and stays up for the next request', async () => {
    const base = await start();

    // The N-02 reproducer: an array `to` used to throw a TypeError deep in the
    // extractor and take the process down. Now it refuses cleanly.
    const bad = await post(base, '/execute', JSON.stringify({ authorization: issue(), call: { to: [VENDOR], value: '1' } }));
    expect(bad.status).toBe(403);
    expect(await bad.json()).toMatchObject({ ok: false, code: 'UNRECOGNISED_CALL' });

    // The server is still here — the whole point.
    const good = await post(base, '/execute', JSON.stringify({ authorization: issue(), call: { to: USDT, value: '0', data: '0xa9059cbb' + VENDOR.slice(2).padStart(64, '0') + (1).toString(16).padStart(64, '0') } }));
    expect(good.status).toBe(200);
    expect(await good.json()).toMatchObject({ ok: true });
  });

  it('returns 500 and survives when the signer itself throws', async () => {
    const base = await start({ extract: () => { throw new Error('boom'); } });

    const first = await post(base, '/execute', JSON.stringify({ authorization: issue(), call: { to: USDT, value: '1' } }));
    expect(first.status).toBe(500);
    expect(await first.json()).toMatchObject({ error: 'internal signer error' });

    // Alive for the next caller.
    const second = await post(base, '/execute', JSON.stringify({ authorization: issue(), call: { to: USDT, value: '1' } }));
    expect(second.status).toBe(500);
  });

  it('refuses an oversized body with 413 before buffering it', async () => {
    const base = await start();
    const huge = JSON.stringify({ authorization: issue(), call: { to: USDT, data: '0x' + 'a'.repeat(200_000) } });
    const res = await post(base, '/execute', huge);
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: 'request body too large' });

    // And the next, well-sized request is served.
    const ok = await post(base, '/execute', JSON.stringify({ authorization: issue(), call: { to: [VENDOR] } }));
    expect(ok.status).toBe(403);
  });

  it('still refuses a non-route and a malformed JSON body with their own codes', async () => {
    const base = await start();
    const notFound = await fetch(`${base}/nope`, { method: 'POST', body: '{}' });
    expect(notFound.status).toBe(404);
    const badJson = await post(base, '/execute', '{ not json');
    expect(badJson.status).toBe(400);
  });
});
