import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Megaphone, Calendar, Clock, Bell, PlusCircle, ShieldAlert } from 'lucide-react';

export function DailyNews() {
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Đọc thông tin phiên làm việc để chào đích danh tên nhân viên
    const loggedUser = localStorage.getItem('current_logged_user');
    if (loggedUser) {
      setUser(JSON.parse(loggedUser));
    }

    // Định dạng ngày ca trực hôm nay
    const date = new Date();
    setCurrentDate(`Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`);
  }, []);

  // Danh sách thông báo nội bộ giả định tại xưởng CNC
  const newsList = [
    {
      id: 1,
      tag: 'CẤP BÁCH',
      tagColor: 'bg-red-500',
      title: 'Bảo dưỡng định kỳ hệ thống máy phay CNC mã hiệu Haas VF-2',
      content: 'Yêu cầu tổ máy CNC tạm dừng cấp phôi vào máy số 03 từ 14h00 chiều nay để tổ cơ điện tiến hành thay dầu và hiệu chuẩn trục chính.',
      time: '10 phút trước',
      author: 'Ban Quản Đốc'
    },
    {
      id: 2,
      tag: 'AN TOÀN',
      tagColor: 'bg-amber-500',
      title: 'Trang bị bổ sung bảo hộ lao động (Kính hàn & Giày mũi thép)',
      content: 'Nhân viên mới nhận việc hoặc anh em kỹ thuật cần đổi đồ bảo hộ cũ mòn vui lòng qua kho WMS gặp thủ kho để ký nhận bàn giao trước ngày thứ Sáu.',
      time: '2 giờ trước',
      author: 'Hội đồng An toàn LĐ'
    },
    {
      id: 3,
      tag: 'THÔNG BÁO',
      tagColor: 'bg-blue-500',
      title: 'Triển khai lệnh gia công cho cấu kiện dự án giàn khoan Alpha 02',
      content: 'Phòng kỹ thuật đã phê duyệt bản vẽ chi tiết bích nối áp lực cao. Bản phôi thô đã hạ bãi, yêu cầu tổ trưởng phân ca lập trình chạy máy gấp.',
      time: 'Hôm qua',
      author: 'Phòng Kỹ Thuật CNC'
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Khối Banner Lời Chào Ca Trực */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-950 p-6 rounded-2xl text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-6 -translate-y-6">
          <Megaphone className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold tracking-wider uppercase">
            <Bell className="w-3.5 h-3.5 animate-bounce" /> Bảng tin điều hành nội bộ
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Chào ca làm việc, {user ? <span className="text-emerald-400">{user.fullName}</span> : 'Kỹ sư'}!
          </h1>
          <p className="text-slate-400 text-xs flex items-center gap-4 pt-1">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {currentDate}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Hệ thống kho Alpha ECC</span>
          </p>
        </div>
      </div>

      {/* Thân Bảng Tin */}
      <Card className="border shadow-sm bg-white">
        <CardHeader className="p-4 bg-gray-50/70 border-b flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-blue-600" /> Thông báo từ Ban điều hành xưởng
            </CardTitle>
            <CardDescription className="text-xs">Các mốc tin tức, lệnh sản xuất và an toàn lao động trong ca trực.</CardDescription>
          </div>
          
          {/* Chỉ hiển thị nút Đăng thông báo nếu là Admin tối cao hoặc ban quản đốc */}
          {(user?.roleGroup === 'Admin' || user?.roleGroup === 'Duyệt' || user?.msnv === '1118') && (
            <Button size="sm" className="bg-blue-600 text-white h-8 text-xs font-medium">
              <PlusCircle className="w-3.5 h-3.5 mr-1" /> Đăng tin mới
            </Button>
          )}
        </CardHeader>
        
        <CardContent className="p-4 divide-y divide-gray-100">
          {newsList.map((news) => (
            <div key={news.id} className="py-4 first:pt-1 last:pb-1 space-y-2.5 hover:bg-slate-50/40 px-2 rounded-xl transition-colors">
              <div className="flex items-center gap-2">
                <Badge className={`${news.tagColor} text-white font-bold text-[9px] px-2 py-0.5 rounded`}>
                  {news.tag}
                </Badge>
                <span className="text-[10px] text-gray-400 font-medium">• {news.time}</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 font-semibold px-2 py-0.5 rounded border border-blue-100 ml-auto">
                  Ký duyệt: {news.author}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors">
                {news.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                {news.content}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default DailyNews;