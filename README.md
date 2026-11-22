# CountSeal

CountSeal reconciles supplier invoices against signed purchase orders and available inventory on GenLayer Stable Studionet. GenLayer validators independently assess whether invoice lines describe the same physical items; the contract enforces exact prices and quantity limits.

[Open CountSeal](https://halihalibt.github.io/countseal-genlayer/) · [Returns milestone](docs/returns-milestone.md) · [Original V1 project](https://github.com/halihalibt/countseal-genlayer/tree/6df74b933fda54b45d807483aa82b7616c178341)

## V2 workflow

1. A buyer creates the order. A distinct supplier wallet accepts its immutable terms hash.
2. The buyer records deliveries. The supplier submits invoice lines and either party can run reconciliation. Ambiguous or unsupported matches cannot reserve inventory.
3. The buyer can propose a return with per-line quantities and a reason. The supplier confirms or declines that exact manifest. Confirmation reduces net received quantity only when enough unallocated units remain.
4. The buyer approves a reserved invoice using its content hash. Supplier withdrawals and buyer rejections release reservations. Approved units stay allocated.
5. Inspect the finalized order, inventory, invoices and signed history. Export the JSON ledger or approved-line CSV.

For each line, `available = net received - reserved - approved` and `net received = gross receipts - confirmed returns`. Approved invoices are reconciliation records. This testnet application does not transfer funds or verify physical delivery.

The interface centers on a selectable 3D quantity ledger, order index, and return manifest. Read-only exploration works without a wallet. To start a new order and try both signing roles, connect two compatible wallets or explicitly create two disposable testnet sessions from the wallet picker.

## Network and verification

- Stable Studionet, chain ID **61999**. [Deployment manifest](public/deployment.json) · [Contract source](contracts/count_seal.py) · [ABI](public/abi.json).
- The application verifies the source hash and protocol before writing. It requires finality, successful execution, and coherent finalized state. The optional read-only API uses the same deployment.
- [Official GenVM validation output](evidence/returns-genvm-lint.json) · [Milestone evidence and reproduction](docs/returns-milestone.md).
- V1 history is independently readable via its original contract. V2 uses a separate address and fresh demonstration records.

## Run locally

Node.js 22+ and Python 3.12+.

```sh
npm ci
npm test
npm run build
npm run dev
```

`npm run server` starts the optional read-only API. See [API setup](docs/api.md). The static application does not require a server, signing service, or paid API.

MIT license.
