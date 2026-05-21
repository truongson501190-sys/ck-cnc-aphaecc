import { MachineManagement } from '@/components/categories/MachineManagement';

export function MachinesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Máy móc</h1>
        <p className="text-gray-600 mt-1">
          CNC, máy kiểm tra, thiết bị bảo trì, robot và máy tiện ích (master data).
        </p>
      </div>
      <MachineManagement />
    </div>
  );
}
