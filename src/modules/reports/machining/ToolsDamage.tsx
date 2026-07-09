// src/modules/reports/machining/ToolsDamage.tsx
import { useMemo, useState, useEffect } from 'react';
import { useProductionReports } from '@/hooks/useProductionReports';
import { ReportTable, Column } from '@/components/ReportTable';
import { supabase } from '@/supabase';

interface DamageRow {
  ngay: string;
  may: string;
  maDuAn: string;
  tenDao: string;
  hong: number;
  donGia: number;
  thietHai: number;
  nguoiVanHanh: string;
}

interface PriceInfo {
  donGia: number;
  donVi: string;
  maLoai: string;
}

// Cache danh sách chủng loại
let chungLoaiCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export function ToolsDamage() {
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

  // Hàm làm sạch tên
  const cleanName = (name: string): string => {
    if (!name) return '';
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  };

  // Hàm tìm bảng
  const findTable = async (tableNames: string[]) => {
    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1);
        if (!error) {
          console.log(`✅ Tìm thấy bảng: "${tableName}"`);
          return tableName;
        }
      } catch (e) {}
    }
    return null;
  };

  // Hàm lấy danh sách chủng loại
  const loadChungLoai = async () => {
    try {
      const now = Date.now();
      if (chungLoaiCache && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('📦 Sử dụng cache chủng loại, số lượng:', chungLoaiCache.length);
        return chungLoaiCache;
      }

      const tableNames = ['chung_loai', 'ChungLoai', 'chungloai', 'category', 'categories'];
      const tableName = await findTable(tableNames);
      if (!tableName) {
        console.log('⚠️ Không tìm thấy bảng chủng loại');
        return [];
      }

      const { data, error } = await supabase.from(tableName).select('*');
      if (error) return [];

      chungLoaiCache = data || [];
      cacheTimestamp = now;
      console.log(`✅ Đã tải ${chungLoaiCache.length} chủng loại`);
      return chungLoaiCache;
    } catch (error) {
      console.error('❌ Lỗi tải chủng loại:', error);
      return [];
    }
  };

  // Hàm lấy giá mặc định theo tên dao
  const getDefaultPrice = (tenDao: string): number => {
    const daoName = tenDao.toLowerCase();
    
    // Insert (mảnh cắt)
    if (daoName.includes('insert') || daoName.includes('rpmt')) return 115000;
    if (daoName.includes('somt')) return 180000;
    if (daoName.includes('apmt')) return 120000;
    if (daoName.includes('ccmt')) return 120000;
    if (daoName.includes('tnmg')) return 130000;
    if (daoName.includes('cnmg')) return 140000;
    if (daoName.includes('dnmg')) return 150000;
    if (daoName.includes('dcmt')) return 110000;
    if (daoName.includes('hnpj')) return 200000;
    if (daoName.includes('wcmt')) return 100000;
    if (daoName.includes('mgmn')) return 110000;
    if (daoName.includes('tpgh')) return 160000;
    
    // Taro
    if (daoName.includes('taro') && daoName.includes('m10')) return 250000;
    if (daoName.includes('taro') && daoName.includes('m6')) return 180000;
    if (daoName.includes('taro') && daoName.includes('m12')) return 300000;
    if (daoName.includes('taro') && daoName.includes('m8')) return 200000;
    if (daoName.includes('taro')) return 200000;
    
    // Mũi khoan
    if (daoName.includes('mũi khoan') || daoName.includes('mui khoan')) {
      const size = daoName.match(/\d+(\.\d+)?/);
      if (size) {
        const s = parseFloat(size[0]);
        if (s <= 5) return 150000;
        if (s <= 8) return 200000;
        if (s <= 10) return 250000;
        if (s <= 12) return 300000;
        if (s <= 14) return 350000;
        if (s <= 16) return 400000;
        if (s <= 18) return 450000;
        if (s <= 22) return 550000;
        if (s <= 26) return 650000;
        if (s <= 28) return 700000;
        if (s <= 40) return 1000000;
        return 300000;
      }
      return 200000;
    }
    
    // Phay ngón
    if (daoName.includes('phay ngón') || daoName.includes('phay ngon')) {
      if (daoName.includes('12')) return 350000;
      if (daoName.includes('16')) return 450000;
      return 300000;
    }
    
    // HK (Hợp kim)
    if (daoName.includes('hk tiện')) return 120000;
    if (daoName.includes('hk phay')) return 130000;
    if (daoName.includes('hk khoan')) return 100000;
    if (daoName.includes('hk doa')) return 150000;
    if (daoName.includes('hk cắt')) return 110000;
    if (daoName.includes('hk')) return 120000;
    
    // Taro SU-SP
    if (daoName.includes('su-sp') || daoName.includes('su sp')) {
      if (daoName.includes('m16')) return 350000;
      if (daoName.includes('m10')) return 250000;
      return 280000;
    }
    
    // Dây cắt EDM
    if (daoName.includes('dây cắt') || daoName.includes('day cat')) return 50000;
    
    // Mặc định
    return 50000;
  };

  // Hàm tìm đơn giá từ chủng loại
  const findPriceInChungLoai = (tenDao: string, catalog: any[]): PriceInfo => {
    // Nếu không có dữ liệu chủng loại
    if (!catalog || catalog.length === 0) {
      return { donGia: getDefaultPrice(tenDao), donVi: 'Cái', maLoai: '' };
    }

    const daoName = tenDao.trim();
    const cleanDaoName = cleanName(daoName);

    const nameFields = ['tenLoai', 'ten_loai', 'ten', 'name'];
    const priceFields = ['gia', 'donGia', 'don_gia', 'price'];
    const unitFields = ['donVi', 'don_vi', 'unit'];
    const codeFields = ['maLoai', 'ma_loai', 'code', 'toolCode'];

    let bestMatch = null;
    let bestScore = 0;
    let matchedName = '';

    for (const item of catalog) {
      let itemName = '';
      for (const field of nameFields) {
        if (item[field]) {
          itemName = String(item[field]);
          break;
        }
      }
      if (!itemName) continue;

      const cleanItemName = cleanName(itemName);
      let score = 0;

      if (cleanItemName === cleanDaoName) {
        score = 100;
      } else if (cleanItemName.includes(cleanDaoName) || cleanDaoName.includes(cleanItemName)) {
        score = 80;
      } else {
        const words = cleanDaoName.split(' ');
        let matchCount = 0;
        for (const word of words) {
          if (word.length > 2 && cleanItemName.includes(word)) matchCount++;
        }
        score = Math.min(70, matchCount * 20);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
        matchedName = itemName;
      }
    }

    if (bestMatch && bestScore >= 40) {
      let gia = 0;
      for (const field of priceFields) {
        const val = bestMatch[field];
        if (val !== undefined && val !== null) {
          gia = Number(val) || 0;
          break;
        }
      }

      let donVi = 'Cái';
      for (const field of unitFields) {
        if (bestMatch[field]) {
          donVi = String(bestMatch[field]);
          break;
        }
      }

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

    const defaultPrice = getDefaultPrice(tenDao);
    console.log(`⚠️ Không tìm thấy cho "${tenDao}", dùng mặc định: ${defaultPrice}`);
    return { donGia: defaultPrice, donVi: 'Cái', maLoai: '' };
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
        } else if (Array.isArray(val) && val.length > 0) {
          toolData = val;
          break;
        }
      }
    }
    return Array.isArray(toolData) ? toolData : [];
  };

  // State
  const [dataWithPrices, setDataWithPrices] = useState<DamageRow[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // Xử lý dữ liệu chính
  const rawData: DamageRow[] = useMemo(() => {
    const result: DamageRow[] = [];
    reports.forEach((r) => {
      const toolEntries = parseToolEntries(r);
      if (toolEntries && toolEntries.length > 0) {
        toolEntries.forEach((t: any) => {
          const hong = getValue(t, ['hong', 'broken', 'damaged'], 0);
          if (hong > 0) {
            const tenDao = getValue(t, ['tenDao', 'ten_dao', 'toolName', 'name', 'ten'], '---');
            const donGia = getValue(t, ['donGia', 'don_gia', 'price', 'unitPrice', 'dongia'], 0);
            
            result.push({
              ngay: formatDate(r.ngayThang),
              may: r.maySanXuat || '---',
              maDuAn: r.duAn || '---',
              tenDao: tenDao,
              hong: hong,
              donGia: donGia,
              thietHai: hong * donGia,
              nguoiVanHanh: r.nguoiVanHanh || '---',
            });
          }
        });
      }
    });
    return result;
  }, [reports]);

  // Cập nhật đơn giá từ chủng loại
  useEffect(() => {
    const updatePrices = async () => {
      if (rawData.length === 0) {
        setDataWithPrices([]);
        return;
      }

      setIsLoadingPrices(true);
      try {
        const catalog = await loadChungLoai();
        console.log('📦 Catalog loaded:', catalog.length);

        const updated = rawData.map((row) => {
          // Nếu đã có đơn giá > 0 thì giữ nguyên
          if (row.donGia > 0) {
            return row;
          }

          // Tìm đơn giá từ chủng loại
          const priceInfo = findPriceInChungLoai(row.tenDao, catalog);
          const newDonGia = priceInfo.donGia || 0;
          const newThietHai = row.hong * newDonGia;

          console.log(`💰 Cập nhật "${row.tenDao}": ${row.donGia} -> ${newDonGia} (SL hỏng: ${row.hong})`);
          
          return {
            ...row,
            donGia: newDonGia,
            thietHai: newThietHai,
          };
        });

        setDataWithPrices(updated);
      } catch (error) {
        console.error('❌ Lỗi cập nhật đơn giá:', error);
        setDataWithPrices(rawData);
      } finally {
        setIsLoadingPrices(false);
      }
    };

    updatePrices();
  }, [rawData]);

  const columns: Column<DamageRow>[] = [
    { key: 'ngay', header: 'Ngày' },
    { key: 'may', header: 'Máy' },
    { key: 'maDuAn', header: 'Dự án' },
    { key: 'tenDao', header: 'Dao cụ', className: 'font-medium' },
    {
      key: 'hong',
      header: 'SL hỏng',
      align: 'center',
      render: (row) => <span className="text-red-600 font-bold">{row.hong}</span>,
    },
    {
      key: 'donGia',
      header: 'Đơn giá',
      align: 'right',
      render: (row) => {
        if (isLoadingPrices && row.donGia === 0) {
          return <span className="text-gray-400">Đang tải...</span>;
        }
        if (row.donGia === 0) {
          return <span className="text-gray-400 text-sm">Chưa có</span>;
        }
        return <span className="text-blue-600">{formatCurrency(row.donGia)}</span>;
      },
    },
    {
      key: 'thietHai',
      header: 'Thiệt hại',
      align: 'right',
      render: (row) => {
        if (isLoadingPrices && row.thietHai === 0) {
          return <span className="text-gray-400">Đang tải...</span>;
        }
        if (row.thietHai === 0) {
          return <span className="text-gray-400 text-sm">0 đ</span>;
        }
        return <span className="text-red-600 font-bold">{formatCurrency(row.thietHai)}</span>;
      },
    },
  ];

  const totalDamage = dataWithPrices.reduce((sum, item) => sum + (item.thietHai || 0), 0);
  const totalItems = dataWithPrices.length;

  const summary = (
    <div className="flex gap-4 flex-wrap">
      <div className="px-3 py-1 bg-blue-50 rounded-lg text-sm">
        <span className="text-gray-600">Số loại dao hỏng:</span>
        <span className="ml-2 font-bold text-blue-600">{totalItems}</span>
      </div>
      <div className="px-3 py-1 bg-red-50 rounded-lg text-sm">
        <span className="text-gray-600">Tổng thiệt hại:</span>
        <span className="ml-2 font-bold text-red-600">{formatCurrency(totalDamage)}</span>
      </div>
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
        title="⚠️ HAO HỤT DAO CỤ"
        description="Thống kê các dao cụ bị hỏng hóc trong quá trình sản xuất"
        searchPlaceholder="Tìm kiếm..."
        searchFields={['tenDao', 'maDuAn', 'may']}
        exportFileName="hao_hut_dao_cu"
        exportSheetName="HaoHutDaoCu"
        summary={summary}
      />
    </div>
  );
}