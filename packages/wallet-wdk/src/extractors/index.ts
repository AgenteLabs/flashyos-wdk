// One entry point: a chain and whatever the caller is about to hand WDK →
// the OperationRecord it actually performs, or null. Null means refuse.

import type { OperationRecord } from '../types';
import { familyOf } from './address';
import { extractEvmOperation, type EvmCall } from './evm';
import { extractProtocolOperation, isProtocolCall, type BridgeCall, type ProtocolCall, type SwapCall } from './protocols';
import { extractTronOperation, type TronCall } from './tron';

export type SignerCall = EvmCall | TronCall | SwapCall | BridgeCall;

export function extractOperation(chain: string, call: unknown): OperationRecord | null {
  // Totality. Extraction re-derives an operation from an untrusted call shape,
  // and the one thing it may never do is throw: the signer runs it *before*
  // the nonce is spent, so a throw both crashes the process and leaves the
  // authorization unconsumed to retry the crash. Every refusal is a null.
  // Per-extractor typeof guards keep each family honest on its own; this catch
  // is the backstop that also covers a custom `extract` and any field a future
  // chain family forgets to guard. (30E Ventures audit, finding N-02.)
  try {
    if (!call || typeof call !== 'object') return null;
    if (isProtocolCall(call)) return extractProtocolOperation(chain, call as ProtocolCall);
    const family = familyOf(chain);
    const [, chainId] = chain.split(':');
    if (!family || !chainId) return null;
    if (family === 'evm') return extractEvmOperation(chainId, call as EvmCall);
    if (family === 'tron') return extractTronOperation(chainId, call as TronCall);
    return null;
  } catch {
    return null;
  }
}
