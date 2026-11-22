# CountSeal returns milestone

Comparison baseline candidate: [6df74b9](https://github.com/halihalibt/countseal-genlayer/commit/6df74b933fda54b45d807483aa82b7616c178341), the default-branch head at kickoff. Confirm it against the most recently accepted Projects entry for submission.

The buyer proposes a return against accepted purchase terms. The supplier confirms or declines the exact quantity vector and reason using the manifest digest. A pending or declined return leaves stock untouched. Confirmation updates net receipts and cumulative returns in the same transaction and rechecks every line against active reservations and approved invoices. Stale revisions, unauthorized signatures, mismatched digests and terminal replays are rejected.

The new workspace includes a searchable order rail, an interactive 3D quantity ledger driven by finalized chain values, a return manifest, and separate order, invoice and history views. The original deployed V1 records remain at their original address. V2 starts with fresh demonstration orders.

## Reproduce

- `npm ci && npm test && npm run build`
- `genvm-lint check contracts/count_seal.py --json`
- `npm run schema` to regenerate the ABI from Studionet
- `node scripts/live-returns.mjs` to deploy and exercise V2 using disposable faucet-funded actors. The script journals hashes and resumes from them. Keep its ignored signer file until the run completes.
- `node scripts/verify-returns.mjs` to independently verify source identity, finalized receipts, rejection reasons, manifest hashes and finalized order/invoice snapshots.

The recorded acceptance scenarios cover a partial return and invoice capacity change, a supplier decline that leaves capacity unchanged, cumulative multi-item returns, and inspections still awaiting supplier response.

Milestone readiness depends on completed live verification and hosted workflow checking. [GenVM output](../evidence/returns-genvm-lint.json).

## V2 deployment

The [V2 deployment manifest](../public/deployment.json) points to a separate Stable Studionet deployment. The deployment transaction finalized successfully and the live runner read back identical source bytes. Business acceptance is tracked separately.

## Frontend validation

Fifteen mock-host contract tests, five JavaScript tests, TypeScript and the production build passed. A read-only DOM smoke test mounted the production bundle against the live V2 RPC and exercised category focus, item selection and history navigation. Desktop and mobile rendering against the live contract were also verified in [Chromium CI](https://github.com/halihalibt/countseal-genlayer/actions/workflows/ci.yml). These read-only checks do not exercise browser-wallet signatures.
