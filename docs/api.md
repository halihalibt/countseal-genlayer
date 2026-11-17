# Interfaces

## GenLayer method schema

`public/abi.json` is the actual GenVM schema, not an EVM Solidity ABI. Parameters below are positional. All return JSON **strings** except write methods, which return an identifier; transaction execution return values are not the canonical business readback. The client uses `genlayer-js@1.1.8`.

| Method | Arguments | Signer |
|---|---|---|
| `create_order` | `reference,title,supplier,currency,payload` | Buyer |
| `accept_order` | `oid,expected_revision,terms_hash` | Named supplier |
| `record_receipt` | `oid,expected_revision,reference,quantities` | Buyer |
| `submit_invoice` | `oid,expected_revision,reference,payload` | Supplier |
| `reconcile` | `iid,expected_revision` | Either named party |
| `decide_invoice` | `iid,expected_revision,approve,content_hash` | Buyer |
| `withdraw_invoice` | `iid,expected_revision` | Supplier |
| `get_protocol` | none | Public read |
| `list_orders` | none | Public read |
| `get_order` | `oid` | Public read |
| `get_invoice` | `iid` | Public read |

`expected_revision` is always the current **order** revision, including methods whose first parameter is an invoice ID. References are lowercase ASCII `[a-z0-9-]{3,40}`. Order IDs are `buyer:reference`; invoice IDs append `:invoice-reference`. Addresses are normalized lowercase. The supplier cannot equal the buyer.

`payload` is a JSON string of 1–8 objects with exactly `description` (5–700 characters), `quantity` (integer 1–1,000,000), `unit_price` (integer minor units 1–100,000,000). Floats, booleans-as-numbers and duplicate JSON keys are rejected. `quantities` is a JSON string of one nonnegative integer per PO line, in order, with positive total. Descriptions must retain all material item attributes and the unit/pack basis.

## Data

`src/types.ts` is the frontend data contract. Order fields include immutable `lines`, `buyer`, `supplier`, `currency`, `terms_hash`; mutable `accepted,revision,received,reserved,approved,invoice_ids,receipt_refs,events`. Events record the authenticated actor, transaction timestamp, subject and next revision.

Invoice fields include immutable `id,order_id,reference,lines,supplier,terms_hash,content_hash`; business `state`; `mapping.rows` of `status,target,invoice_quote,order_quote`; per-PO `allocation`; structured `reasons`; semantic `basis_hash` and `basis_revision` after reconciliation. `target` is zero-based, and equals -1 for non-matches. All UI item numbers are one-based.

## Optional read API

Run `npm run server` on Node.js 22+. Default binding: `127.0.0.1:8787`. No key, write relay or database. All routes are GET; others return 405. Public read-only CORS is intentional. Use a TLS reverse proxy and ordinary rate limits if exposing it publicly.

| Endpoint | Result |
|---|---|
| `/api/health` | Service/configuration only; explicitly `rpc_checked:false` |
| `/api/read?method=list_orders&args=[]` | Allowed finalized contract read |
| `/api/read?method=get_order&args=["order-id"]` | Finalized order; URL-encode query parameters |
| `/api/orders/:encodedOrderId` | Coherent validated order + all invoices |
| `/api/orders/:encodedOrderId/approved.csv` | Approved invoice lines only; currency and integer minor-unit totals |

Only `get_protocol,list_orders,get_order,get_invoice` are allowed through `/api/read`, with exact bounded string arguments. A response contains `chain_id,contract,state_variant:"latest-final",read_at,result`. Coherent snapshots validate source, hashes and active quantity allocations; RPC errors, concurrent revisions and invariant errors return 503 without invented records. Source bytes are rechecked at most once per minute per process. The server has no authoritative cache of business state.

Set `VITE_READ_API_URL=https://your-read-api.example` at frontend build time to use it. Leave unset for direct RPC reads. Writes and source verification always use the pinned chain from the browser. The frontend rejects API responses for another contract, chain or state variant. No automatic fallback silently substitutes a different deployment.

CSV exports escape cells beginning with spreadsheet formula characters. They are reconciliation data, not payment instructions. JSON exports retain full finalized evidence and source metadata.
