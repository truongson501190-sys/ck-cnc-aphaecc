import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { QcReport, QcResult } from '@/types/qc';

interface QcFormProps {
  onSubmit: (report: Omit<QcReport, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

export function QcForm({ onSubmit, onCancel }: QcFormProps) {
  const [formData, setFormData] = useState({
    ngay: today(),
    duAn: '',
    banVeSo: '',
    chiTietSo: '',
    tenChiTiet: '',
    inspectedQuantity: 1,
    result: 'OK' as QcResult,
    inspector: '',
    notes: '',
  });

  const [projects, setProjects] = useState<{ id: string; maDuAn: string; tenKhachHang?: string }[]>([]);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [inspectors, setInspectors] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('projects');
      if (saved) setProjects(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    try {
      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        const list = JSON.parse(savedEmployees) as { hoTen?: string; fullName?: string }[];
        const names = list.map((e) => e.hoTen || e.fullName).filter((n): n is string => !!n);
        if (names.length > 0) setInspectors(names);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProjectPick = (maDuAn: string) => {
    handleChange('duAn', maDuAn);
    setIsProjectDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ngay || !formData.duAn.trim() || !formData.tenChiTiet.trim()) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }
    if (formData.inspectedQuantity < 1) {
      toast.error('SL kiểm tra phải lớn hơn 0');
      return;
    }
    onSubmit(formData);
    setFormData({
      ngay: today(),
      duAn: '',
      banVeSo: '',
      chiTietSo: '',
      tenChiTiet: '',
      inspectedQuantity: 1,
      result: 'OK',
      inspector: '',
      notes: '',
    });
    toast.success('Đã lưu báo cáo QC');
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
        <div className="relative">
          <Label htmlFor="duAn">Dự án *</Label>
          <Input
            id="duAn"
            value={formData.duAn}
            onChange={(e) => {
              handleChange('duAn', e.target.value);
              setIsProjectDropdownOpen(true);
            }}
            onFocus={() => setIsProjectDropdownOpen(true)}
            placeholder="Nhập tên dự án"
            required
          />
          {isProjectDropdownOpen && formData.duAn && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10">
              {projects
                .filter((p) => p.maDuAn?.toLowerCase().includes(formData.duAn.toLowerCase()))
                .slice(0, 5)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b last:border-b-0"
                    onClick={() => handleProjectPick(p.maDuAn)}
                  >
                    {p.maDuAn}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="banVeSo">Bản vẽ số</Label>
          <Input
            id="banVeSo"
            value={formData.banVeSo}
            onChange={(e) => handleChange('banVeSo', e.target.value)}
            placeholder="Nhập số bản vẽ"
          />
        </div>
        <div>
          <Label htmlFor="chiTietSo">Chi tiết số</Label>
          <Input
            id="chiTietSo"
            value={formData.chiTietSo}
            onChange={(e) => handleChange('chiTietSo', e.target.value)}
            placeholder="Nhập số chi tiết"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tenChiTiet">Tên chi tiết *</Label>
          <Input
            id="tenChiTiet"
            value={formData.tenChiTiet}
            onChange={(e) => handleChange('tenChiTiet', e.target.value)}
            placeholder="Nhập tên chi tiết"
            required
          />
        </div>
        <div>
          <Label htmlFor="inspectedQuantity">SL kiểm tra *</Label>
          <Input
            id="inspectedQuantity"
            type="number"
            min={1}
            value={formData.inspectedQuantity}
            onChange={(e) => handleChange('inspectedQuantity', parseInt(e.target.value, 10) || 1)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="result">Kết quả *</Label>
          <Select value={formData.result} onValueChange={(v: QcResult) => handleChange('result', v)}>
            <SelectTrigger id="result">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OK">OK</SelectItem>
              <SelectItem value="NG">NG</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="inspector">Người kiểm tra</Label>
          {inspectors.length > 0 ? (
            <Select value={formData.inspector} onValueChange={(v) => handleChange('inspector', v)}>
              <SelectTrigger id="inspector">
                <SelectValue placeholder="Chọn người kiểm tra" />
              </SelectTrigger>
              <SelectContent>
                {inspectors.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="inspector"
              value={formData.inspector}
              onChange={(e) => handleChange('inspector', e.target.value)}
              placeholder="Nhập tên người kiểm tra"
            />
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Ghi chú</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Ghi chú về kết quả kiểm tra"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button type="submit" className="bg-gray-900 hover:bg-gray-800">
          <Save className="w-4 h-4 mr-2" />
          Lưu
        </Button>
      </div>
    </form>
  );
}
