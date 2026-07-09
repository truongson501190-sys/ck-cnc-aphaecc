// src/components/ReportTable.tsx
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface ReportTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  searchFields?: string[];
  exportFileName?: string;
  exportSheetName?: string;
  summary?: ((data: T[]) => React.ReactNode) | React.ReactNode;
  // Thêm props cho phân trang
  pageSize?: number;
  pageSizeOptions?: number[];
}

export function ReportTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  title,
  description,
  searchPlaceholder = "Tìm kiếm...",
  searchFields = [],
  exportFileName = "report",
  exportSheetName = "Sheet1",
  summary,
  pageSize = 20, // Mặc định 20 dòng/trang
  pageSizeOptions = [10, 20, 50, 100], // Các lựa chọn
}: ReportTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // Lọc dữ liệu theo searchTerm
  const filteredData = useMemo(() => {
    if (!searchTerm.trim() || searchFields.length === 0) {
      return data;
    }

    const term = searchTerm.toLowerCase().trim();
    return data.filter((row) => {
      return searchFields.some((field) => {
        const value = row[field];
        if (value === undefined || value === null) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, searchFields]);

  // Tính toán phân trang
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  
  // Đảm bảo currentPage không vượt quá totalPages
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  
  // Lấy dữ liệu cho trang hiện tại
  const paginatedData = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, safeCurrentPage, rowsPerPage]);

  // Reset về trang 1 khi tìm kiếm hoặc thay đổi rowsPerPage
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  // Render summary với dữ liệu đã lọc
  const renderSummary = () => {
    if (!summary) return null;
    
    if (typeof summary === 'function') {
      return summary(filteredData);
    }
    
    return summary;
  };

  // Export Excel - Xuất toàn bộ dữ liệu đã lọc
  const handleExport = () => {
    const exportData = filteredData.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        const value = row[col.key];
        if (col.render) {
          const rendered = col.render(row);
          if (typeof rendered === 'string') {
            obj[col.header] = rendered;
          } else if (rendered && typeof rendered === 'object' && 'props' in rendered) {
            const props = rendered.props as { children?: React.ReactNode };
            const children = props?.children;
            if (typeof children === 'string') {
              obj[col.header] = children;
            } else {
              obj[col.header] = value;
            }
          } else {
            obj[col.header] = value;
          }
        } else {
          obj[col.header] = value;
        }
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportSheetName);
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {(title || description) && (
        <div className="flex justify-between items-start">
          <div>
            {title && <h2 className="text-2xl font-bold">{title}</h2>}
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
        </div>
      )}

      {/* Search + Export */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Summary */}
      {renderSummary() && (
        <div className="mt-2">
          {renderSummary()}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={`px-4 py-3 text-sm font-semibold text-gray-700 ${
                      col.align === 'center' ? 'text-center' :
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={`px-4 py-3 text-sm ${
                          col.align === 'center' ? 'text-center' :
                          col.align === 'right' ? 'text-right' : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalItems > 0 && (
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Hiển thị</span>
              <select
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>
                / {totalItems} dòng
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm">
                Trang {safeCurrentPage} / {totalPages || 1}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}