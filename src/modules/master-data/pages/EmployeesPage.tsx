import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { EmployeeManagement } from '@/components/categories/EmployeeManagement';

export function EmployeesPage() {
  return (
    <div className="container mx-auto py-6">

      {/* HEADER */}
      <div className="mb-6 flex items-center gap-4">

        {/* NÚT QUAY VỀ TRANG CHỦ */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.location.href = '/'}
          className="h-10 w-10 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* TIÊU ĐỀ */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Nhân viên
          </h1>

          <p className="text-gray-600 mt-1">
            Danh sách nhân sự vận hành, QC và bảo trì (master data).
          </p>
        </div>

      </div>

      <EmployeeManagement />

    </div>
  );
}