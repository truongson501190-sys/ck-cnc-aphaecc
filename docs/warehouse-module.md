# Warehouse module

## Inventory valuation

Migration `016_valuation_views.sql` adds the current valuation view and historical
month-end valuation RPC. The report is available at
`/reports/warehouse-valuation` and requires the `bao_cao_kho` permission.

Issue and transfer movements posted through
`post_warehouse_movement_weighted_average` use the source warehouse/product's
weighted-average unit cost. Receipts continue to use the document line's unit
cost. The RPC takes transaction-scoped advisory locks for the affected
warehouse/product pairs while it calculates issue cost and posts the movement.

The ledger remains the source for quantity and value:

- `on_hand_qty = SUM(qty_delta)`
- `on_hand_value = SUM(qty_delta * unit_cost)`
- `avg_unit_cost = on_hand_value / on_hand_qty`, when quantity is positive

Historical entries are not rewritten by the migration. Values for movements
created before the weighted-average RPC was deployed therefore reflect the
unit costs already stored on those entries.

## Deployment

Apply migrations in order, including `016_valuation_views.sql`, before using the
valuation report. The app uses Supabase's anon client when there is no Supabase
Auth session, so the valuation view and RPC are granted to both `anon` and
`authenticated`. Apply normal project-level RLS and network access controls
appropriate to the deployment.
