# CountSeal

**Every unit accounted for.** A small-team purchase-order reconciliation application on GenLayer Stable Studionet.

**Live application:** https://halihalibt.github.io/countseal-genlayer/

A supplier calls an item “hexagonal steel bolts, each”; the buyer's purchase order specifies “steel hex-head bolt M8 x 30 mm, one individual bolt.” A spreadsheet cannot safely decide whether these are the same item, and a private model answer cannot protect shared receiving capacity. CountSeal combines independently validated item-identity reasoning with exact onchain quantity accounting across multiple invoices.

The buyer signs immutable purchase terms and declares received quantities. A distinct supplier wallet accepts the exact terms hash and submits immutable invoice lines. GenLayer independently matches descriptions against every PO line. The contract reserves quantities only when every line has one supported target, the exact agreed unit price, and enough unallocated received units. A separate buyer signature approves the exact invoice content hash. Withdrawing or rejecting a reservation releases its capacity; approved quantities remain consumed.

For every PO item:

```text
approved + reserved <= received <= ordered
available = received - approved - reserved
```

Approval is a reconciliation record, **not a payment, legal enforceability determination, or proof of physical delivery**. Names, quantities and receipt events are declarations by the signing parties. Use only non-confidential test data on this public network.

## Network and source

- Stable Studionet: **61999** / `0xf22f`.
- RPC: `https://studio.genlayer.com/api`.
- Contract: `0xAe839D5523b1577cF0f60ad87b2756fFd8Ac064c`.
- Deployment transaction: `0x7402b5d244f084a675605ffbe0a826087c4983fc68a4492701c64dab1eb17ee6`.
- Python source SHA-256: `bc03f203f739135f3ce6d51fcaf7647199fe56a87ccc8696110f9ab1d6567065`.
- [Pinned metadata](public/deployment.json) · [Real GenVM method schema](public/abi.json) · [Intelligent Contract](contracts/count_seal.py).

The frontend verifies deployed source bytes and protocol before signing, discovers EIP-6963 wallets with EIP-1193 legacy fallback, checks the active account/network, submits full-consensus writes, persists submitted hashes in tab-session storage, requires FINALIZED + SUCCESS, and reads `latest-final`. Its coherent snapshot check recomputes active invoice allocations and validates content/terms hashes. No fabricated ledger records are used as application data.

## Run

Node.js 22+ and Python 3.12+ are recommended.

```sh
npm ci
npm test
npm run build
npm run dev
```

The app uses the public RPC directly by default. No paid API, signing server, database, relayer or centralized model key is needed. An optional read-only Node API provides finalized snapshots and approved-line CSV exports:

```sh
npm run server
node scripts/check-api.mjs
```

Run `check-api` with port 8787 free; it starts and stops its own test server. Copy `.env.example` to `.env` only if you want the frontend to use a separately deployed read API. Static hosting remains sufficient for all writes and default reads. Network, source-verification or snapshot failure pauses writes rather than replacing missing data with sample values.

## Use

1. Connect buyer and supplier wallets as separate roles. Create a purchase order with 1–8 precise physical item descriptions, integer quantities and integer minor-unit prices. Supported currencies USD, EUR, GBP and SGD have two decimal places; no exchange-rate or tax calculation occurs.
2. Supplier reviews and signs the exact purchase terms hash. These terms cannot be edited.
3. Buyer records a unique delivery reference with the additional received quantity for each PO line. Quantities cannot exceed the original order.
4. Supplier submits invoice lines under a unique reference. Explicitly specify material, size/model and individual/pack basis; no pack conversion is inferred.
5. Either party runs GenLayer reconciliation. Every validator independently classifies the complete mapping. `UNKNOWN` or `AMBIGUOUS` never grants capacity; price/quantity conflicts cannot be manually overridden.
6. Buyer approves a `RESERVED` invoice with its content hash or rejects a pending invoice. Supplier can withdraw a pending invoice, releasing reserved capacity. Correct rejected, blocked or ambiguous invoices using a new unique reference.
7. Inspect quantity totals, semantic excerpts and actor history; export the finalized JSON record or approved-line CSV. `APPROVED` does not mean paid.

The optional temporary signer control creates actual disposable Studionet accounts using the official faucet. Keys stay in the page's memory, are never exported or persisted, and are lost on reload. Never deposit assets into them. Two temporary signers can exercise both roles; injected wallets remain the normal integration path.

## Verification

The recorded deployment and acceptance run contains **25 FINALIZED transactions: 19 successful executions and 6 expected contract rejections**. Independent receipt re-fetch, exact rejection reasons, source comparison, calldata identity and finalized state readback passed; see [verification evidence](evidence/verification.json). The final test order has received `[6,10]`, approved `[6,10]` and reserved `[0,0]`. Read API checks are recorded in [API evidence](evidence/api.json); [HTTP smoke evidence](evidence/web-http.json) verifies development asset/metadata responses and does not claim browser or wallet testing.

`npm test` runs 13 mock-host Python tests and 5 JavaScript tests. They cover independent-validator disagreement and evidence auditing, forged excerpts, exact-price checks, collision aggregation, exhaustive small quantity boundaries, approval permissions, content binding, release of reservations, replay prevention, snapshot integrity and CSV safety. These local checks do not establish GenVM or wallet behavior.

`scripts/live.mjs` deploys exact source, sends real full-consensus Studionet transactions, journals hashes before polling, requires FINALIZED plus the expected execution result and reads finalized business state. It uses dedicated disposable, faucet-funded test actors, removes their local keys after completion, and refuses to overwrite a completed journal. [Live evidence](evidence/live.json) records actual outcomes, including intentional contract rejections. `npm run verify` independently re-fetches every receipt, decodes calldata, compares sender/target/arguments, verifies source bytes and recomputes the finalized quantity ledger. See the evidence files for measured results; a passing schema or a submitted hash alone is never a successful deployment or business action.

Injected-wallet discovery supports MetaMask, OKX, Rabby, Coinbase Wallet and Trust Wallet providers where they implement the relevant standards. Their individual extension UIs are not certified by a CLI test. Browser-wallet acceptance must be performed in the target browser and wallet version.

- [Protocol and trust boundaries](docs/protocol.md)
- [Read API and data structures](docs/api.md)
- [Operational limits](docs/limitations.md)
- [Deployment and verification](docs/deployment.md)

## License

MIT. GenLayer and wallet names identify their respective projects; this application is independent.
