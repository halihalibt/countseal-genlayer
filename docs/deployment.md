# Deployment and verification

Pinned public metadata is in `public/deployment.json`. Chain ID must equal 61999 and RPC must equal `https://studio.genlayer.com/api`. Never change the chain silently or use an ACCEPTED transaction as a deployment proof.

`npm run schema` asks the real Stable Studionet GenVM to parse `contracts/count_seal.py` and writes `public/abi.json`. Compare this schema with frontend calls after a contract change. Schema parsing is not execution testing.

`npm run live` is a deployment and transaction acceptance runner, not a read-only check. It generates three isolated disposable test signers, funds them through the official Studio faucet, deploys with full consensus and journals each returned hash before polling. Keys are kept only in ignored `artifacts/test-signers.json` with mode 0600 and are removed after successful completion. An incomplete journal requires the original source and original signers; the runner refuses replacement accounts. A completed journal is never replayed. Do not share or commit artifacts or keys.

The test order covers synonym identity, aggregation of received capacity across invoices, blocking a second invoice that exceeds remaining capacity, approval, withdrawal and reuse of released capacity, unknown descriptions, exact price mismatch, material mismatch with embedded hostile instructions, outsider permission rejection, excess receiving, stale revisions, duplicate references and terminal approval replay. The journal records actual chain results. Expected transaction failures are negative tests, never counted as successful business writes.

`npm run verify` independently checks the chain ID, deployed source bytes and all recorded receipts, including decoded calldata identity. It reads the final order and all invoice states using `latest-final`, compares the final acceptance snapshot, validates content hashes and recomputes all active quantity allocations. It does not sign, deploy or fund anything. `node scripts/check-api.mjs` starts its own read-only server, checks routing/method restrictions, fetches actual finalized state and exercises approved CSV. Run it with the default API port free.

For a separate deployment, use a separate clean checkout and journal, preserve the contract's dependency header, and use Normal / Full Consensus in GenLayer Studio or an authorized SDK signer. Verify FINALIZED + SUCCESS and byte-exact source before changing public metadata. Never overwrite a pending hash to make a failed test appear successful.

The Vite build uses relative asset paths and can be served from a GitHub Pages repository subpath. `npm run build` produces `dist/`. Hosting the static output requires no signing key. The optional Node read API must be hosted separately if enabled; GitHub Pages cannot run Node servers. Do not include `.env`, artifact keys or development-only records in a static artifact.
