// src/modules/warehouse/pages/StockCard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  imports: 'warehouseImports',
  exports: 'warehouseExports',
  transfers: 'warehouseTransfers',
  consumables: 'consumableExports',
};

export function StockCard() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);

  useEffect(() => {
    // Load categories
    const cats = JSON.parse(localStorage.getItem('saved_categories_key_hoac_tuong_duong') || '[]');
    setCategories(cats);
    
    // Load all transactions
    const imports = JSON.parse(localStorage.getItem(STORAGE_KEYS.imports) || '[]');
    const exports = JSON.parse(localStorage.getItem(STORAGE_KEYS.exports) || '[]');
    const transfers = JSON.parse(localStorage.getItem(STORAGE_KEYS.transfers) || '[]');
    const consumables = JSON.parse(localStorage.getItem(STORAGE_KEYS.consumables) || '[]');
    
    const all = [...imports, ...exports, ...transfers, ...consumables];
    setTransactions(all);
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setFiltered([]);
      return;
    }
    
    const cat = categories.find(c => c.id === selectedCategory || c.maLoai === selectedCategory);
    if (!cat) return;
    
    const catName = cat.tenLoai || cat.tenChungLoai || '';
    
    // Lọc các giao dịch có chứa mặt hàng này
    const result = transactions.filter(t => {
      if (!t.items) return false;
      return t.items.some((item: any) => {
        const itemName = item.tenChungLoai || item.itemName || item.tenLoai || '';
        return itemName.includes(catName) || catName.includes(itemName);
      });
    });
    
    // Sắp xếp theo thời gian
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.ngayXuat || a.ngayChuyen || 0);
      const dateB = new Date(b.createdAt || b.ngayXuat || b.ngayChuyen || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    setFiltered(result);
  }, [selectedCategory, categories, transactions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Thẻ kho</h1>
            <p className="text-gray-600 text-sm">Xem chi tiết biến động của từng mặt hàng</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chọn mặt hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Chọn mặt hàng..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id || cat.maLoai} value={cat.id || cat.maLoai}>
                    {cat.maLoai} - {cat.tenLoai || cat.tenChungLoai}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedCategory && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                Chi tiết biến động
                {categories.find(c => c.id === selectedCategory || c.maLoai === selectedCategory) && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {categories.find(c => c.id === selectedCategory || c.maLoai === selectedCategory)?.tenLoai}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Số phiếu</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Không có giao dịch nào cho mặt hàng này
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((t, index) => {
                        const typeMap: { [key: string]: string } = {
                          'warehouseImports': '📥 Nhập',
                          'warehouseExports': '📤 Xuất',
                          'warehouseTransfers': '🔄 Chuyển',
                          'consumableExports': '🔧 Xuất vật tư'
                        };
                        return (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{t.soPhieu}</TableCell>
                            <TableCell>{t.type || '---'}</TableCell>
                            <TableCell>{t.ngayXuat || t.ngayChuyen || t.createdAt?.split('T')[0] || ''}</TableCell>
                            <TableCell>
                              {t.items?.reduce((sum: number, item: any) => {
                                const cat = categories.find(c => c.id === selectedCategory || c.maLoai === selectedCategory);
                                const catName = cat?.tenLoai || cat?.tenChungLoai || '';
                                const itemName = item.tenChungLoai || item.itemName || item.tenLoai || '';
                                if (itemName.includes(catName) || catName.includes(itemName)) {
                                  return sum + Number(item.soLuong || item.quantity || 0);
                                }
                                return sum;
                              }, 0) || 0}
                            </TableCell>
                            <TableCell>
                              {t.items?.find((item: any) => {
                                const cat = categories.find(c => c.id === selectedCategory || c.maLoai === selectedCategory);
                                const catName = cat?.tenLoai || cat?.tenChungLoai || '';
                                const itemName = item.tenChungLoai || item.itemName || item.tenLoai || '';
                                return itemName.includes(catName) || catName.includes(itemName);
                              })?.donVi || '---'}
                            </TableCell>
                            <TableCell>{t.ghiChu || t.notes || '---'}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}