// nút Thêm nhật ký bảo trì
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Calendar, AlertTriangle, AlertOctagon, Plus, Search } from "lucide-react";

export default function MaintenanceReport() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Nhật Ký Bảo Trì</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Thêm nhật ký bảo trì
        </Button>
      </div>

      {/* Grid thống kê */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { title: "Tổng báo cáo", value: "0", icon: Wrench, color: "text-orange-500" },
          { title: "Tháng này", value: "0", icon: Calendar, color: "text-blue-500" },
          { title: "Cần theo dõi", value: "0", icon: AlertTriangle, color: "text-yellow-500" },
          { title: "Sắp bảo trì", value: "0", icon: AlertOctagon, color: "text-red-500" },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-gray-500">{item.title}</p>
                <h3 className="text-3xl font-bold">{item.value}</h3>
              </div>
              <item.icon className={`h-8 w-8 ${item.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Danh sách */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-lg">Danh sách báo cáo bảo trì</h2>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Tìm kiếm báo cáo..." className="pl-8 w-64" />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Wrench className="h-12 w-12 mb-2 opacity-20" />
            <p>Chưa có báo cáo bảo trì nào</p>
          </div>
        </CardContent>
      </Card>

      {/* Modal Đầy đủ mục như hình ảnh */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm báo cáo bảo trì mới</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div><Label>Ngày *</Label><Input type="date" /></div>
            <div><Label>Tên máy *</Label><Input placeholder="Nhập tên máy" /></div>
            <div><Label>Mã thiết bị *</Label><Input placeholder="Nhập mã thiết bị" /></div>
            <div><Label>Người thực hiện</Label><Input placeholder="Nhập tên người thực hiện" /></div>
            <div className="col-span-2"><Label>Nội dung công việc *</Label><Textarea placeholder="Mô tả chi tiết nội dung công việc bảo trì" /></div>
            <div><Label>Lý do</Label><Textarea placeholder="Lý do thực hiện bảo trì" /></div>
            <div><Label>Phương pháp khắc phục</Label><Textarea placeholder="Mô tả phương pháp khắc phục" /></div>
            <div><Label>Vật tư thay thế</Label><Input placeholder="Danh sách vật tư" /></div>
            <div><Label>Thời gian hoàn thành</Label><Input placeholder="VD: 2 giờ" /></div>
            <div><Label>Tình trạng sau bảo trì</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Chọn tình trạng" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">Hoạt động bình thường</SelectItem>
                  <SelectItem value="note">Cần theo dõi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Lịch bảo trì tiếp theo</Label><Input type="date" /></div>
            <div className="col-span-2"><Label>Ghi chú / Ảnh đính kèm</Label><Textarea placeholder="Ghi chú bổ sung..." /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={() => setIsModalOpen(false)}>Lưu báo cáo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}