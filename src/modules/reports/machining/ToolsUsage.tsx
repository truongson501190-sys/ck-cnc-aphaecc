// src/modules/reports/machining/ToolsUsage.tsx
import { useMemo, useState, useEffect } from 'react';
import { useProductionReports } from '@/hooks/useProductionReports';
import { ReportTable, Column } from '@/components/ReportTable';
import { supabase } from '@/supabase';

interface ToolRow {
  ngay: string;
  may: string;
  maDuAn: string;
  tenDao: string;
  slCap: number;
  slSuDung: number;
  hong: number;
  donVi: string;
  donGia: number;
  thanhTien: number;
  nguoiVanHanh: string;
}

// Cache danh sách chủng loại
let chungLoaiCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

export function ToolsUsage() {
  const { reports, isLoading } = useProductionReports();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatCurrency = (value: number) => {
    if (!value || isNaN(value)) return '0 đ';
    return value.toLocaleString('vi-VN') + ' đ';
  };

  // Hàm làm sạch tên để so sánh
  const cleanName = (name: string): string => {
    if (!name) return '';
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  };

  // Hàm kiểm tra và tìm bảng chủng loại
  const findCategoryTable = async () => {
    console.log('🔍 Đang tìm bảng chủng loại...');
    
    const tableNames = [
      'chung_loai',
      'ChungLoai', 
      'chungloai',
      'category',
      'categories',
      'danh_muc_chung_loai',
      'loai_dao',
      'tool_catalog',
      'tools'
    ];
    
    // Thử từng tên bảng
    for (const tableName of tableNames) {
      try {
        console.log(`📋 Thử bảng: "${tableName}"`);
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Tìm thấy bảng: "${tableName}"`);
          return tableName;
        }
      } catch (e) {
        // Bỏ qua lỗi
      }
    }
    
    // Nếu không tìm thấy, thử lấy danh sách tất cả bảng
    try {
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (!error && tables) {
        console.log('📋 Danh sách bảng trong public schema:', tables.map(t => t.table_name));
        // Tìm bảng có tên liên quan đến chủng loại
        const keywords = ['chung', 'loai', 'category', 'tool', 'dao', 'catalog'];
        for (const table of tables) {
          const tableName = table.table_name;
          if (keywords.some(k => tableName.toLowerCase().includes(k))) {
            console.log(`🔍 Tìm thấy bảng khả nghi: "${tableName}"`);
            return tableName;
          }
        }
      }
    } catch (e) {
      console.log('❌ Không thể lấy danh sách bảng');
    }
    
    console.log('❌ Không tìm thấy bảng chủng loại');
    return null;
  };

  // Hàm lấy danh sách chủng loại từ database
  const loadChungLoai = async () => {
    try {
      // Kiểm tra cache
      const now = Date.now();
      if (chungLoaiCache && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('📦 Sử dụng cache chủng loại, số lượng:', chungLoaiCache.length);
        return chungLoaiCache;
      }

      // Tìm tên bảng
      const tableName = await findCategoryTable();
      if (!tableName) {
        console.log('⚠️ Không tìm thấy bảng chủng loại');
        return [];
      }

      console.log(`📥 Đang tải dữ liệu từ bảng "${tableName}"...`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
      
      if (error) {
        console.error('❌ Lỗi tải chủng loại:', error);
        return [];
      }

      chungLoaiCache = data || [];
      cacheTimestamp = now;
      console.log(`✅ Đã tải ${chungLoaiCache.length} loại chủng loại`);
      
      if (chungLoaiCache.length > 0) {
        console.log('📋 Cấu trúc dữ liệu:', Object.keys(chungLoaiCache[0]));
        console.log('📋 5 loại đầu tiên:', chungLoaiCache.slice(0, 5).map(item => ({
          ten: item.tenLoai || item.ten_loai || item.ten || item.name || 'N/A',
          gia: item.gia || item.donGia || item.don_gia || item.price || 0,
          donVi: item.donVi || item.don_vi || item.unit || 'Cái'
        })));
      }
      
      return chungLoaiCache;
    } catch (error) {
      console.error('❌ Lỗi tải chủng loại:', error);
      return [];
    }
  };

  // Hàm tìm đơn giá từ danh sách chủng loại
  const findPriceInChungLoai = (tenDao: string, catalog: any[]): { donGia: number; donVi: string; maLoai: string } => {
    if (!tenDao || !catalog || catalog.length === 0) {
      return { donGia: 0, donVi: 'Cái', maLoai: '' };
    }
    
    const daoName = tenDao.trim();
    const cleanDaoName = cleanName(daoName);
    
    // Các field có thể chứa tên, giá, đơn vị, mã
    const nameFields = ['tenLoai', 'ten_loai', 'ten', 'name', 'tenChungLoai', 'toolName', 'categoryName'];
    const priceFields = ['gia', 'donGia', 'don_gia', 'price', 'cost'];
    const unitFields = ['donVi', 'don_vi', 'unit'];
    const codeFields = ['maLoai', 'ma_loai', 'code', 'toolCode'];
    
    let bestMatch = null;
    let bestScore = 0;
    let matchedName = '';
    
    for (const item of catalog) {
      // Lấy tên từ các field có thể
      let itemName = '';
      for (const field of nameFields) {
        if (item[field]) {
          itemName = String(item[field]);
          break;
        }
      }
      
      if (!itemName) continue;
      
      const cleanItemName = cleanName(itemName);
      
      // Tính điểm khớp
      let score = 0;
      
      // 1. Khớp chính xác (100 điểm)
      if (cleanItemName === cleanDaoName) {
        score = 100;
      } 
      // 2. Khớp chứa (80 điểm)
      else if (cleanItemName.includes(cleanDaoName) || cleanDaoName.includes(cleanItemName)) {
        score = 80;
      }
      // 3. Khớp từ khóa (tối đa 70 điểm)
      else {
        const words = cleanDaoName.split(' ');
        let matchCount = 0;
        for (const word of words) {
          if (word.length > 2 && cleanItemName.includes(word)) {
            matchCount++;
          }
        }
        score = Math.min(70, matchCount * 20);
        
        // Nếu là insert, kiểm tra mã
        if (cleanDaoName.includes('insert') || cleanDaoName.includes('rpmt') || cleanDaoName.includes('somt')) {
          const codeWords = cleanDaoName.split(' ').filter(w => w.length > 3 && /[0-9]/.test(w));
          for (const code of codeWords) {
            if (cleanItemName.includes(code)) {
              score += 10;
            }
          }
        }
      }
      
      // Kiểm tra mã loại
      for (const field of codeFields) {
        if (item[field]) {
          const code = String(item[field]).toLowerCase();
          if (cleanDaoName.includes(code)) {
            score += 10;
          }
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
        matchedName = itemName;
      }
    }
    
    // Chỉ chọn kết quả có điểm >= 40
    if (bestMatch && bestScore >= 40) {
      // Lấy giá
      let gia = 0;
      for (const field of priceFields) {
        const val = bestMatch[field];
        if (val !== undefined && val !== null) {
          gia = Number(val) || 0;
          break;
        }
      }
      
      // Lấy đơn vị
      let donVi = 'Cái';
      for (const field of unitFields) {
        if (bestMatch[field]) {
          donVi = String(bestMatch[field]);
          break;
        }
      }
      
      // Lấy mã
      let maLoai = '';
      for (const field of codeFields) {
        if (bestMatch[field]) {
          maLoai = String(bestMatch[field]);
          break;
        }
      }
      
      console.log(`✅ Tìm thấy: "${matchedName}" -> ${gia}đ (điểm: ${bestScore})`);
      return { donGia: gia, donVi, maLoai };
    }
    
    console.log(`⚠️ Không tìm thấy đơn giá cho: "${daoName}" (điểm cao nhất: ${bestScore})`);
    return { donGia: 0, donVi: 'Cái', maLoai: '' };
  };

  // Hàm lấy giá trị từ object
  const getValue = (obj: any, keys: string[], defaultValue: any = 0) => {
    if (!obj) return defaultValue;
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        const val = obj[key];
        if (typeof val === 'string' && !isNaN(Number(val))) {
          return Number(val);
        }
        return val;
      }
    }
    return defaultValue;
  };

  // Hàm parse toolEntries
  const parseToolEntries = (report: any) => {
    let toolData = null;
    const possibleFields = ['toolEntries', 'tool_entries', 'toolentries', 'tools', 'dao_cu', 'toolList'];
    
    for (const field of possibleFields) {
      const val = report[field];
      if (val) {
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              toolData = parsed;
              break;
            }
          } catch (e) {}
        } 
        else if (Array.isArray(val) && val.length > 0) {
          toolData = val;
          break;
        }
      }
    }
    
    return Array.isArray(toolData) ? toolData : [];
  };

  // State
  const [dataWithPrices, setDataWithPrices] = useState<ToolRow[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [tableFound, setTableFound] = useState<string | null>(null);

  // Xử lý dữ liệu chính
  const rawData: ToolRow[] = useMemo(() => {
    console.log('📊 Processing reports for ToolsUsage, total reports:', reports.length);
    
    const result: ToolRow[] = [];
    
    reports.forEach((r) => {
      const toolEntries = parseToolEntries(r);
      
      if (toolEntries && toolEntries.length > 0) {
        toolEntries.forEach((t: any) => {
          const tenDao = getValue(t, ['tenDao', 'ten_dao', 'toolName', 'name', 'ten'], '---');
          const slSuDung = getValue(t, ['slSuDung', 'sl_su_dung', 'quantityUsed', 'used'], 0);
          const slCap = getValue(t, ['slCap', 'sl_cap', 'quantityCap', 'cap'], 0);
          const hong = getValue(t, ['hong', 'broken', 'damaged'], 0);
          const donVi = getValue(t, ['donVi', 'don_vi', 'unit', 'dvt'], 'Cái');
          
          let donGia = getValue(t, ['donGia', 'don_gia', 'price', 'unitPrice', 'dongia'], 0);
          let thanhTien = getValue(t, ['thanhTien', 'thanh_tien', 'total', 'amount', 'thanhtien'], 0);
          
          if (donGia > 0 && thanhTien === 0 && slSuDung > 0) {
            thanhTien = donGia * slSuDung;
          }
          
          result.push({
            ngay: formatDate(r.ngayThang),
            may: r.maySanXuat || '---',
            maDuAn: r.duAn || '---',
            tenDao: tenDao,
            slCap: slCap,
            slSuDung: slSuDung,
            hong: hong,
            donVi: donVi,
            donGia: donGia,
            thanhTien: thanhTien,
            nguoiVanHanh: r.nguoiVanHanh || '---',
          });
        });
      }
    });
    
    console.log('📊 Total raw tool rows:', result.length);
    return result;
  }, [reports]);

  // Cập nhật đơn giá từ danh sách chủng loại
  useEffect(() => {
    const updatePrices = async () => {
      if (rawData.length === 0) {
        setDataWithPrices([]);
        return;
      }
      
      setIsLoadingPrices(true);
      
      try {
        // Lấy danh sách chủng loại
        const catalog = await loadChungLoai();
        console.log('📦 Catalog loaded:', catalog.length);
        
        // Cập nhật đơn giá cho từng dòng
        const updated = rawData.map(row => {
          // Nếu đã có đơn giá > 0 thì giữ nguyên
          if (row.donGia > 0) {
            return row;
          }
          
          // Tìm đơn giá từ danh sách chủng loại
          const priceInfo = findPriceInChungLoai(row.tenDao, catalog);
          
          if (priceInfo.donGia > 0) {
            const newDonGia = priceInfo.donGia;
            const newThanhTien = newDonGia * row.slSuDung;
            console.log(`💰 Cập nhật "${row.tenDao}": ${row.donGia} -> ${newDonGia}đ`);
            return {
              ...row,
              donGia: newDonGia,
              thanhTien: newThanhTien,
              donVi: priceInfo.donVi || row.donVi,
            };
          }
          
          return row;
        });
        
        setDataWithPrices(updated);
        
        // Kiểm tra số lượng chưa có đơn giá
        const missing = updated.filter(row => row.donGia === 0 && row.slSuDung > 0);
        if (missing.length > 0) {
          console.log(`⚠️ ${missing.length} dao chưa có đơn giá:`, missing.map(row => row.tenDao));
        }
      } catch (error) {
        console.error('❌ Lỗi cập nhật đơn giá:', error);
        setDataWithPrices(rawData);
      } finally {
        setIsLoadingPrices(false);
      }
    };
    
    updatePrices();
  }, [rawData]);

  const columns: Column<ToolRow>[] = [
    { key: 'ngay', header: 'Ngày' },
    { key: 'may', header: 'Máy' },
    { key: 'maDuAn', header: 'Dự án' },
    { key: 'tenDao', header: 'Tên dao', className: 'font-medium' },
    { key: 'slCap', header: 'SL cấp', align: 'center' },
    { key: 'slSuDung', header: 'SL dùng', align: 'center' },
    { key: 'hong', header: 'Hỏng', align: 'center', render: (row) => <span className="text-red-600">{row.hong}</span> },
    { key: 'donVi', header: 'ĐVT' },
    {
      key: 'donGia',
      header: 'Đơn giá',
      align: 'right',
      render: (row) => {
        if (isLoadingPrices && row.donGia === 0 && row.slSuDung > 0) {
          return <span className="text-gray-400">Đang tải...</span>;
        }
        if (row.donGia === 0) {
          return <span className="text-gray-400 text-sm">Chưa có</span>;
        }
        return <span className="text-blue-600 font-medium">{formatCurrency(row.donGia)}</span>;
      },
    },
    {
      key: 'thanhTien',
      header: 'Thành tiền',
      align: 'right',
      render: (row) => {
        if (isLoadingPrices && row.thanhTien === 0 && row.slSuDung > 0) {
          return <span className="text-gray-400">Đang tải...</span>;
        }
        if (row.thanhTien === 0) {
          return <span className="text-gray-400 text-sm">0 đ</span>;
        }
        return <span className="text-emerald-600 font-semibold">{formatCurrency(row.thanhTien)}</span>;
      },
    },
  ];

  const totalCost = dataWithPrices.reduce((sum, item) => sum + (item.thanhTien || 0), 0);
  const totalTools = dataWithPrices.length;
  const missingPrice = dataWithPrices.filter(row => row.donGia === 0 && row.slSuDung > 0).length;

  const summary = (
    <div className="flex gap-4 flex-wrap">
      <div className="px-3 py-1 bg-blue-50 rounded-lg text-sm">
        <span className="text-gray-600">Tổng số dao:</span>
        <span className="ml-2 font-bold text-blue-600">{totalTools}</span>
      </div>
      <div className="px-3 py-1 bg-emerald-50 rounded-lg text-sm">
        <span className="text-gray-600">Tổng chi phí:</span>
        <span className="ml-2 font-bold text-emerald-600">{formatCurrency(totalCost)}</span>
      </div>
      {missingPrice > 0 && (
        <div className="px-3 py-1 bg-yellow-50 rounded-lg text-sm">
          <span className="text-yellow-600">⚠️ {missingPrice} dao chưa có đơn giá</span>
        </div>
      )}
      {isLoadingPrices && (
        <div className="px-3 py-1 bg-yellow-50 rounded-lg text-sm">
          <span className="text-yellow-600">⏳ Đang tải đơn giá...</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <ReportTable
        data={dataWithPrices}
        columns={columns}
        isLoading={isLoading || isLoadingPrices}
        title="🔧 DAO CỤ SỬ DỤNG"
        description="Chi tiết các loại dao cụ đã sử dụng trong sản xuất"
        searchPlaceholder="Tìm kiếm..."
        searchFields={['tenDao', 'maDuAn', 'may']}
        exportFileName="dao_cu_su_dung"
        exportSheetName="DaoCuSuDung"
        summary={summary}
      />
    </div>
  );
}