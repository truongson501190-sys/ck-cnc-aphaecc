import { CategoryTypeManagement } from '@/components/categories/CategoryTypeManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

/** Chủng loại — material / inventory / product / tooling categories only. */
export function CategoriesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center gap-4">
        {/* Nút quay lại - đã chỉnh màu sáng hơn */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => window.location.href = '/'} 
          className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
         
        </Button>

        {/* Tiêu đề */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chủng loại</h1>
          <p className="text-gray-600 mt-1">
            Nhóm vật tư, chủng loại vật liệu, dao cụ và nhóm sản phẩm trong kho.
          </p>
        </div>
      </div>
      
      <CategoryTypeManagement />
    </div>
  );
}