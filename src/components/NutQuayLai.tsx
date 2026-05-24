import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

// CHÚ Ý: Cháu đã thêm chữ 'default' ở đây để sửa lỗi chú đang gặp
export default function NutQuayLai() {
  const navigate = useNavigate();
  const location = useLocation();

  // Nếu đang ở đúng Trang chủ chính (/) hoặc trang đăng nhập thì ẨN nút đi
  if (location.pathname === '/' || location.pathname.includes('login')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 bg-white p-2 rounded-2xl shadow-2xl border border-slate-200/80">
      {/* 1. NÚT QUAY LẠI TRANG TRƯỚC */}
      <Button
        onClick={() => navigate(-1)}
        className="h-11 w-11 p-0 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shadow-md transition-all hover:scale-105"
        title="Quay lại trang trước"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {/* 2. NÚT VỀ THẲNG TRANG CHỦ CHÍNH */}
      <Button
        onClick={() => navigate('/')}
        variant="outline"
        className="h-11 w-11 p-0 rounded-full border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm transition-all hover:scale-105"
        title="Về trang chủ chính"
      >
        <Home className="w-5 h-5" />
      </Button>
    </div>
  );
}