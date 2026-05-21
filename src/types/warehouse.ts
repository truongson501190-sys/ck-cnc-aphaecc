export interface InventoryCountEntry {
  id: string;
  itemCode: string;
  itemName: string;
  warehouse: string;
  countedQuantity: number;
  expectedQuantity: number;
  difference: number;
  countedAt: string;
  status: 'matched' | 'mismatch' | 'pending';
  notes?: string;
}

export interface StockCardEntry {
  id: string;
  itemCode: string;
  itemName: string;
  warehouse: string;
  transactionType: 'import' | 'export' | 'transfer' | 'oil_export';
  quantity: number;
  balanceAfter: number;
  transactionDate: string;
  reference: string;
  note?: string;
}

export interface TransactionHistoryEntry {
  id: string;
  reference: string;
  itemCode: string;
  itemName: string;
  type: 'import' | 'export' | 'transfer' | 'oil_export';
  quantity: number;
  unit: string;
  warehouseFrom?: string;
  warehouseTo?: string;
  project?: string;
  machine?: string;
  status: 'draft' | 'completed' | 'cancelled';
  transactionDate: string;
  createdBy: string;
  notes?: string;
}
