import { CategoryTypeManagement } from '@/components/categories/CategoryTypeManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** Chủng loại — material / inventory / product / tooling categories only. */
export function CategoriesPage() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center gap-4">
        {/* Nút quay lại */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/trang-chu')}
              className="mt-1 h-10 w-10 border-slate-300 hover:bg-slate-100 shadow-sm rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
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