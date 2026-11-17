# Protocol

## Authority

The authenticated buyer authors immutable order lines and receiving declarations. A separate authenticated supplier accepts `terms_hash` and submits invoice lines. The network reaches consensus on item identity from these signed inputs; it does not authenticate a merchant document, warehouse or legal entity. A wallet address is not proof of a unique person. There is no reliance on a mutable external webpage, exchange rate or inferred current event: this workflow's authoritative inputs are the parties' exact onchain declarations.

The terms hash is SHA-256 of sorted-key compact UTF-8 JSON containing `id,buyer,supplier,currency,lines`. Invoice content hashes cover the immutable `lines` array. The semantic basis hash covers `{order:[descriptions],invoice:[descriptions]}`. Every state-changing method after creation binds the current **order revision**, serializing competing invoices and receiving events across the entire purchase order. Signature sender is never accepted from a frontend-provided role field.

## Intelligent matching

`reconcile` calls `gl.vm.run_nondet_unsafe` with a leader function and an independent validator function. The leader classifies every invoice line against all PO descriptions and supplies contiguous evidence excerpts. Each validator runs its own classification without the leader's result and requires exact agreement on the complete ordered `(status,target)` vector. Different valid wording of supporting excerpts is allowed. Each validator also audits the candidate excerpts against full inputs and fixed rules. Deterministic parsing rejects extra fields, forged excerpts, invalid targets and malformed labels.

- `MATCH`: precisely one PO line supports the same physical item and unit basis.
- `NO_MATCH`: explicit material conflicts with all candidates.
- `AMBIGUOUS`: more than one explicitly equivalent candidate.
- `UNKNOWN`: a required identifying attribute is absent or unsupported.

Embedded commands are untrusted text, not instructions. Matching does not use price to break semantic ties. A missing size or incompatible pack basis cannot be guessed from typical use. Consensus disagreement, model failure or invalid output fails the transaction; there is no administrator classification override. This is not a mathematical guarantee of real-world semantic correctness.

## Quantity transitions

`SUBMITTED` invoices do not reserve capacity. Successful reconciliation yields `RESERVED`, `BLOCKED` or `REVIEW_REQUIRED` as a **business state**, distinct from the transaction's execution result.

For all invoice lines together, deterministic code groups quantities by accepted PO index, requires each unit price to equal the exact PO minor-unit price, and compares aggregate quantity against `received - approved - reserved`. Multiple invoice lines matching one PO item are added before checking the cap. It reserves **all** mapped quantities or **none**, never a partial invoice. Unknown/ambiguous lines produce `REVIEW_REQUIRED`; other errors produce `BLOCKED`. The reason index for `INSUFFICIENT_RECEIVED` refers to the PO item; other reason indexes refer to invoice lines.

Buyer approval is allowed only from `RESERVED`, requires the exact invoice content hash, subtracts its reservation and adds the same quantities to `approved`. Buyer rejection or supplier withdrawal releases only that invoice's reservation and makes it terminal. Terminal invoices cannot be approved or withdrawn again. Released allocation vectors remain historical evidence on rejected/withdrawn records; only records currently `RESERVED` or `APPROVED` contribute to the active ledger.

Rejected or blocked records cannot be edited or reassessed. To correct inputs or use newly recorded receipts, the supplier creates a new unique invoice reference. All historical references remain occupied. Purchase orders do not share capacity. Two orders describing the same physical delivery are outside the duplicate-capacity guarantee.

## Finality and reads

All SDK writes use `leaderOnly:false`. `ACCEPTED` is intermediate. Frontend, live acceptance and independent verification require `FINALIZED` and inspect the actual leader execution result. A successful `reconcile` may correctly yield a blocked invoice; success never implies approval.

The frontend stores the returned hash and signed intent in session storage, monitors without resending and verifies receipt sender, destination, decoded method and arguments. Finalized order/invoice reads are followed by a second order revision read to reject mixed snapshots. The exported timestamps describe when the read was made, not a finality guarantee for any subsequent business change. Read failure leaves the last record visibly marked and pauses writes until refresh succeeds.
