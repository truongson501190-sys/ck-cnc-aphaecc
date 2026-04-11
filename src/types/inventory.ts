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
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  price?: number;
  totalValue?: number;
  fromLocation?: string;
  toLocation?: string;
  // optional machine reference used by oil-export flows
  machineId?: string;
  projectId?: string;
  customerName?: string;
  reason: string;
  referenceNumber: string;
  operator: string;
  approver?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  transactionDate: string;
  createdAt: string;
  notes?: string;
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