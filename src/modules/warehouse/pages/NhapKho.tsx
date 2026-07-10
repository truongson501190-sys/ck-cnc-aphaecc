// src/modules/warehouse/pages/NhapKho.tsx
import React, { useState, useEffect } from 'react';
import { WarehouseImport } from '@/modules/warehouse/components/WarehouseImport';
import { toast } from 'sonner';
import { postStockDocument } from '@/api/stock';
import type { WarehouseTransaction, WarehouseTransactionItem } from '@/types/inventory';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Download, Upload, X, Trash2, CheckSquare, Square, RefreshCw, FileSpreadsheet, Edit, Save } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// ============================================================
// INTERFACE
// ============================================================
interface ImportRecord {
  soPhieu: string;
  ngayNhap: string;
  khoNhap: string;
  nguoiNhap: string;
  nhaCungCap?: string;
  ghiChu?: string;
  tongTien: number;
  items: Array<{
    tenChungLoai: string;
    soLuong: number;
    donVi: string;
    donGia: number;
    thanhTien: number;
  }>;
  createdAt: string;
}

// ============================================================
// CONSTANTS
// ============================================================
const STORAGE_KEY = 'warehouseImports';
const PAGE_SIZE = 10;

const EXCEL_COLUMN_MAP: { [key: string]: string } = {
  'Ngày': 'ngayNhap',
  'Ngay': 'ngayNhap',
  'Chung Loại': 'tenChungLoai',
  'ChungLoai': 'tenChungLoai',
  'So Luong': 'soLuong',
  'SoLuong': 'soLuong',
  'Số Lượng': 'soLuong',
  'Don vi': 'donVi',
  'Donvi': 'donVi',
  'Đơn vị': 'donVi',
  'Don gia': 'donGia',
  'Dongia': 'donGia',
  'Đơn giá': 'donGia',
  'Thanh Tien': 'thanhTien',
  'ThanhTien': 'thanhTien',
  'Thành tiền': 'thanhTien',
  'Xuất Kho': 'xuatKho',
  'XuatKho': 'xuatKho',
  'Nhà cung cấp': 'nhaCungCap',
  'NhaCungCap': 'nhaCungCap',
  'Ghi chú': 'ghiChu',
  'Ghichu': 'ghiChu',
};

const REQUIRED_COLUMNS = ['Ngày', 'Chung Loại', 'So Luong', 'Don vi', 'Don gia'];

