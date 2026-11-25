# Warehouse workflow notes

- **IN:** create the document, then post it to the ledger. The posting API sets
  the document to `received`.
- **OUT:** approve the document before posting it. At posting time the
  weighted-average RPC records the current average cost for the source
  warehouse/product.
- **TRANSFER:** post a source `TRANSFER_OUT` and destination `TRANSFER_IN` at
  the source warehouse's current weighted-average cost.
- **Inventory count:** post adjustment movements through the inventory-count
  API; a negative variance is retained as a negative quantity delta.

The valuation functions use the cost recorded on each ledger movement. They do
not retroactively recalculate or rewrite existing ledger entries. Review legacy
outbound costs before relying on historical valuation periods for accounting.

The stock-ledger RPC migration must be applied before posting through the
weighted-average API. Reversal remains unavailable until it can be authorized
and validated on the server for this application's custom authentication
system.
