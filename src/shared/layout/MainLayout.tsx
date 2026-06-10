import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/Sidebar';

export const MainLayout = () => {
  const { isAuthenticated } = useAuth();
  
  // Quản lý trạng thái đóng/mở Sidebar tập trung tại Layout
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* 1. VÙNG CHỨA SIDEBAR: 
        - Khi mở: Giữ nguyên độ rộng w-64 để giữ chỗ, không cho Form tràn qua.
        - Khi ẩn: Thu về w-0 để Form tự động tràn ra hết màn hình.
        - Hiệu ứng transition-all duration-300 giúp co giãn êm ái.
      */}
      <div 
        className={`flex-shrink-0 border-r border-slate-200 bg-white shadow-sm z-10 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-0 border-none'
        }`}
      >
        {/* Truyền state xuống cho Sidebar xử lý nút bấm */}
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>
      
      {/* 2. VÙNG CHỨA NỘI DUNG TRANG (FORM / TABLE):
        - Luôn chiếm trọn không gian còn lại nhờ flex-1.
        - Tự động mượt mà giãn ra hoặc thu vào khi vùng Sidebar thay đổi kích thước.
      */}
      <main className="flex-1 overflow-y-auto p-6 transition-all duration-300 ease-in-out">
        {/* Outlet là nơi các trang con (như trang Tồn kho, Form...) sẽ hiện ra */}
        <Outlet />
      </main>
    </div>
  );
};