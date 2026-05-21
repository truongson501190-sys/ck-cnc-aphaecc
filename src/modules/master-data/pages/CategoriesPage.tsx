import { CategoryTypeManagement } from '@/components/categories/CategoryTypeManagement';

/** Chủng loại — material / inventory / product / tooling categories only. */
export function CategoriesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Chủng loại</h1>
        <p className="text-gray-600 mt-1">
          Nhóm vật tư, chủng loại vật liệu, dao cụ và nhóm sản phẩm trong kho.
        </p>
      </div>
      <CategoryTypeManagement />
    </div>
  );
}
