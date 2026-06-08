// MachinesPage.tsx
import { MachineManagement } from '@/components/categories/MachineManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';

export function MachinesPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Đã làm mới dữ liệu');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4 md:px-6">
        
        {/* HEADER */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
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
              <h1 className="text-3xl font-bold text-gray-900">
                Quản Lý Máy Móc
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Quản lý danh sách máy móc, thiết bị, đơn giá ca máy cho sản xuất CNC
              </p>
            </div>
          </div>

          {/* Nút tiện ích */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 text-xs border-slate-200 bg-white hover:bg-slate-50"
              title="Làm mới dữ liệu"
            >
              <svg 
                className="w-3.5 h-3.5 mr-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Làm mới
            </Button>
          </div>
        </div>

        {/* Nội dung chính - Component quản lý máy */}
        <MachineManagement key={refreshKey} />

        {/* Footer thông tin */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>© 2024 - Hệ thống quản lý máy móc | Tổng số máy được cập nhật tự động</p>
        </div>
      </div>
    </div>
  );
}

// Export default cho routing
export default MachinesPage;