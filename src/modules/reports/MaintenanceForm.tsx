import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { MaintenanceReport, PostMaintenanceStatus } from '@/types/maintenance';
import { POST_MAINTENANCE_STATUS_LABELS } from '@/types/maintenance';

interface MaintenanceFormProps {
  onSubmit: (report: Omit<MaintenanceReport, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

export function MaintenanceForm({ onSubmit, onCancel }: MaintenanceFormProps) {
  const [formData, setFormData] = useState({
    ngay: today(),
    machineName: '',
    equipmentCode: '',
    technician: '',
    jobContent: '',
    reason: '',
    correctiveAction: '',
    replacementParts: '',
    completionTime: '',
    postMaintenanceStatus: 'normal' as PostMaintenanceStatus,
    nextMaintenanceSchedule: '',
    notesAttachments: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ngay || !formData.machineName || !formData.equipmentCode || !formData.jobContent.trim()) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }
    onSubmit(formData);
    setFormData({
      ngay: today(),
      machineName: '',
      equipmentCode: '',
      technician: '',
      jobContent: '',
      reason: '',
      correctiveAction: '',
      replacementParts: '',
      completionTime: '',
      postMaintenanceStatus: 'normal',
      nextMaintenanceSchedule: '',
      notesAttachments: '',
    });
    toast.success('Đã lưu báo cáo bảo trì');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ngay">Ngày *</Label>
          <DateInput
            id="ngay"
            value={formData.ngay}
            onChange={(value: string) => handleChange('ngay', value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="machineName">Tên máy *</Label>
          <Input
            id="machineName"
            value={formData.machineName}
            onChange={(e) => handleChange('machineName', e.target.value)}
            placeholder="Nhập tên máy"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="equipmentCode">Mã thiết bị *</Label>
          <Input
            id="equipmentCode"
            value={formData.equipmentCode}
            onChange={(e) => handleChange('equipmentCode', e.target.value)}
            placeholder="Nhập mã thiết bị"
            required
          />
        </div>
        <div>
          <Label htmlFor="technician">Người thực hiện</Label>
          <Input
            id="technician"
            value={formData.technician}
            onChange={(e) => handleChange('technician', e.target.value)}
            placeholder="Nhập tên người thực hiện"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="jobContent">Nội dung công việc *</Label>
        <Textarea
          id="jobContent"
          value={formData.jobContent}
          onChange={(e) => handleChange('jobContent', e.target.value)}
          placeholder="Mô tả chi tiết nội dung công việc bảo trì"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reason">Lý do</Label>
          <Textarea
            id="reason"
            value={formData.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            placeholder="Lý do thực hiện bảo trì"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="correctiveAction">Phương pháp khắc phục</Label>
          <Textarea
            id="correctiveAction"
            value={formData.correctiveAction}
            onChange={(e) => handleChange('correctiveAction', e.target.value)}
            placeholder="Mô tả phương pháp khắc phục"
            rows={3}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="replacementParts">Vật tư thay thế</Label>
          <Input
            id="replacementParts"
            value={formData.replacementParts}
            onChange={(e) => handleChange('replacementParts', e.target.value)}
            placeholder="Danh sách vật tư đã thay thế"
          />
        </div>
        <div>
          <Label htmlFor="completionTime">Thời gian hoàn thành</Label>
          <Input
            id="completionTime"
            value={formData.completionTime}
            onChange={(e) => handleChange('completionTime', e.target.value)}
            placeholder="VD: 2 giờ, 1 ngày"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="postMaintenanceStatus">Tình trạng sau bảo trì</Label>
          <Select
            value={formData.postMaintenanceStatus}
            onValueChange={(value: PostMaintenanceStatus) => handleChange('postMaintenanceStatus', value)}
          >
            <SelectTrigger id="postMaintenanceStatus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(POST_MAINTENANCE_STATUS_LABELS) as [PostMaintenanceStatus, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="nextMaintenanceSchedule">Lịch bảo trì tiếp theo</Label>
          <DateInput
            id="nextMaintenanceSchedule"
            value={formData.nextMaintenanceSchedule}
            onChange={(value: string) => handleChange('nextMaintenanceSchedule', value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notesAttachments">Ghi chú / Ảnh đính kèm</Label>
        <Textarea
          id="notesAttachments"
          value={formData.notesAttachments}
          onChange={(e) => handleChange('notesAttachments', e.target.value)}
          placeholder="Ghi chú bổ sung và thông tin ảnh đính kèm"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Lưu báo cáo
        </Button>
      </div>
    </form>
  );
}
