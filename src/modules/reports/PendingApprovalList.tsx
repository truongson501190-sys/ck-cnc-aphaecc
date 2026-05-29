import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Check, X, Eye, FileText, Home, ArrowLeft } from "lucide-react"; // Thêm icon Home và ArrowLeft ở đây
import { toast } from 'sonner';
import { Link } from 'react-router-dom'; // Import thẻ điều hướng chuẩn hệ thống

// Định nghĩa cấu trúc dữ liệu Nhật ký Sản xuất chuẩn kết nối trực tiếp
interface ProductionLog {
  id: string;
  ngay: string;
  maDuAn: string;
  tenDuAn: string;
  tenDao: string;
  donVi: string;
  nguoiThucHien: string;
  tinhTrang: string; 
  status: 'pending' | 'approved' | 'rejected'; // Quản lý trạng thái phê duyệt
}

export function PendingApprovalList() {
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Hàm chuyên trách đọc dữ liệu từ localStorage để tái sử dụng nhiều nơi
  const loadApprovalLogs = () => {
    try {
      const targetData = localStorage.getItem('PRODUCTION_LOGS_DATA');
      if (targetData) {
        setProductionLogs(JSON.parse(targetData));
      } else {
        // Nếu bộ nhớ máy hoàn toàn trống, tạo 1 bản ghi mẫu đồng bộ đúng mã dự án chú đang chạy
        const defaultData: ProductionLog[] = [
          
        ];
        setProductionLogs(defaultData);
        localStorage.setItem('PRODUCTION_LOGS_DATA', JSON.stringify(defaultData));
      }
    } catch (error) {
      console.error("Lỗi khi đọc dữ liệu phê duyệt từ localStorage:", error);
    }
  };

  // Lấy dữ liệu khi vào trang VÀ lắng nghe sự kiện thay đổi dữ liệu theo thời gian thực
  useEffect(() => {
    // 1. Đọc dữ liệu ngay lần đầu tiên tải trang
    loadApprovalLogs();

    // 2. Định nghĩa hàm xử lý khi có tín hiệu cập nhật từ bộ nhớ máy
    const handleStorageUpdate = () => {
      loadApprovalLogs();
    };

    // 3. Đăng ký các cổng lắng nghe sự kiện liên thông giữa các Component/Tab
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('app-data-synced', handleStorageUpdate);

    // 4. Hủy đăng ký khi rời trang để tránh tràn bộ nhớ phần mềm
    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('app-data-synced', handleStorageUpdate);
    };
  }, []);

  // Hàm xử lý Cập nhật trạng thái và đẩy dữ liệu sau khi duyệt
  const updateLogStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    const updated = productionLogs.map(log => {
      if (log.id === id) {
        return { ...log, status: newStatus };
      }
      return log;
    });
    
    setProductionLogs(updated);
    localStorage.setItem('PRODUCTION_LOGS_DATA', JSON.stringify(updated));

    // Kích hoạt sự kiện toàn cục để thông báo cho các trang báo cáo, biểu đồ cập nhật theo
    window.dispatchEvent(new Event('app-data-synced'));
    
    // Thay thế hàm alert hệ thống bằng thông báo Toast của dự án cho mượt mà chuyên nghiệp
    if (newStatus === 'approved') {
      toast.success(`Đã phê duyệt thành công nhật ký dự án!`);
    } else {
      toast.error(`Đã từ chối nhật ký sản xuất.`);
    }
  };

  // Lọc danh sách: CHỈ HIỂN THỊ những nhật ký sản xuất đang "Chờ duyệt" (pending)
  const pendingItems = productionLogs.filter(log => {
    const matchesStatus = log.status === 'pending';
    const matchesSearch = 
      log.maDuAn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tenDuAn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.nguoiThucHien.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          
          {/* NÚT MŨI TÊN QUAY LẠI TRANG CHỦ CHÚ CẦN ĐÂY Ạ */}
          <Link to="/">
            <Button variant="outline" size="icon" className="h-10 w-10 border-slate-300 hover:bg-slate-100 shadow-sm rounded-lg">
                <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phê Duyệt Nhật Ký Sản Xuất</h1>
            <p className="text-sm text-gray-500">Hệ thống xét duyệt trực tiếp từ xưởng gia công. Nhật ký Bảo trì và QC đã được định tuyến sang bộ phận riêng.</p>
          </div>
        </div>
        
        {/* KHU VỰC TRẠNG THÁI */}
        <Badge className="bg-amber-100 text-amber-800 text-sm px-3 py-1.5 font-medium hover:bg-amber-100 border-none">
          {pendingItems.length} Nhật ký chờ xử lý
        </Badge>
      </div>

      {/* Bảng danh sách kết nối dữ liệu */}
      <Card>
        <CardContent className="p-6">
          {/* Thanh tìm kiếm */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-lg text-gray-800">Danh Sách Nhật Ký Sản Xuất Chờ Duyệt</h2>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Tìm mã dự án, tên dự án, người làm..." 
                className="pl-8 w-80" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Kiểm tra nếu trống */}
          {pendingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FileText className="h-12 w-12 mb-2 opacity-20" />
              <p className="font-medium">Không có nhật ký sản xuất nào đang chờ duyệt.</p>
              <p className="text-xs text-gray-400 mt-1">Dữ liệu từ biểu mẫu gá phôi, gia công sau khi nhập sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            /* Bảng hiển thị dữ liệu kết nối */
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Ngày làm</th>
                    <th className="px-6 py-3">Mã & Tên Dự Án</th>
                    <th className="px-6 py-3">Thông số Dao</th>
                    <th className="px-6 py-3">Người đứng máy</th>
                    <th className="px-6 py-3">Nội dung / Tình trạng</th>
                    <th className="px-6 py-3 text-right">Xét duyệt nhanh</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((log) => (
                    <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{log.ngay}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 mb-1">
                          {log.maDuAn}
                        </span>
                        <div className="font-semibold text-gray-800">{log.tenDuAn}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-medium">{log.tenDao}</div>
                        <div className="text-xs text-gray-400">ĐVT: {log.donVi}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">{log.nguoiThucHien}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 max-w-xs line-clamp-2" title={log.tinhTrang}>
                          {log.tinhTrang}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Button size="sm" variant="outline" title="Xem chi tiết toàn bộ lệnh sản xuất">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          onClick={() => updateLogStatus(log.id, 'approved')}
                        >
                          <Check className="h-4 w-4 mr-1" /> Duyệt
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateLogStatus(log.id, 'rejected')}
                        >
                          <X className="h-4 w-4 mr-1" /> Từ chối
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}