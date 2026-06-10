import { ProjectManagement } from '@/components/categories/ProjectManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ProjectsPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center gap-4">
        {/* Nút quay lại */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/trang-chu')}
          className="h-10 w-10 border-slate-300 hover:bg-slate-100 shadow-sm rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dự án</h1>
          <p className="text-gray-600 mt-1">Danh mục dự án, đơn hàng và khách hàng (master data).</p>
        </div>
      </div>
      <ProjectManagement />
    </div>
  );
}