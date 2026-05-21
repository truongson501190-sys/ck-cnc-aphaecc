export type MovementType =
  | 'IN'
  | 'OUT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT'
  | 'OIL_OUT';

export type WarehouseMovementKind = 'IN' | 'OUT' | 'TRANSFER' | 'OIL_OUT';

export interface StockLedgerRow {
  id: string;
  occurred_at: string;
  posted_at: string;
  warehouse_id: string;
  product_id: string;
  movement_type: MovementType;
  qty_delta: number;
  unit_cost: number | null;
  document_type: string | null;
  document_id: string | null;
  document_line_id: string | null;
  reference: string | null;
  legacy_transaction_id: string | null;
  created_by: string | null;
  notes: string | null;
  idempotency_key: string;
}

export interface StockOnHandRow {
  warehouse_id: string;
  product_id: string;
  quantity_on_hand: number;
  valuation_amount: number;
}

export interface StockOnHandProductRow {
  product_id: string;
  quantity_on_hand: number;
  valuation_amount: number;
}

export interface PostMovementLineInput {
  productId: string;
  quantity: number;
  unitCost?: number;
  lineId?: string;
}

export interface PostWarehouseMovementInput {
  kind: WarehouseMovementKind;
  lines: PostMovementLineInput[];
  warehouseId?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  reference: string;
  legacyTransactionId: string;
  createdBy?: string;
  notes?: string;
  occurredAt?: string;
}
