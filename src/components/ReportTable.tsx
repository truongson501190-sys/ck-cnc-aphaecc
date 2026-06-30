// src/components/ReportTable.tsx
import { useState, useMemo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface ReportTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  exportFileName?: string;
  exportSheetName?: string;
  onExport?: (data: T[]) => void;
  actions?: ReactNode;
  summary?: ReactNode;
  footer?: ReactNode;
}

export function ReportTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  title,
  description,
  searchPlaceholder = 'Tìm kiếm...',
  searchFields = [],
  exportFileName = 'bao_cao',
  exportSheetName = 'Sheet1',
  onExport,
  actions,
  summary,
  footer,
}: ReportTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm.trim() || searchFields.length === 0) return data;
    const keyword = searchTerm.toLowerCase().trim();
    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (value == null) return false;
        return String(value).toLowerCase().includes(keyword);
      })
    );
  }, [data, searchTerm, searchFields]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.warning('Không có dữ liệu để xuất');
      return;
    }

    if (onExport) {
      onExport(filteredData);
      return;
    }

    // Export mặc định
    const exportData = filteredData.map((item) => {
      const row: Record<string, any> = {};
      columns.forEach((col) => {
        const key = col.key as string;
        const value = item[key];
        row[col.header] = value ?? '';
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportSheetName);
    XLSX.writeFile(wb, `${exportFileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <p className="text-gray-500 mt-1 text-sm">{description}</p>}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {summary}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
            {actions}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-slate-100">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`border p-2 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="border p-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredData.map((item, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className={`border p-2 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                      >
                        {col.render ? col.render(item) : (item[col.key] ?? '---')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {footer && <tfoot>{footer}</tfoot>}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}