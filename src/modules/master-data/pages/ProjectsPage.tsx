import { ProjectManagement } from '@/components/categories/ProjectManagement';

export function ProjectsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dự án</h1>
        <p className="text-gray-600 mt-1">Danh mục dự án, đơn hàng và khách hàng (master data).</p>
      </div>
      <ProjectManagement />
    </div>
  );
}
