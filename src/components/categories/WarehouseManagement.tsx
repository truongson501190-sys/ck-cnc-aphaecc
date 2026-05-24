import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

import {
  Edit2,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';

import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Warehouse } from '@/types/categories';

const STORAGE_KEY = 'warehouses';

export function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(
    []
  );

  const [formData, setFormData] = useState({
    maKho: '',
    tenKho: '',
    ghiChu: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        setWarehouses(JSON.parse(saved));
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu kho');
    }
  };

  const saveWarehouses = (
    updatedWarehouses: Warehouse[]
  ) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedWarehouses)
    );

    setWarehouses(updatedWarehouses);
  };

  const resetForm = () => {
    setEditingId(null);

    setFormData({
      maKho: '',
      tenKho: '',
      ghiChu: '',
    });
  };

  const generateWarehouseCode = () => {
    const nextNumber = warehouses.length + 1;

    return `KHO${String(nextNumber).padStart(3, '0')}`;
  };

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const tenKho = formData.tenKho.trim();

    if (!tenKho) {
      toast.error('Vui lòng nhập tên kho');
      return;
    }

    if (editingId) {
      const updated = warehouses.map((warehouse) =>
        warehouse.id === editingId
          ? {
              ...warehouse,
              tenKho,
              ghiChu: formData.ghiChu.trim(),
            }
          : warehouse
      );

      saveWarehouses(updated);

      toast.success('Cập nhật kho thành công');
    } else {
      const newWarehouse: Warehouse = {
        id: crypto.randomUUID(),
        maKho: generateWarehouseCode(),
        tenKho,
        ghiChu: formData.ghiChu.trim(),
        createdAt: new Date().toISOString(),
      };

      saveWarehouses([...warehouses, newWarehouse]);

      toast.success('Thêm kho thành công');
    }

    resetForm();
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingId(warehouse.id);

    setFormData({
      maKho: warehouse.maKho ?? '',
      tenKho: warehouse.tenKho,
      ghiChu: warehouse.ghiChu || '',
    });
  };

  const handleDelete = (id: string) => {
    const confirmDelete = window.confirm(
      'Bạn có chắc muốn xóa kho này?'
    );

    if (!confirmDelete) return;

    const updated = warehouses.filter(
      (warehouse) => warehouse.id !== id
    );

    saveWarehouses(updated);

    toast.success('Đã xóa kho');
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn kho cần xóa');
      return;
    }

    const confirmDelete = window.confirm(
      `Bạn có chắc muốn xóa ${selectedIds.length} kho?`
    );

    if (!confirmDelete) return;

    const updated = warehouses.filter(
      (warehouse) =>
        !selectedIds.includes(warehouse.id)
    );

    saveWarehouses(updated);

    setSelectedIds([]);

    toast.success('Đã xóa nhiều kho');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredWarehouses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        filteredWarehouses.map(
          (warehouse) => warehouse.id
        )
      );
    }
  };

  const handleImportExcel = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;

        const workbook = XLSX.read(data, {
          type: 'array',
        });

        const sheetName = workbook.SheetNames[0];

        const worksheet =
          workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(worksheet);

        const updatedWarehouses = [...warehouses];

        let added = 0;
        let updated = 0;

        jsonData.forEach((row) => {
          const maKho = String(
            row.maKho ||
              row['Mã kho'] ||
              row['Mã Kho'] ||
              ''
          ).trim();

          const tenKho = String(
            row.tenKho ||
              row['Tên kho'] ||
              row['Tên Kho'] ||
              ''
          ).trim();

          const ghiChu = String(
            row.ghiChu ||
              row['Ghi chú'] ||
              row['Ghi Chú'] ||
              ''
          ).trim();

          if (!tenKho) return;

          const existingIndex =
            updatedWarehouses.findIndex(
              (warehouse) =>
                warehouse.maKho === maKho
            );

          if (
            existingIndex >= 0 &&
            maKho
          ) {
            updatedWarehouses[existingIndex] = {
              ...updatedWarehouses[
                existingIndex
              ],
              tenKho,
              ghiChu,
            };

            updated++;
          } else {
            updatedWarehouses.push({
              id: crypto.randomUUID(),
              maKho:
                maKho ||
                `KHO${String(
                  updatedWarehouses.length + 1
                ).padStart(3, '0')}`,
              tenKho,
              ghiChu,
              createdAt:
                new Date().toISOString(),
            });

            added++;
          }
        });

        saveWarehouses(updatedWarehouses);

        toast.success(
          `Import thành công: ${added} thêm mới, ${updated} cập nhật`
        );
      } catch (error) {
        console.error(error);

        toast.error('Lỗi đọc file Excel');
      }
    };

    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredWarehouses = warehouses.filter(
    (warehouse) =>
      warehouse.maKho
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      warehouse.tenKho
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      warehouse.ghiChu
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Quản lý Kho
          </h2>

          <p className="text-sm text-muted-foreground">
            Danh mục kho trong hệ thống
          </p>
        </div>

        <Badge variant="secondary">
          <Package className="w-4 h-4 mr-1" />
          {warehouses.length} kho
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* FORM */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>
              {editingId
                ? 'Chỉnh sửa kho'
                : 'Thêm kho mới'}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <Label>Mã kho</Label>

                <Input
                  value={
                    editingId
                      ? formData.maKho
                      : generateWarehouseCode()
                  }
                  disabled
                />
              </div>

              <div>
                <Label>Tên kho</Label>

                <Input
                  value={formData.tenKho}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tenKho: e.target.value,
                    })
                  }
                  placeholder="Nhập tên kho"
                />
              </div>

              <div>
                <Label>Ghi chú</Label>

                <Textarea
                  rows={3}
                  value={formData.ghiChu}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ghiChu: e.target.value,
                    })
                  }
                  placeholder="Ghi chú..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />

                  {editingId
                    ? 'Cập nhật'
                    : 'Thêm kho'}
                </Button>

                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Hủy
                  </Button>
                )}
              </div>
            </form>

            {/* IMPORT */}
            <div className="border-t mt-6 pt-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />

              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card className="xl:col-span-2">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>
                Danh sách kho
              </CardTitle>

              {selectedIds.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa ({selectedIds.length})
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <Input
                className="pl-10"
                placeholder="Tìm kiếm kho..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>
          </CardHeader>

          <CardContent>
            {filteredWarehouses.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                Không có dữ liệu kho
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="w-[40px] py-3">
                        <Checkbox
                          checked={
                            selectedIds.length ===
                              filteredWarehouses.length &&
                            filteredWarehouses.length >
                              0
                          }
                          onCheckedChange={
                            toggleSelectAll
                          }
                          className="h-3.5 w-3.5 rounded-[3px]"
                        />
                      </th>

                      <th className="text-left py-3">
                        Mã kho
                      </th>

                      <th className="text-left py-3">
                        Tên kho
                      </th>

                      <th className="text-left py-3">
                        Ghi chú
                      </th>

                      <th className="text-right py-3">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredWarehouses.map(
                      (warehouse) => (
                        <tr
                          key={warehouse.id}
                          className="border-b hover:bg-slate-50"
                        >
                          <td className="py-3 text-center">
                            <Checkbox
                              checked={selectedIds.includes(
                                warehouse.id
                              )}
                              onCheckedChange={() =>
                                toggleSelect(
                                  warehouse.id
                                )
                              }
                              className="h-3.5 w-3.5 rounded-[3px]"
                            />
                          </td>

                          <td className="py-3">
                            <Badge variant="outline">
                              {warehouse.maKho}
                            </Badge>
                          </td>

                          <td className="py-3 font-medium">
                            {warehouse.tenKho}
                          </td>

                          <td className="py-3 text-muted-foreground">
                            {warehouse.ghiChu ||
                              '-'}
                          </td>

                          <td className="py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  handleEdit(
                                    warehouse
                                  )
                                }
                              >
                                <Edit2 className="w-4 h-4 text-blue-600" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  handleDelete(
                                    warehouse.id
                                  )
                                }
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}