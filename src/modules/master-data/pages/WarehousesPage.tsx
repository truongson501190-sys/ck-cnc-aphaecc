import { WarehouseManagement } from '@/components/categories/WarehouseManagement';

export function WarehousesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Kho</h1>
        <p className="text-gray-600 mt-1">Danh mục kho, vị trí lưu trữ và nhà máy (master data).</p>
      </div>
      <WarehouseManagement />
    </div>
  );
}
