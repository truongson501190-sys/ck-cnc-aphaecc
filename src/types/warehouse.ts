// src/types/warehouse.ts

export interface Category {
  id: string;
  code: string;
  name: string;
  unit: string;
  minStock: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TransactionItem {
  categoryId: string;
  quantity: number;
  price?: number;
}

export interface BaseTransaction {
  id: string;
  type: 'import' | 'export' | 'transfer' | 'consumable' | 'adjustment';
  date: string;
  items: TransactionItem[];
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ImportTransaction extends BaseTransaction {
  type: 'import';
  supplier?: string;
  warehouse: string;
}

export interface ExportTransaction extends BaseTransaction {
  type: 'export';
  project?: string;
  warehouse: string;
  receiver?: string;
}

export interface TransferTransaction extends BaseTransaction {
  type: 'transfer';
  fromWarehouse: string;
  toWarehouse: string;
}

export interface ConsumableTransaction extends BaseTransaction {
  type: 'consumable';
  project?: string;
  warehouse: string;
  receiver?: string;
}

export interface AdjustmentTransaction extends BaseTransaction {
  type: 'adjustment';
  warehouse: string;
  reason: string;
  inventoryCountId?: string;
}

export interface InventoryCountEntry {
  id: string;
  categoryId: string;      // Bắt buộc
  itemCode: string;
  itemName: string;
  warehouse: string;
  countedQuantity: number;
  expectedQuantity: number;
  difference: number;
  countedAt: string;
  status: 'pending' | 'matched' | 'mismatch' | 'applied';
  notes?: string;
  adjustedTransactionId?: string;
}

export type Transaction = 
  | ImportTransaction 
  | ExportTransaction 
  | TransferTransaction 
  | ConsumableTransaction 
  | AdjustmentTransaction;