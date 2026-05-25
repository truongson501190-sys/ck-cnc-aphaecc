// page quảng lý máy moc
import { MachineManagement } from '@/components/categories/MachineManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// THÊM DÒNG NÀY
import { useNavigate } from 'react-router-dom';

export function MachinesPage() {

  // THÊM DÒNG NÀY
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6">

      {/* HEADER */}
      <div className="mb-6 flex items-start gap-3">

        {/* Nút quay lại */}
        <Button
          variant="outline"
          size="icon"

          // SỬA THÀNH navigate
          onClick={() => navigate('/')}

          className="mt-1"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        {/* Tiêu đề */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🏭 1. Quản Lý Máy Móc
          </h1>

          <p className="text-gray-600 mt-1">
            CNC, máy kiểm tra, thiết bị bảo trì,
            robot và máy tiện ích (master data).
          </p>
        </div>

      </div>

      <MachineManagement />

    </div>
  );
}