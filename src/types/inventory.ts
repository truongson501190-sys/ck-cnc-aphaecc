export interface InventoryItem {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  location: string;
  price: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseTransaction {
  id: string;
  type: 'import' | 'export' | 'transfer' | 'oil_export';
  /** Set when posting to ledger; optional on legacy / ExactLayout form payloads */
  category_id?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  totalValue?: number;
  warehouse_id?: string; // For import/export
  from_warehouse_id?: string; // For transfer
  to_warehouse_id?: string; // For transfer
  project_id?: string; // For export
  machine_id?: string; // For oil export
  created_by?: string; // User foreign key
  received_by?: string; // User foreign key when goods are received
  approved_by?: string; // User foreign key for approval
  reason?: string;
  referenceNumber: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  transactionDate: string;
  createdAt: string;
  notes?: string;
  approvedAt?: string;
  // Support for bulk line items in complex layouts
  items?: WarehouseTransactionItem[];
  trangThaiBanDau?: string;
  /** ExactLayout / legacy single-line form fields (see postStockDocument mapping) */
  itemId?: string;
  itemName?: string;
  toLocation?: string;
  fromLocation?: string;
  operator?: string;
  machineId?: string;
  /** Legacy form fields */
  recipient?: string;
  projectId?: string;
}

export interface WarehouseTransactionItem {
  id: string;
  category_id?: string;
  /** UI selection key (often same as category id or code) */
  itemId?: string;
  itemName?: string; // Optional denormalized display name
  quantity: number;
  unit: string;
  price?: number;
  totalValue?: number;
  ghiChu?: string;
}

export type { Category } from './categories';

export interface WarehouseLocation {
  id: string;
  name: string;
  code: string;
  type: 'warehouse' | 'production' | 'office' | 'external';
  address?: string;
  manager?: string;
  isActive: boolean;
  createdAt: string;
}