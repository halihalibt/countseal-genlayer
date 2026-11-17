# CountSeal Interface and Accessibility Changes

## Interface structure

The procurement workspace is organized into reusable React components for the header, navigation, wallet selector, purchase-order list and detail, invoice entry and reconciliation, signed event history, transaction center, and footer. The interface uses a restrained navy-and-teal visual system, responsive layouts, loading placeholders, explicit empty states, and visible read/network warnings.

## Workflow presentation

- Purchase orders expose buyer/supplier roles, acceptance state, revision, currency, line-level ordered/received/reserved/approved/available quantities, and the immutable terms hash.
- Purchase-order creation and invoice submission support one to eight line items, integer quantities, integer minor-unit prices, and a pre-signing order summary.
- Invoice reconciliation presents semantic match status, target PO line, validator evidence excerpts, content/terms binding, and line-specific blocking reasons.
- Decision controls remain limited to the existing contract transitions. The interface explains reservation, release, approval, and terminal-state consequences; BLOCKED and REVIEW_REQUIRED results cannot be manually approved.
- Transaction records expose the submitted hash, execution state, signer, chain, target contract, intent digest, and signed arguments. Monitoring retains the original hash and does not resubmit transactions.
- JSON and approved-line CSV exports retain their existing finalized-state and spreadsheet-safety checks.

## Accessibility and responsive behavior

The wallet selector supports Escape-to-close, focus restoration, and keyboard focus containment. Dialog semantics are exposed to assistive technology. Form controls retain native keyboard behavior and visible focus styles. The stylesheet includes narrow-screen layouts and reduced-motion handling.

## Validation status

- Python protocol tests: 13 passed.
- JavaScript receipt/audit tests: 5 passed.
- Browser-extension signing with MetaMask and OKX must be verified in the target browser and wallet versions; it is not claimed as tested by these automated checks.
- No contract deployment or live write transaction is part of this interface update.
