import { EmployeeManagement } from '@/components/categories/EmployeeManagement';

export function EmployeesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nhân viên</h1>
        <p className="text-gray-600 mt-1">Danh sách nhân sự vận hành, QC và bảo trì (master data).</p>
      </div>
      <EmployeeManagement />
    </div>
  );
}
