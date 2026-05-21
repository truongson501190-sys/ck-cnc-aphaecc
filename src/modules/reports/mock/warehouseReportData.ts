export type WarehouseEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'in' | 'out' | 'transfer' | 'oil';
  warehouse: string;
  material: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  reference?: string;
};

export const warehouses = ['Kho A', 'Kho B', 'Kho C'];
export const materials = ['Thép', 'Nhôm', 'Đầu máy', 'Vít'];

export const warehouseEntries: WarehouseEntry[] = [
  { id: 'w-001', date: '2026-05-18', type: 'in', warehouse: 'Kho A', material: 'Thép', quantity: 100, unitPrice: 50, totalValue: 5000, reference: 'PN-1001' },
  { id: 'w-002', date: '2026-05-18', type: 'out', warehouse: 'Kho A', material: 'Thép', quantity: 20, unitPrice: 50, totalValue: 1000, reference: 'PX-2001' },
  { id: 'w-003', date: '2026-05-19', type: 'in', warehouse: 'Kho B', material: 'Nhôm', quantity: 200, unitPrice: 30, totalValue: 6000, reference: 'PN-1002' },
  { id: 'w-004', date: '2026-05-20', type: 'transfer', warehouse: 'Kho B', material: 'Đầu máy', quantity: 5, unitPrice: 1000, totalValue: 5000, reference: 'CH-3001' },
  { id: 'w-005', date: '2026-05-21', type: 'oil', warehouse: 'Kho C', material: 'Vít', quantity: 50, unitPrice: 5, totalValue: 250, reference: 'D-4001' },
  { id: 'w-006', date: '2026-05-21', type: 'out', warehouse: 'Kho A', material: 'Thép', quantity: 10, unitPrice: 50, totalValue: 500, reference: 'PX-2002' },
  { id: 'w-007', date: '2026-05-22', type: 'in', warehouse: 'Kho A', material: 'Vít', quantity: 500, unitPrice: 2, totalValue: 1000, reference: 'PN-1003' },
];
