import { CategoryTypeManagement } from './CategoryTypeManagement';

/**
 * @deprecated Master data is split into independent ERP modules.
 * Use `/master-data/categories` (CategoriesPage) or dedicated routes for Kho, Máy móc, Dự án, Nhân viên.
 */
export function CategoryManagementTabs() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Chủng loại</h1>
        <p className="text-gray-600">
          Chỉ quản lý nhóm vật tư / chủng loại. Kho, máy, dự án và nhân viên nằm ở menu Danh mục riêng.
        </p>
      </div>
      <CategoryTypeManagement />
    </div>
  );
}
