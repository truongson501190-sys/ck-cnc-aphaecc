import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
 DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import {
  Search,
  Plus,
  Edit3,
  Trash2,
  ArrowLeft,
} from 'lucide-react';

import { toast } from 'sonner';

import {
  buildLocalId,
  loadArrayFromStorage,
  saveArrayToStorage,
} from '@/lib/localStorage';

import type { TransactionHistoryEntry } from '@/types/warehouse';

const STORAGE_KEY = 'transactionHistoryEntries';
const PAGE_SIZE = 10;

const defaultTransactions: TransactionHistoryEntry[] = []
  

export function TransactionHistory() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<TransactionHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] =
    useState<TransactionHistoryEntry | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [typeFilter, setTypeFilter] = useState<
    'all' | TransactionHistoryEntry['type']
  >('all');

  const [statusFilter, setStatusFilter] = useState<
    'all' | TransactionHistoryEntry['status']
  >('all');

  const [page, setPage] = useState(1);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState<
    Omit<TransactionHistoryEntry, 'id'>
  >({
    reference: '',
    itemCode: '',
    itemName: '',
    type: 'import',
    quantity: 0,
    unit: 'Cái',
    warehouseFrom: '',
    warehouseTo: '',
    project: '',
    machine: '',
    status: 'draft',
    transactionDate: new Date().toISOString().slice(0, 10),
    createdBy: '',
    notes: '',
  });

  useEffect(() => {
    const saved =
      loadArrayFromStorage<TransactionHistoryEntry>(STORAGE_KEY);

    if (saved.length > 0) {
      setEntries(saved);
    } else {
      setEntries(defaultTransactions);
      saveArrayToStorage(STORAGE_KEY, defaultTransactions);
    }
  }, []);

  const saveEntries = (next: TransactionHistoryEntry[]) => {
    setEntries(next);
    saveArrayToStorage(STORAGE_KEY, next);
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const keyword = searchTerm.toLowerCase();

      const matchSearch =
        !searchTerm ||
        entry.reference.toLowerCase().includes(keyword) ||
        entry.itemCode.toLowerCase().includes(keyword) ||
        entry.itemName.toLowerCase().includes(keyword) ||
        entry.createdBy.toLowerCase().includes(keyword);

      const matchType =
        typeFilter === 'all' || entry.type === typeFilter;

      const matchStatus =
        statusFilter === 'all' || entry.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [entries, searchTerm, typeFilter, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredEntries.length / PAGE_SIZE)
  );

  const pageItems = filteredEntries.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const resetForm = () => {
    setFormData({
      reference: '',
      itemCode: '',
      itemName: '',
      type: 'import',
      quantity: 0,
      unit: 'Cái',
      warehouseFrom: '',
      warehouseTo: '',
      project: '',
      machine: '',
      status: 'draft',
      transactionDate: new Date().toISOString().slice(0, 10),
      createdBy: '',
      notes: '',
    });
  };

  const openCreateDialog = () => {
    setSelectedEntry(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: TransactionHistoryEntry) => {
    setSelectedEntry(entry);

    setFormData({
      reference: entry.reference,
      itemCode: entry.itemCode,
      itemName: entry.itemName,
      type: entry.type,
      quantity: entry.quantity,
      unit: entry.unit,
      warehouseFrom: entry.warehouseFrom,
      warehouseTo: entry.warehouseTo,
      project: entry.project,
      machine: entry.machine,
      status: entry.status,
      transactionDate: entry.transactionDate,
      createdBy: entry.createdBy,
      notes: entry.notes,
    });

    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const confirmDelete = window.confirm(
      'Bạn có chắc chắn muốn xóa giao dịch này không?'
    );

    if (!confirmDelete) return;

    const next = entries.filter((item) => item.id !== id);

    saveEntries(next);

    toast.success('Đã xóa giao dịch');
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !formData.reference.trim() ||
      !formData.itemCode.trim() ||
      !formData.itemName.trim() ||
      !formData.createdBy.trim()
    ) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    const payload: TransactionHistoryEntry = {
      id: selectedEntry?.id ?? buildLocalId('tx'),
      ...formData,
    };

    if (selectedEntry) {
      const updated = entries.map((item) =>
        item.id === selectedEntry.id ? payload : item
      );

      saveEntries(updated);

      toast.success('Cập nhật giao dịch thành công');
    } else {
      saveEntries([payload, ...entries]);

      toast.success('Thêm giao dịch thành công');
    }

    setIsDialogOpen(false);
  };

  const renderStatusBadge = (
    status: TransactionHistoryEntry['status']
  ) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Bản nháp</Badge>;

      case 'completed':
        return <Badge variant="secondary">Hoàn thành</Badge>;

      case 'cancelled':
        return <Badge variant="destructive">Đã hủy</Badge>;

      default:
        return <Badge>Không xác định</Badge>;
    }
  };

  const renderTypeBadge = (
    type: TransactionHistoryEntry['type']
  ) => {
    switch (type) {
      case 'import':
        return <Badge variant="secondary">Nhập kho</Badge>;

      case 'export':
        return <Badge variant="destructive">Xuất kho</Badge>;

      case 'transfer':
        return <Badge variant="outline">Chuyển kho</Badge>;

      case 'oil_export':
        return <Badge variant="default">Xuất dầu</Badge>;

      default:
        return <Badge>Không xác định</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

          <div className="flex items-center gap-3">

            {/* Nút quay lại */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Lịch sử giao dịch
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Quản lý toàn bộ giao dịch nhập / xuất / chuyển kho
              </p>
            </div>
          </div>

          <Button
            onClick={openCreateDialog}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm giao dịch
          </Button>
        </div>

        {/* Bộ lọc */}
        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc dữ liệu</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

              <Input
                placeholder="Tìm mã, vật tư, người tạo..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row">

              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(
                    value as
                      | 'all'
                      | TransactionHistoryEntry['type']
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    Tất cả loại
                  </SelectItem>

                  <SelectItem value="import">
                    Nhập kho
                  </SelectItem>

                  <SelectItem value="export">
                    Xuất kho
                  </SelectItem>

                  <SelectItem value="transfer">
                    Chuyển kho
                  </SelectItem>

                  <SelectItem value="oil_export">
                    Xuất dầu
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(
                    value as
                      | 'all'
                      | TransactionHistoryEntry['status']
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    Tất cả trạng thái
                  </SelectItem>

                  <SelectItem value="draft">
                    Bản nháp
                  </SelectItem>

                  <SelectItem value="completed">
                    Hoàn thành
                  </SelectItem>

                  <SelectItem value="cancelled">
                    Đã hủy
                  </SelectItem>
                </SelectContent>
              </Select>

            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Danh sách giao dịch
            </CardTitle>
          </CardHeader>

          <CardContent>

            <div className="overflow-x-auto">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Mã GD</TableHead>
                    <TableHead>Vật tư</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Người tạo</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>

                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-10 text-center text-slate-500"
                      >
                        Không có dữ liệu giao dịch
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id}>

                        <TableCell>
                          {entry.transactionDate}
                        </TableCell>

                        <TableCell>
                          {entry.reference}
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">
                            {entry.itemCode}
                          </div>

                          <div className="text-xs text-slate-500">
                            {entry.itemName}
                          </div>
                        </TableCell>

                        <TableCell>
                          {renderTypeBadge(entry.type)}
                        </TableCell>

                        <TableCell>
                          {entry.quantity} {entry.unit}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {entry.warehouseFrom}
                          </div>

                          <div className="text-xs text-slate-500">
                            {entry.warehouseTo}
                          </div>
                        </TableCell>

                        <TableCell>
                          {renderStatusBadge(entry.status)}
                        </TableCell>

                        <TableCell>
                          {entry.createdBy}
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2">

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(entry)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(entry.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>

                          </div>
                        </TableCell>

                      </TableRow>
                    ))
                  )}

                </TableBody>
              </Table>

            </div>

            {/* Pagination */}
            <div className="mt-5 flex items-center justify-between">

              <div className="text-sm text-slate-500">
                Hiển thị {pageItems.length} / {filteredEntries.length} kết quả
              </div>

              <div className="flex items-center gap-2">

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() =>
                    setPage((prev) => Math.max(prev - 1, 1))
                  }
                >
                  Trước
                </Button>

                <span className="text-sm">
                  {page} / {pageCount}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pageCount}
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(prev + 1, pageCount)
                    )
                  }
                >
                  Sau
                </Button>

              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry
                ? 'Chỉnh sửa giao dịch'
                : 'Thêm giao dịch mới'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <Label>Mã giao dịch</Label>

                <Input
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reference: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Ngày giao dịch</Label>

                <Input
                  type="date"
                  value={formData.transactionDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transactionDate: e.target.value,
                    })
                  }
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <Label>Mã vật tư</Label>

                <Input
                  value={formData.itemCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      itemCode: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Tên vật tư</Label>

                <Input
                  value={formData.itemName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      itemName: e.target.value,
                    })
                  }
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <Label>Loại giao dịch</Label>

                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      type:
                        value as TransactionHistoryEntry['type'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="import">
                      Nhập kho
                    </SelectItem>

                    <SelectItem value="export">
                      Xuất kho
                    </SelectItem>

                    <SelectItem value="transfer">
                      Chuyển kho
                    </SelectItem>

                    <SelectItem value="oil_export">
                      Xuất dầu
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Số lượng</Label>

                <Input
                  type="number"
                  min={0}
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <Label>Đơn vị</Label>

                <Input
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit: e.target.value,
                    })
                  }
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <Label>Kho xuất</Label>

                <Input
                  value={formData.warehouseFrom}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      warehouseFrom: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Kho nhận</Label>

                <Input
                  value={formData.warehouseTo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      warehouseTo: e.target.value,
                    })
                  }
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <Label>Dự án</Label>

                <Input
                  value={formData.project}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Máy</Label>

                <Input
                  value={formData.machine}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      machine: e.target.value,
                    })
                  }
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <Label>Trạng thái</Label>

                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status:
                        value as TransactionHistoryEntry['status'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="draft">
                      Bản nháp
                    </SelectItem>

                    <SelectItem value="completed">
                      Hoàn thành
                    </SelectItem>

                    <SelectItem value="cancelled">
                      Đã hủy
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Người tạo</Label>

                <Input
                  value={formData.createdBy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      createdBy: e.target.value,
                    })
                  }
                />
              </div>

            </div>

            <div>
              <Label>Ghi chú</Label>

              <Textarea
                rows={4}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notes: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex justify-end gap-2">

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Hủy
              </Button>

              <Button type="submit">
                Lưu giao dịch
              </Button>

            </div>

          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}