const DEFAULT_IMPORT_VALUES = {
  khoNhap: 'Kho chính',
  nguoiNhap: 'Admin',
  nhaCungCap: '',
  ghiChu: '',
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const NhapKho: React.FC = () => {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission();
  const canAdd = canEdit('nhap_kho');
  const canDelete = canEdit('nhap_kho');
  const canEditData = canEdit('nhap_kho'); // Hoặc bạn có thể tạo permission riêng
  
  // ===== STATE =====
  const [open, setOpen] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState<ImportRecord | null>(null);
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // ===== EDIT STATE =====
  const [editOpen, setEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ===== LOAD DATA =====
  const loadImports = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setImports(parsed);
        setSelectedIds(new Set());
        setIsAllSelected(false);
      }
    } catch (error) {
      console.error('Error loading imports:', error);
      toast.error('Lỗi tải dữ liệu');
    }
  };

  useEffect(() => {
    loadImports();
  }, []);

  // ===== FILTER & PAGINATION =====
  const filteredImports = imports.filter((imp) => {
    const matchSearch = !searchTerm || 
      imp.soPhieu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imp.khoNhap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imp.nguoiNhap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (imp.nhaCungCap && imp.nhaCungCap.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchDate = !filterDate || imp.ngayNhap === filterDate;
    
    return matchSearch && matchDate;
  });

  const totalPages = Math.ceil(filteredImports.length / PAGE_SIZE);
  const paginatedImports = filteredImports.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate]);

  // ===== DATE PARSER =====
  const parseDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    try {
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      }
      
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  // ===== CONVERT TO WAREHOUSE TRANSACTION =====
  const convertToWarehouseTransaction = (record: ImportRecord): Omit<WarehouseTransaction, 'id' | 'createdAt'> => {
    const items: WarehouseTransactionItem[] = record.items.map((item, index) => ({
      id: `item_${Date.now()}_${index}`,
      itemName: item.tenChungLoai,
      quantity: item.soLuong,
      unit: item.donVi,
      price: item.donGia,
      totalValue: item.thanhTien,
      ghiChu: ''
    }));

    const transactionDate = parseDate(record.ngayNhap);

    return {
      type: 'import',
      referenceNumber: record.soPhieu,
      transactionDate: transactionDate,
      warehouse_id: record.khoNhap,
      recipient: record.nguoiNhap,
      supplier: record.nhaCungCap || '',
      notes: record.ghiChu || '',
      status: 'approved',
      items: items,
      reason: `Nhập kho - ${record.soPhieu}`,
    };
  };

  // ===== API HANDLERS =====
  const handleSubmitAPI = async (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => {
    try {
      const { ok } = await postStockDocument({
        ...transaction,
        status: 'approved',
      } as WarehouseTransaction);
      if (!ok) throw new Error('API error');
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch (error) {
      console.error('Error in handleSubmitAPI:', error);
      throw error;
    }
  };

  const handleSuccess = () => {
    setOpen(false);
    loadImports();
    toast.success('Phiếu nhập đã được thêm');
  };

  // ===== EDIT HANDLERS =====
  const handleEdit = (imp: ImportRecord) => {
    setEditFormData({
      soPhieu: imp.soPhieu,
      ngayNhap: imp.ngayNhap,
      khoNhap: imp.khoNhap,
      nguoiNhap: imp.nguoiNhap,
      nhaCungCap: imp.nhaCungCap || '',
      ghiChu: imp.ghiChu || '',
      items: imp.items.map(item => ({ ...item })),
      tongTien: imp.tongTien
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    
    setIsSaving(true);
    try {
      // Tính lại tổng tiền
      const newTongTien = editFormData.items.reduce((sum: number, item: any) => sum + (item.soLuong * item.donGia), 0);
      
      // Cập nhật dữ liệu
      const updatedImports = imports.map(imp => {
        if (imp.soPhieu === editFormData.soPhieu) {
          return {
            ...imp,
            ngayNhap: editFormData.ngayNhap,
            khoNhap: editFormData.khoNhap,
            nguoiNhap: editFormData.nguoiNhap,
            nhaCungCap: editFormData.nhaCungCap,
            ghiChu: editFormData.ghiChu,
            items: editFormData.items.map((item: any) => ({
              ...item,
              thanhTien: item.soLuong * item.donGia
            })),
            tongTien: newTongTien
          };
        }
        return imp;
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedImports));
      setImports(updatedImports);
      
      // Gọi API cập nhật nếu cần
      const updatedRecord = updatedImports.find(imp => imp.soPhieu === editFormData.soPhieu);
      if (updatedRecord) {
        try {
          const transactionData = convertToWarehouseTransaction(updatedRecord);
          await handleSubmitAPI(transactionData);
        } catch (error) {
          console.error('API update error:', error);
          // Vẫn tiếp tục vì đã lưu localStorage
        }
      }
      
      setEditOpen(false);
      setEditFormData(null);
      toast.success('Đã cập nhật phiếu nhập thành công!');
      loadImports();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Lỗi cập nhật phiếu nhập');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const newItems = [...editFormData.items];
    newItems[index][field] = value;
    if (field === 'soLuong' || field === 'donGia') {
      newItems[index].thanhTien = newItems[index].soLuong * newItems[index].donGia;
    }
    setEditFormData({ ...editFormData, items: newItems });
  };

  const handleAddItem = () => {
    setEditFormData({
      ...editFormData,
      items: [...editFormData.items, {
        tenChungLoai: '',
        soLuong: 0,
        donVi: '',
        donGia: 0,
        thanhTien: 0
      }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editFormData.items.filter((_: any, i: number) => i !== index);
    setEditFormData({ ...editFormData, items: newItems });
  };

  // ===== PRINT / PDF =====
  const handlePrint = () => {
    const printContent = document.getElementById('phieu-nhap-content');
    if (!printContent || !selectedImport) return;
    
    const originalTitle = document.title;
    document.title = `PhieuNhap_${selectedImport.soPhieu}`;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${document.title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .header { text-align: center; margin-bottom: 30px; }
              .info { margin-bottom: 20px; }
              .info p { margin: 4px 0; }
              .total { font-weight: bold; background-color: #f9fafb; }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    document.title = originalTitle;
  };

  // ===== EXCEL IMPORT =====
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        if (jsonData.length === 0) {
          toast.error('File Excel không có dữ liệu');
          return;
        }

        const columns = Object.keys(jsonData[0] || {});
        
        const missingFields = REQUIRED_COLUMNS.filter(field => !columns.includes(field));
        
        if (missingFields.length > 0) {
          toast.error(`Thiếu các cột bắt buộc: ${missingFields.join(', ')}`);
          toast.info(`Các cột hiện có: ${columns.join(', ')}`);
          return;
        }

        const mappedData = jsonData.map((row: any, index: number) => {
          const mappedRow: any = {};
          
          Object.keys(row).forEach(key => {
            const mappedKey = EXCEL_COLUMN_MAP[key] || key;
            mappedRow[mappedKey] = row[key];
          });

          mappedRow.soLuong = Number(mappedRow.soLuong) || 0;
          mappedRow.donGia = Number(String(mappedRow.donGia).replace(/,/g, '')) || 0;
          mappedRow.thanhTien = Number(String(mappedRow.thanhTien).replace(/,/g, '')) || 0;
          
          if (!mappedRow.thanhTien || mappedRow.thanhTien === 0) {
            mappedRow.thanhTien = mappedRow.soLuong * mappedRow.donGia;
          }

          if (mappedRow.soLuong <= 0) {
            toast.warning(`Dòng ${index + 1}: Số lượng phải lớn hơn 0`);
            return null;
          }
          
          if (mappedRow.donGia <= 0) {
            toast.warning(`Dòng ${index + 1}: Đơn giá phải lớn hơn 0`);
            return null;
          }

          mappedRow.soPhieu = `PN${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          mappedRow.khoNhap = mappedRow.khoNhap || DEFAULT_IMPORT_VALUES.khoNhap;
          mappedRow.nguoiNhap = mappedRow.nguoiNhap || DEFAULT_IMPORT_VALUES.nguoiNhap;
          mappedRow.nhaCungCap = mappedRow.nhaCungCap || DEFAULT_IMPORT_VALUES.nhaCungCap;
          mappedRow.ghiChu = mappedRow.ghiChu || DEFAULT_IMPORT_VALUES.ghiChu;

          return mappedRow;
        }).filter(row => row !== null);

        if (mappedData.length === 0) {
          toast.error('Không có dữ liệu hợp lệ để import');
          return;
        }

        setExcelData(mappedData);
        toast.success(`Đã đọc thành công ${mappedData.length} dòng dữ liệu`);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('Lỗi đọc file Excel: ' + (error as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  // ===== IMPORT EXCEL DATA =====
  const handleImportExcel = async () => {
    if (excelData.length === 0) {
      toast.error('Không có dữ liệu để import');
      return;
    }

    setIsProcessing(true);
    try {
      const groupedData = excelData.reduce((acc: any, row: any) => {
        const key = row.ngayNhap || 'unknown_date';
        if (!acc[key]) {
          acc[key] = {
            soPhieu: `PN${Date.now()}_${Object.keys(acc).length + 1}`,
            ngayNhap: row.ngayNhap || new Date().toISOString().split('T')[0],
            khoNhap: row.khoNhap || DEFAULT_IMPORT_VALUES.khoNhap,
            nguoiNhap: row.nguoiNhap || DEFAULT_IMPORT_VALUES.nguoiNhap,
            nhaCungCap: row.nhaCungCap || DEFAULT_IMPORT_VALUES.nhaCungCap,
            ghiChu: row.ghiChu || DEFAULT_IMPORT_VALUES.ghiChu,
            items: [],
            tongTien: 0,
            createdAt: new Date().toISOString()
          };
        }
        
        acc[key].items.push({
          tenChungLoai: row.tenChungLoai,
          soLuong: row.soLuong,
          donVi: row.donVi,
          donGia: row.donGia,
          thanhTien: row.thanhTien
        });
        acc[key].tongTien += row.thanhTien;
        
        return acc;
      }, {});

      const importRecords = Object.values(groupedData) as ImportRecord[];
      
      const existingImports = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updatedImports = [...existingImports, ...importRecords];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedImports));
      
      setImports(updatedImports);
      
      let successCount = 0;
      for (const record of importRecords) {
        try {
          const transactionData = convertToWarehouseTransaction(record);
          await handleSubmitAPI(transactionData);
          successCount++;
        } catch (error) {
          console.error(`Error importing record ${record.soPhieu}:`, error);
          toast.error(`Lỗi import phiếu ${record.soPhieu}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Import thành công ${successCount}/${importRecords.length} phiếu nhập`);
      }
      
      setExcelData([]);
      setImportExcelOpen(false);
    } catch (error) {
      console.error('Error importing Excel:', error);
      toast.error('Lỗi import dữ liệu: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ===== SELECTION HANDLERS =====
  const toggleSelect = (soPhieu: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(soPhieu)) {
      newSelected.delete(soPhieu);
    } else {
      newSelected.add(soPhieu);
    }
    setSelectedIds(newSelected);
    setIsAllSelected(newSelected.size === paginatedImports.length && paginatedImports.length > 0);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(paginatedImports.map(imp => imp.soPhieu));
      setSelectedIds(allIds);
    }
    setIsAllSelected(!isAllSelected);
  };

  // ===== DELETE HANDLERS =====
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để xóa');
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const remainingImports = imports.filter(imp => !selectedIds.has(imp.soPhieu));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingImports));
      setImports(remainingImports);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã xóa thành công ${selectedIds.size} phiếu nhập`);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Lỗi khi xóa phiếu nhập');
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== EXPORT EXCEL =====
  const handleExportExcel = () => {
    if (imports.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const data = imports.map((imp, index) => {
      const rows = imp.items.map((item, idx) => ({
        'STT': `${index + 1}.${idx + 1}`,
        'Số phiếu': imp.soPhieu,
        'Ngày nhập': imp.ngayNhap,
        'Kho nhập': imp.khoNhap,
        'Người nhập': imp.nguoiNhap,
        'Nhà cung cấp': imp.nhaCungCap || '',
        'Tên vật tư': item.tenChungLoai,
        'Số lượng': item.soLuong,
        'Đơn vị': item.donVi,
        'Đơn giá': item.donGia,
        'Thành tiền': item.thanhTien,
        'Ghi chú': imp.ghiChu || '',
      }));
      return rows;
    }).flat();

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PhieuNhap');
    
    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    XLSX.writeFile(wb, `Danh_sach_phieu_nhap_${dateStr}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  // ===== COMPONENT: PHIẾU NHẬP CONTENT =====
  const PhieuNhapContent = ({ data }: { data: ImportRecord }) => (
    <div id="phieu-nhap-content">
      <div className="header">
        <h2 style={{ textAlign: 'center', marginBottom: 20, fontSize: 24 }}>PHIẾU NHẬP KHO</h2>
      </div>
      <div className="info">
        <p><strong>Số phiếu:</strong> {data.soPhieu}</p>
        <p><strong>Ngày nhập:</strong> {data.ngayNhap}</p>
        <p><strong>Kho nhập:</strong> {data.khoNhap}</p>
        <p><strong>Người nhập:</strong> {data.nguoiNhap}</p>
        <p><strong>Nhà cung cấp:</strong> {data.nhaCungCap || '---'}</p>
        <p><strong>Ghi chú:</strong> {data.ghiChu || '---'}</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>STT</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Tên vật tư</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Số lượng</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Đơn vị</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Đơn giá (₫)</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Thành tiền (₫)</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{idx + 1}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.tenChungLoai}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.soLuong}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.donVi}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.donGia.toLocaleString('vi-VN')}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.thanhTien.toLocaleString('vi-VN')}</td>
            </tr>
          ))}
          <tr className="total">
            <td colSpan={5} style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Tổng cộng:</td>
            <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{data.tongTien.toLocaleString('vi-VN')} ₫</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nhập Kho</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý phiếu nhập kho | <strong>{imports.length}</strong> phiếu
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Import Excel Button */}
          <Dialog open={importExcelOpen} onOpenChange={setImportExcelOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={!canAdd}>
                <Upload className="w-4 h-4 mr-2" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* ... Giữ nguyên nội dung Import Excel ... */}
              <DialogHeader>
                <DialogTitle className="text-xl">Import phiếu nhập từ Excel</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload" className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click để chọn file Excel hoặc kéo thả vào đây
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Hỗ trợ định dạng .xlsx, .xls
                    </p>
                  </label>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">📋 Cấu trúc file Excel:</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><span className="font-semibold">Cột bắt buộc:</span> Ngày, Chung Loại, So Luong, Don vi, Don gia</p>
                    <p><span className="font-semibold">Cột tùy chọn:</span> Thanh Tien, Xuất Kho, Nhà cung cấp, Ghi chú</p>
                    <p className="text-xs text-blue-600">* Nếu không có cột "Thanh Tien", hệ thống sẽ tự động tính = Số lượng × Đơn giá</p>
                    <p className="text-xs text-blue-600">* Các mặt hàng cùng ngày nhập sẽ được nhóm thành 1 phiếu nhập</p>
                  </div>
                  <Button 
                    variant="link" 
                    className="text-blue-700 p-0 h-auto mt-2"
                    onClick={() => {
                      const sampleData = [
                        {
                          'Ngày': '22/01/2025',
                          'Chung Loại': 'HK phay RPMT1204MOE-JS VP15TF',
                          'So Luong': 50,
                          'Don vi': 'Viên',
                          'Don gia': 65000,
                          'Thanh Tien': 3250000,
                          'Xuất Kho': 'Tong',
                          'Nhà cung cấp': 'Công ty ABC',
                          'Ghi chú': 'Nhập lô hàng mới'
                        },
                        {
                          'Ngày': '22/01/2025',
                          'Chung Loại': 'HK tiện ren MMT16IR300 ISO SVP15TF',
                          'So Luong': 30,
                          'Don vi': 'Viên',
                          'Don gia': 130000,
                          'Thanh Tien': 3900000,
                          'Xuất Kho': 'Tong',
                          'Nhà cung cấp': 'Công ty ABC',
                          'Ghi chú': 'Nhập lô hàng mới'
                        }
                      ];
                      
                      const ws = XLSX.utils.json_to_sheet(sampleData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                      XLSX.writeFile(wb, 'mau_phieu_nhap.xlsx');
                    }}
                  >
                    📥 Tải file mẫu
                  </Button>
                </div>

                {excelData.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">📊 Dữ liệu đã đọc ({excelData.length} dòng)</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setExcelData([])}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" /> Xóa
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên vật tư</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">SL</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {excelData.slice(0, 10).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900">{idx + 1}</td>
                              <td className="px-3 py-2 text-gray-900">{row.ngayNhap}</td>
                              <td className="px-3 py-2 text-gray-900">{row.tenChungLoai}</td>
                              <td className="px-3 py-2 text-right text-gray-900">{row.soLuong}</td>
                              <td className="px-3 py-2 text-gray-900">{row.donVi}</td>
                              <td className="px-3 py-2 text-right text-gray-900">{row.donGia.toLocaleString('vi-VN')}</td>
                              <td className="px-3 py-2 text-right text-gray-900">{row.thanhTien.toLocaleString('vi-VN')}</td>
                            </tr>
                          ))}
                          {excelData.length > 10 && (
                            <tr>
                              <td colSpan={7} className="px-3 py-2 text-center text-gray-500">
                                ... và {excelData.length - 10} dòng khác
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Tổng cộng: {excelData.length} mặt hàng
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline" onClick={() => {
                    setImportExcelOpen(false);
                    setExcelData([]);
                  }}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleImportExcel}
                    disabled={excelData.length === 0 || isProcessing}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? '⏳ Đang xử lý...' : '📤 Import dữ liệu'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Export Excel Button */}
          <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Xuất Excel
          </Button>

          {/* Add New Button */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700" disabled={!canAdd}>
                <Plus className="w-4 h-4 mr-2" /> Thêm phiếu nhập
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Tạo phiếu nhập kho mới</DialogTitle>
              </DialogHeader>
              <WarehouseImport onSubmit={handleSubmitAPI} onSuccess={handleSuccess} />
            </DialogContent>
          </Dialog>

          {/* Delete Button */}
          {canDelete && (
            <Button 
              variant="destructive" 
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="🔍 Tìm kiếm theo số phiếu, kho, người nhập..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="min-w-[180px]">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => {
          setSearchTerm('');
          setFilterDate('');
        }} className="text-gray-500">
          <X className="w-4 h-4 mr-1" /> Xóa lọc
        </Button>
        <Badge variant="secondary" className="ml-auto">
          {filteredImports.length} phiếu
        </Badge>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="p-0 h-8 w-8"
                    disabled={paginatedImports.length === 0}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số phiếu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nhập</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nhập</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà cung cấp</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Số món</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedImports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-400">
                    {imports.length === 0 
                      ? 'Chưa có phiếu nhập nào. Nhấn "Thêm phiếu nhập" để tạo mới hoặc "Import Excel" để nhập từ file.'
                      : 'Không tìm thấy phiếu nhập phù hợp với bộ lọc.'}
                  </td>
                </tr>
              ) : (
                paginatedImports.map((imp) => (
                  <tr key={imp.soPhieu} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSelect(imp.soPhieu)}
                        className="p-0 h-8 w-8"
                      >
                        {selectedIds.has(imp.soPhieu) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{imp.soPhieu}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{imp.ngayNhap}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{imp.khoNhap}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{imp.nguoiNhap}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{imp.nhaCungCap || '---'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                      {imp.tongTien.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      <Badge variant="secondary">{imp.items.length}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Nút Chỉnh sửa - Thay thế nút duyệt */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(imp)}
                          className="text-blue-600 hover:text-blue-800"
                          disabled={!canEditData}
                          title="Chỉnh sửa phiếu nhập"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {/* Nút Xem chi tiết */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedImport(imp);
                            setViewOpen(true);
                          }}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredImports.length > 0 && (
          <div className="px-6 py-3 border-t flex flex-wrap items-center justify-between gap-2 bg-gray-50">
            <span className="text-sm text-gray-500">
              Hiển thị {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredImports.length)} / {filteredImports.length} phiếu
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Trước
              </Button>
              <span className="px-3 py-1 text-sm bg-white border rounded-md">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">✏️ Chỉnh sửa phiếu nhập</DialogTitle>
            <p className="text-sm text-gray-500">Sửa thông tin phiếu {editFormData?.soPhieu}</p>
          </DialogHeader>
          
          {editFormData && (
            <div className="space-y-4">
              {/* Thông tin phiếu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Số phiếu</Label>
                  <Input value={editFormData.soPhieu} disabled className="bg-gray-100" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Ngày nhập</Label>
                  <Input
                    type="date"
                    value={editFormData.ngayNhap}
                    onChange={(e) => setEditFormData({...editFormData, ngayNhap: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Kho nhập</Label>
                  <Input
                    value={editFormData.khoNhap}
                    onChange={(e) => setEditFormData({...editFormData, khoNhap: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Người nhập</Label>
                  <Input
                    value={editFormData.nguoiNhap}
                    onChange={(e) => setEditFormData({...editFormData, nguoiNhap: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Nhà cung cấp</Label>
                  <Input
                    value={editFormData.nhaCungCap}
                    onChange={(e) => setEditFormData({...editFormData, nhaCungCap: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Ghi chú</Label>
                  <Textarea
                    value={editFormData.ghiChu}
                    onChange={(e) => setEditFormData({...editFormData, ghiChu: e.target.value})}
                    rows={1}
                  />
                </div>
              </div>
              
              {/* Danh sách items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Danh sách vật tư</h4>
                  <Button variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="w-4 h-4 mr-1" /> Thêm dòng
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium">Tên vật tư</th>
                          <th className="px-3 py-2 text-right text-xs font-medium">Số lượng</th>
                          <th className="px-3 py-2 text-left text-xs font-medium">Đơn vị</th>
                          <th className="px-3 py-2 text-right text-xs font-medium">Đơn giá</th>
                          <th className="px-3 py-2 text-right text-xs font-medium">Thành tiền</th>
                          <th className="px-3 py-2 text-center text-xs font-medium">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editFormData.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">
                              <Input
                                value={item.tenChungLoai}
                                onChange={(e) => handleEditItemChange(idx, 'tenChungLoai', e.target.value)}
                                placeholder="Tên vật tư"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={item.soLuong}
                                onChange={(e) => handleEditItemChange(idx, 'soLuong', Number(e.target.value))}
                                className="text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={item.donVi}
                                onChange={(e) => handleEditItemChange(idx, 'donVi', e.target.value)}
                                placeholder="Đơn vị"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={item.donGia}
                                onChange={(e) => handleEditItemChange(idx, 'donGia', Number(e.target.value))}
                                className="text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {(item.soLuong * item.donGia).toLocaleString('vi-VN')} ₫
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-500 hover:text-red-700"
                                disabled={editFormData.items.length <= 1}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-right font-bold">
                            Tổng cộng:
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-600">
                            {editFormData.items.reduce((sum: number, item: any) => sum + (item.soLuong * item.donGia), 0).toLocaleString('vi-VN')} ₫
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Nút lưu */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setEditOpen(false);
                  setEditFormData(null);
                }}>
                  Hủy
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? (
                    '⏳ Đang lưu...'
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* VIEW DETAIL MODAL */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">📄 Chi tiết phiếu nhập</DialogTitle>
          </DialogHeader>
          {selectedImport && <PhieuNhapContent data={selectedImport} />}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Đóng
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="w-4 h-4 mr-2" /> In / Lưu PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xóa <strong>{selectedIds.size}</strong> phiếu nhập đã chọn?
            </p>
            <p className="text-red-500 text-sm mt-2">Hành động này không thể hoàn tác!</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? '⏳ Đang xóa...' : '🗑️ Xóa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NhapKho;