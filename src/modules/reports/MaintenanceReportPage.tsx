// Page nhật ký bảo trì
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, Calendar, AlertTriangle, AlertOctagon, Plus, Search } from "lucide-react";

export default function MaintenanceReport() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Nhật Ký Bảo Trì</h1>
        {/* Nút bấm để mở Modal */}
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

      {/* Modal Thêm Báo Cáo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thêm báo cáo bảo trì</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Ngày</Label>
              <Input type="date" />
            </div>
            <div>
              <Label>Tên máy</Label>
              <Input placeholder="Nhập tên máy" />
            </div>
            <div className="col-span-2">
              <Label>Nội dung</Label>
              <Textarea placeholder="Mô tả công việc bảo trì..." />
            </div>
            <div>
              <Label>Người thực hiện</Label>
              <Input placeholder="Tên nhân viên" />
            </div>
            <div>
              <Label>Tình trạng</Label>
              <Input placeholder="Hoàn thành/Đang sửa..." />
            </div>
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