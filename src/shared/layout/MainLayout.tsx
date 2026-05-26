import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // Chú đảm bảo đường dẫn import này đúng với vị trí file Sidebar của chú nhé

export const MainLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Sidebar cố định bên trái, không bao giờ bị load lại */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white shadow-sm z-10">
        <Sidebar />
      </div>
      
      {/* Vùng chứa nội dung trang, tự động cuộn khi nội dung quá dài */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Outlet là nơi các trang con sẽ hiện ra */}
        <Outlet />
      </main>
    </div>
  );
};