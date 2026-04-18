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
  category_id: string; // Foreign key to categories
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
}

export interface WarehouseTransactionItem {
  id: string;
  category_id: string; // Foreign key to categories
  itemName?: string; // Optional denormalized display name
  quantity: number;
  unit: string;
  price?: number;
  totalValue?: number;
  ghiChu?: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
}

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