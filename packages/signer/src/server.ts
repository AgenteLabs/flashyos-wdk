// A thin HTTP face for the signer: POST /execute with { authorization, call },
// and POST /sign-typed-data with { authorization, typedData } (Phase 18).
// No auth of its own by design — the signer is reachable only from inside the
// deployment's network, and the authorization *is* the credential: a request
// without a valid one does nothing. Exposing this port to the internet would
// be a deployment error, and docs/wallet/runbook.md says so.

import { createServer, type Server } from 'http';
import type { Signer, ExecuteRequest, SignTypedDataRequest } from './signer';

/**
 * A spend authorization plus a call is a few kilobytes at most; anything past
 * this is a mistake or an attempt to exhaust the process, and reading it to
 * the end would be the exhaustion. Refused with 413 before it is buffered.
 */
const MAX_BODY_BYTES = 64 * 1024;

export function createSignerServer(signer: Signer): Server {
  return createServer(async (req, res) => {
    // Totality at the transport. The signer's ladder answers every input with
    // a coded result; reaching the catch is a defect, not a refusal, and it
    // must return 500 rather than take the process down — an unhandled throw
    // in this async handler is an unhandledRejection, and Node exits on it.
    // (30E Ventures audit, finding N-02: a malformed `call` crashed the signer,
    // and because extraction runs before the nonce is spent it could be
    // retried freely.)
    try {
      const route = req.method === 'POST' && (req.url === '/execute' || req.url === '/sign-typed-data') ? req.url : null;
      if (!route) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'POST /execute or POST /sign-typed-data' }));
        return;
      }
      let size = 0;
      let tooLarge = false;
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        const buf = chunk as Buffer;
        size += buf.length;
        if (size > MAX_BODY_BYTES) {
          // Stop buffering — the memory is the attack — but keep draining to
          // the stream's end so the client reads our response cleanly instead
          // of a reset socket. The server's own request timeout bounds a body
          // that never ends.
          tooLarge = true;
          continue;
        }
        if (!tooLarge) chunks.push(buf);
      }
      if (tooLarge) {
        res.writeHead(413, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'request body too large' }));
        return;
      }
      const body = Buffer.concat(chunks).toString('utf8');
      let parsed: ExecuteRequest & SignTypedDataRequest;
      try {
        parsed = JSON.parse(body) as ExecuteRequest & SignTypedDataRequest;
        if (!parsed?.authorization) throw new Error('authorization is required');
        if (route === '/execute' && !parsed.call) throw new Error('authorization and call are required');
        if (route === '/sign-typed-data' && !parsed.typedData) throw new Error('authorization and typedData are required');
      } catch (err) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: (err as Error).message }));
        return;
      }
      const result = route === '/execute' ? await signer.execute(parsed) : await signer.signTypedData(parsed);
      res.writeHead(result.ok ? 200 : 403, { 'content-type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch {
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'internal signer error' }));
      } else {
        res.end();
      }
    }
  });
}
