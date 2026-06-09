//Quản lý danh mục -> chủng loại (ĐÃ SỬA DÙNG SUPABASE)
import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Edit, Search, Trash2, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Category {
  id: string
  maLoai: string
  tenLoai: string
  donVi: string
  gia: number
  ghiChu?: string
  created_by?: string
  createdAt: string
}

export function CategoryTypeManagement() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    maLoai: '',
    tenLoai: '',
    donVi: '',
    gia: 0,
    ghiChu: '',
  })

  const ITEMS_PER_PAGE = 10

  // Tải dữ liệu từ Supabase
  const loadCategories = async () => {
    setIsLoading(true)
    try {
      // Lấy tất cả categories (RLS sẽ tự filter theo quyền)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Không thể tải dữ liệu')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  // Lưu dữ liệu xuống Supabase
  const saveData = async (data: Category[]) => {
    // Đồng bộ lên Supabase
    for (const item of data) {
      const { error } = await supabase
        .from('categories')
        .upsert({
          id: item.id,
          ma_loai: item.maLoai,
          ten_loai: item.tenLoai,
          don_vi: item.donVi,
          gia: item.gia,
          mo_ta: item.ghiChu,
          status: 'active',
          updated_at: new Date().toISOString()
        })
      
      if (error) console.error('Upsert error:', error)
    }
    
    setCategories(data)
    setSelectedIds([])
    await loadCategories() // Reload để lấy dữ liệu mới nhất
  }

  // Xóa category
  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    await loadCategories()
  }

  // Thuật toán sinh mã tự động
  const generateCode = (currentList: Category[]) => {
    let maxNum = 0
    currentList.forEach(item => {
      if (item.maLoai?.startsWith('LO')) {
        const num = parseInt(item.maLoai.replace('LO', ''), 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    })
    return `LO${String(maxNum + 1).padStart(3, '0')}`
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      maLoai: '',
      tenLoai: '',
      donVi: '',
      gia: 0,
      ghiChu: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tenLoai.trim()) {
      toast.error('Vui lòng nhập tên loại')
      return
    }

    const msnv = user?.msnv || 'unknown'

    if (editingId) {
      // Cập nhật
      const { error } = await supabase
        .from('categories')
        .update({
          ten_loai: formData.tenLoai.trim(),
          don_vi: formData.donVi.trim(),
          gia: formData.gia,
          mo_ta: formData.ghiChu.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId)

      if (error) throw error
      toast.success('Đã cập nhật chủng loại thành công')
    } else {
      // Thêm mới
      const finalMaLoai = generateCode(categories)
      const { error } = await supabase
        .from('categories')
        .insert({
          id: crypto.randomUUID(),
          ma_loai: finalMaLoai,
          ten_loai: formData.tenLoai.trim(),
          don_vi: formData.donVi.trim(),
          gia: formData.gia,
          mo_ta: formData.ghiChu.trim(),
          loai: 'material',
          status: 'active',
          created_by: msnv,
          created_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success(`Đã thêm mới loại ${finalMaLoai}`)
    }

    resetForm()
    await loadCategories()
  }

  const handleEdit = (item: Category) => {
    setEditingId(item.id)
    setFormData({
      maLoai: item.maLoai,
      tenLoai: item.tenLoai,
      donVi: item.donVi || '',
      gia: item.gia || 0,
      ghiChu: item.ghiChu || '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chủng loại này không?')) return
    await deleteCategory(id)
    toast.success('Đã xóa thành công')
    if (paginatedData.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Chưa chọn dữ liệu để xóa')
      return
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} mục đã chọn?`)) return

    for (const id of selectedIds) {
      await deleteCategory(id)
    }
    setCurrentPage(1)
    toast.success('Đã xóa các mục được chọn')
    await loadCategories()
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<any>(worksheet)

        const user = currentUser?.msnv || 'unknown'
        let imported = 0

        for (const row of json) {
          const finalMaLoai = row['Mã loại'] || generateCode(categories)
          const { error } = await supabase
            .from('categories')
            .insert({
              id: crypto.randomUUID(),
              ma_loai: finalMaLoai,
              ten_loai: row['Tên loại'] || 'Chưa đặt tên',
              don_vi: row['Đơn vị'] || '',
              gia: Number(row['Giá']) || 0,
              mo_ta: row['Ghi chú'] || '',
              loai: 'material',
              status: 'active',
              created_by: user,
              created_at: new Date().toISOString()
            })
          
          if (!error) imported++
        }

        toast.success(`Import thành công ${imported} dòng dữ liệu`)
        await loadCategories()
      } catch (error) {
        console.error(error)
        toast.error('Lỗi định dạng file Excel')
      }
    }
    reader.readAsArrayBuffer(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filteredData = useMemo(() => {
    return categories.filter((item) => {
      const keyword = search.toLowerCase().trim()
      return (
        (item.maLoai || '').toLowerCase().includes(keyword) ||
        (item.tenLoai || '').toLowerCase().includes(keyword) ||
        (item.donVi || '').toLowerCase().includes(keyword)
      )
    })
  }, [categories, search])

  useEffect(() => setCurrentPage(1), [search])

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const paginatedData = useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    )
  }, [filteredData, currentPage])

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Đang tải dữ liệu...</div>
  }

  return (
    <div className="p-1 space-y-6 bg-slate-50/30 min-h-screen">
      {/* Phần còn lại giữ nguyên giao diện */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* FORM NHẬP LIỆU */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white">
            <CardHeader className="pb-4 pt-5 px-5">
              <CardTitle className="text-lg font-bold text-slate-800">
                {editingId ? 'Sửa chủng loại' : 'Thêm chủng loại'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Mã loại</Label>
                  <Input
                    value={editingId ? formData.maLoai : ""}
                    disabled
                    placeholder="Tự động tạo"
                    className="bg-slate-50 text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Tên loại <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.tenLoai}
                    onChange={(e) => setFormData({ ...formData, tenLoai: e.target.value })}
                    placeholder="Nhập tên loại"
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Đơn vị</Label>
                  <Input
                    value={formData.donVi}
                    onChange={(e) => setFormData({ ...formData, donVi: e.target.value })}
                    placeholder="VD: Cái, Kg, m, Lít..."
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Giá</Label>
                  <Input
                    type="number"
                    value={formData.gia}
                    onChange={(e) => setFormData({ ...formData, gia: Number(e.target.value) })}
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Ghi chú</Label>
                  <Textarea
                    rows={3}
                    value={formData.ghiChu}
                    onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                    placeholder="Nhập ghi chú (nếu có)"
                    className="border-slate-200 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    Lưu
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
                    Hủy
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* IMPORT EXCEL */}
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-base font-bold text-slate-800">Import Excel</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-1 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                File Excel gồm các cột: Mã loại, Tên loại, Đơn vị, Giá, Ghi chú
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
              <Button
                variant="outline"
                className="w-full h-24 border-dashed border-2 border-slate-200 hover:bg-slate-50/80 rounded-xl transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">Chọn file Excel</span>
                  <span className="text-[10px] text-slate-400">(.xlsx, .xls)</span>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* BẢNG DANH SÁCH - giữ nguyên phần giao diện cũ */}
        <div className="xl:col-span-3">
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-4 px-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg font-bold text-slate-800">Danh sách chủng loại</CardTitle>
                  <span className="bg-blue-50 text-blue-600 border border-blue-100 font-bold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                    Tổng: {categories.length} loại
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9 w-full sm:w-64 border-slate-200 placeholder:text-slate-400 h-9 rounded-lg"
                      placeholder="Tìm kiếm..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {selectedIds.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9 rounded-lg px-3 flex items-center gap-1.5"
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xóa đã chọn ({selectedIds.length})</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="w-12 text-center py-2 h-10">
                        <Checkbox
                          className="h-3.5 w-3.5 rounded-sm border-slate-300 data-[state=checked]:bg-blue-600"
                          checked={
                            paginatedData.length > 0 &&
                            paginatedData.every((item) => selectedIds.includes(item.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const pageIds = paginatedData.map((item) => item.id)
                              setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
                            } else {
                              const pageIds = paginatedData.map((item) => item.id)
                              setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)))
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 py-2">Mã loại</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 py-2">Tên loại</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 py-2">Đơn vị</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 py-2">Giá</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-10 py-2">Ghi chú</TableHead>
                      <TableHead className="w-24 text-center font-semibold text-slate-700 h-10 py-2">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-40 text-center text-slate-400">
                          Không tìm thấy bản ghi dữ liệu chủng loại nào.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                          <TableCell className="text-center py-2">
                            <Checkbox
                              className="h-3.5 w-3.5 rounded-sm border-slate-300 data-[state=checked]:bg-blue-600"
                              checked={selectedIds.includes(item.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedIds([...selectedIds, item.id])
                                else setSelectedIds(selectedIds.filter((id) => id !== item.id))
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-slate-600 py-2">{item.maLoai}</TableCell>
                          <TableCell className="font-medium text-slate-900 py-2">{item.tenLoai}</TableCell>
                          <TableCell className="text-slate-600 py-2">{item.donVi || '—'}</TableCell>
                          <TableCell className="font-medium text-slate-800 py-2">
                            {item.gia > 0 ? item.gia.toLocaleString('vi-VN') : '0'}
                          </TableCell>
                          <TableCell className="text-slate-500 py-2 max-w-xs truncate">{item.ghiChu || '—'}</TableCell>
                          <TableCell className="text-center py-2">
                            <div className="flex justify-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(item)}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* PHÂN TRANG */}
              <div className="flex items-center justify-between p-4 bg-white border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Hiển thị {filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} đến{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} của {filteredData.length} dòng
                </p>
                <div className="flex items-center gap-2">
                  <select className="bg-white border border-slate-200 rounded px-2 py-1 text-sm text-slate-600 focus:outline-none" value={`${ITEMS_PER_PAGE} / trang`} disabled>
                    <option>{ITEMS_PER_PAGE} / trang</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-slate-200" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        className={`h-8 w-8 p-0 font-medium text-sm rounded-md ${
                          currentPage === page ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-slate-200" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(currentPage + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}