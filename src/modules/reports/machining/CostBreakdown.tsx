// src/modules/reports/machining/CostBreakdown.tsx
import { useMemo, useState, useEffect } from 'react';
import { useProductionReports } from '@/hooks/useProductionReports';
import { ReportTable, Column } from '@/components/ReportTable';
import { supabase } from '@/supabase';

interface CostRow {
  id: string;
  ngay: string;
  may: string;
  ca: string;
  caMay: string;
  donGia: number;
  maDuAn: string;
  soLuong: number;
  totalSetupHours: number;
  totalWorkHours: number;
  nguoiVanHanh: string;
  chiPhiChayMay: number;
  chiPhiGa: number;
  chiPhiDao: number;
  tongChiPhi: number;
}

interface PriceInfo {
  donGia: number;
  donVi: string;
  maLoai: string;
}

// Cache
let machineCache: any[] | null = null;
let chungLoaiCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export function CostBreakdown() {
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

  // ==================== HÀM TIỆN ÍCH ====================
  
  const cleanName = (name: string): string => {
    if (!name) return '';
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  };

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

  const loadMachines = async () => {
    try {
      const now = Date.now();
      if (machineCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return machineCache;
      }

      const tableNames = ['may', 'May', 'machine', 'machines', 'danh_sach_may'];
      const tableName = await findTable(tableNames);
      if (!tableName) return [];

      const { data, error } = await supabase.from(tableName).select('*');
      if (error) return [];

      machineCache = data || [];
      cacheTimestamp = now;
      console.log(`✅ Đã tải ${machineCache.length} máy`);
      return machineCache;
    } catch (error) {
      return [];
    }
  };

  const loadChungLoai = async () => {
    try {
      const now = Date.now();
      if (chungLoaiCache && (now - cacheTimestamp) < CACHE_DURATION) {
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

  const getDefaultPrice = (tenDao: string): number => {
    const daoName = tenDao.toLowerCase();
    
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
    
    if (daoName.includes('taro')) {
      if (daoName.includes('m10')) return 250000;
      if (daoName.includes('m6')) return 180000;
      if (daoName.includes('m12')) return 300000;
      if (daoName.includes('m8')) return 200000;
      return 200000;
    }
    
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
    
    if (daoName.includes('phay ngón') || daoName.includes('phay ngon')) {
      if (daoName.includes('12')) return 350000;
      if (daoName.includes('16')) return 450000;
      return 300000;
    }
    
    if (daoName.includes('hk tiện')) return 120000;
    if (daoName.includes('hk phay')) return 130000;
    if (daoName.includes('hk khoan')) return 100000;
    if (daoName.includes('hk doa')) return 150000;
    if (daoName.includes('hk cắt')) return 110000;
    if (daoName.includes('hk')) return 120000;
    
    if (daoName.includes('su-sp') || daoName.includes('su sp')) {
      if (daoName.includes('m16')) return 350000;
      if (daoName.includes('m10')) return 250000;
      return 280000;
    }
    
    if (daoName.includes('dây cắt') || daoName.includes('day cat')) return 50000;
    
    return 50000;
  };

  const findPriceInChungLoai = (tenDao: string, catalog: any[]): PriceInfo => {
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

      return { donGia: gia, donVi, maLoai };
    }

    const defaultPrice = getDefaultPrice(tenDao);
    return { donGia: defaultPrice, donVi: 'Cái', maLoai: '' };
  };

  const getMachineRateByShift = (machine: any, shiftType: string): number => {
    if (!machine) return 250000;

    const shiftMap: Record<string, string> = {
      '8h/1Ca': 'gia_8h_1ca',
      '10h/1Ca': 'gia_10h_1ca',
      '12h/1Ca': 'gia_12h_1ca',
      '8h/2Ca': 'gia_8h_2ca',
      '10h/2Ca': 'gia_10h_2ca',
      '12h/2Ca': 'gia_12h_2ca',
    };

    const fieldName = shiftMap[shiftType];
    if (fieldName && machine[fieldName] !== undefined && machine[fieldName] !== null) {
      const price = Number(machine[fieldName]);
      if (price > 0) return price;
    }

    if (machine.gia_8h_1ca && machine.gia_8h_1ca > 0) {
      return machine.gia_8h_1ca;
    }

    return 250000;
  };

  const findMachineByName = (tenMay: string, machines: any[]): any => {
    if (!tenMay || !machines || machines.length === 0) return null;

    const mayName = tenMay.trim();
    const cleanMayName = cleanName(mayName);

    let bestMatch = null;
    let bestScore = 0;

    for (const machine of machines) {
      const itemName = machine.tenMay || machine.ten_may || machine.ten || machine.name || '';
      if (!itemName) continue;

      const cleanItemName = cleanName(itemName);
      let score = 0;

      if (cleanItemName === cleanMayName) {
        score = 100;
      } else if (cleanItemName.includes(cleanMayName) || cleanMayName.includes(cleanItemName)) {
        score = 80;
      } else {
        const words = cleanMayName.split(' ');
        let matchCount = 0;
        for (const word of words) {
          if (word.length > 2 && cleanItemName.includes(word)) {
            matchCount++;
          }
        }
        score = Math.min(70, matchCount * 20);
      }

      const machineCode = machine.maMay || machine.ma_may || machine.code || '';
      if (machineCode && cleanMayName.includes(cleanName(machineCode))) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = machine;
      }
    }

    return bestMatch && bestScore >= 40 ? bestMatch : null;
  };

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

  // ==================== PARSE TOOL ENTRIES ====================
  
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

  // ==================== TÍNH GIỜ ====================
  
  const calculateHoursFromTime = (start: string, end: string) => {
    if (!start || !end) return 0;
    try {
      const startDate = new Date(`2000-01-01T${start}`);
      let endDate = new Date(`2000-01-01T${end}`);
      if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
      return Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    } catch (e) {
      return 0;
    }
  };

  const formatTimeForCalculation = (timeVal: any) => {
    if (!timeVal) return '';
    if (typeof timeVal === 'number') {
      const totalMinutes = timeVal * 24 * 60;
      let hours = Math.floor(totalMinutes / 60);
      let minutes = Math.round(totalMinutes % 60);
      if (minutes === 60) { minutes = 0; hours += 1; }
      hours = hours % 24;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    const timeStr = String(timeVal).trim();
    if (!timeStr) return '';
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) return timeStr;
    const hhmmMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmmMatch) {
      let hours = parseInt(hhmmMatch[1]);
      let minutes = parseInt(hhmmMatch[2]);
      hours = Math.max(0, Math.min(23, hours));
      minutes = Math.max(0, Math.min(59, minutes));
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return '';
  };

  const getTotalSetupHours = (report: any) => {
    const setupHours = getValue(report, ['gio_ga', 'gioGa', 'soGioGia', 'so_gio_ga']);
    if (setupHours > 0) return setupHours;
    const setupEntries = getValue(report, ['setup_time_entries', 'setupTimeEntries'], []);
    if (Array.isArray(setupEntries) && setupEntries.length > 0) {
      return setupEntries.reduce((sum: number, entry: any) => {
        let hours = getValue(entry, ['soGio', 'hours', 'so_gio'], 0);
        if (!hours) {
          const start = formatTimeForCalculation(getValue(entry, ['thoiGianBatDau', 'start', 'thoi_gian_bat_dau'], ''));
          const end = formatTimeForCalculation(getValue(entry, ['thoiGianKetThuc', 'end', 'thoi_gian_ket_thuc'], ''));
          hours = calculateHoursFromTime(start, end);
        }
        return sum + (typeof hours === 'number' ? hours : parseFloat(hours) || 0);
      }, 0);
    }
    return 0;
  };

  const getTotalWorkHours = (report: any) => {
    const workHours = getValue(report, ['gio_chay', 'gioChay', 'soGioChay', 'so_gio_chay']);
    if (workHours > 0) return workHours;
    const workEntries = getValue(report, ['work_time_entries', 'workTimeEntries'], []);
    if (Array.isArray(workEntries) && workEntries.length > 0) {
      return workEntries.reduce((sum: number, entry: any) => {
        let hours = getValue(entry, ['soGio', 'hours', 'so_gio'], 0);
        if (!hours) {
          const start = formatTimeForCalculation(getValue(entry, ['thoiGianBatDau', 'start', 'thoi_gian_bat_dau'], ''));
          const end = formatTimeForCalculation(getValue(entry, ['thoiGianKetThuc', 'end', 'thoi_gian_ket_thuc'], ''));
          hours = calculateHoursFromTime(start, end);
        }
        return sum + (typeof hours === 'number' ? hours : parseFloat(hours) || 0);
      }, 0);
    }
    return 0;
  };

  // ==================== TÍNH CA MÁY ====================
  
  // QUAN TRỌNG: Tính Ca máy dựa trên TỔNG GIỜ của MÁY trong CẢ NGÀY
  const getMachineShiftForDay = (reports: any[]): string => {
    let totalHours = 0;
    
    reports.forEach((report) => {
      const setupHours = getTotalSetupHours(report);
      const workHours = getTotalWorkHours(report);
      totalHours += setupHours + workHours;
    });
    
    if (totalHours <= 8) return '8h/1Ca';
    if (totalHours <= 10) return '10h/1Ca';
    if (totalHours <= 12) return '12h/1Ca';
    if (totalHours <= 16) return '8h/2Ca';
    if (totalHours <= 20) return '10h/2Ca';
    if (totalHours <= 24) return '12h/2Ca';
    return `${Math.round(totalHours)}h/${Math.ceil(totalHours / 8)}Ca`;
  };

  // ==================== TÍNH CP DAO ====================
  
  const calculateToolCost = (report: any, catalog: any[]): number => {
    const existingCost = getValue(report, [
      'chi_phi_dao', 'chiPhiDao', 'cpDaoCu', 'cp_dao',
      'toolCost', 'tool_cost', 'daoCost', 'dao_cost'
    ]);
    if (existingCost > 0) return existingCost;

    const toolEntries = parseToolEntries(report);
    if (toolEntries.length === 0) return 0;

    let totalCost = 0;
    for (const t of toolEntries) {
      const tenDao = getValue(t, ['tenDao', 'ten_dao', 'toolName', 'name', 'ten'], '');
      const slSuDung = getValue(t, ['slSuDung', 'sl_su_dung', 'quantityUsed', 'used'], 0);
      
      if (!tenDao || slSuDung === 0) continue;
      
      let donGia = getValue(t, ['donGia', 'don_gia', 'price', 'unitPrice', 'dongia'], 0);
      
      if (donGia === 0 && catalog) {
        const priceInfo = findPriceInChungLoai(tenDao, catalog);
        donGia = priceInfo.donGia || 0;
      }
      
      const thanhTien = donGia > 0 && slSuDung > 0 ? donGia * slSuDung : 0;
      totalCost += thanhTien;
    }

    return totalCost;
  };

  // ==================== STATE ====================
  
  const [dataWithPrices, setDataWithPrices] = useState<CostRow[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // ==================== XỬ LÝ DỮ LIỆU CHÍNH ====================
  
  // src/modules/reports/machining/CostBreakdown.tsx

// ==================== XỬ LÝ DỮ LIỆU CHÍNH ====================
  
const rawData = useMemo(() => {
  // Bước 1: Group theo ngày + máy để tính Ca máy
  const dayMachineGroups: Record<string, any[]> = {};
  
  reports.forEach((r) => {
    const report = r as any;
    const key = `${report.ngayThang}_${report.maySanXuat}`;
    if (!dayMachineGroups[key]) {
      dayMachineGroups[key] = [];
    }
    dayMachineGroups[key].push(report);
  });

  // Bước 2: Tính Ca máy cho từng group (dựa trên tổng giờ cả ngày)
  const shiftMap: Record<string, string> = {};
  Object.entries(dayMachineGroups).forEach(([key, groupReports]) => {
    shiftMap[key] = getMachineShiftForDay(groupReports);
  });

  // Bước 3: Group chi tiết theo MÁY + DỰ ÁN + CA (KHÔNG theo người)
  const detailGroups: Record<string, any> = {};
  
  reports.forEach((r) => {
    const report = r as any;
    const dayKey = `${report.ngayThang}_${report.maySanXuat}`;
    const caMay = shiftMap[dayKey] || '8h/1Ca';
    
    // Key: ngày + máy + dự án + ca
    const detailKey = `${report.ngayThang}_${report.maySanXuat}_${report.duAn}_${report.ca}`;
    
    if (!detailGroups[detailKey]) {
      detailGroups[detailKey] = {
        id: report.id,
        ngay: formatDate(report.ngayThang),
        may: report.maySanXuat || '---',
        ca: report.ca || 'Ngày',
        caMay: caMay,
        maDuAn: report.duAn || '---',
        soLuong: 0,
        totalSetupHours: 0,
        totalWorkHours: 0,
        nguoiVanHanh: [],
        reports: [],
      };
    }
    
    // Cộng dồn
    detailGroups[detailKey].soLuong += (report.soLuongHoanThanh || 0);
    detailGroups[detailKey].totalSetupHours += getTotalSetupHours(report);
    detailGroups[detailKey].totalWorkHours += getTotalWorkHours(report);
    
    // Thêm người vận hành (nếu chưa có)
    if (report.nguoiVanHanh) {
      const nv = report.nguoiVanHanh.trim();
      if (nv && !detailGroups[detailKey].nguoiVanHanh.includes(nv)) {
        detailGroups[detailKey].nguoiVanHanh.push(nv);
      }
    }
    
    detailGroups[detailKey].reports.push(report);
  });

  // Bước 4: Chuyển thành array và SẮP XẾP
  const result: any[] = [];
  Object.values(detailGroups).forEach((group) => {
    const nguoiVanHanh = group.nguoiVanHanh.join(', ') || 'Chưa có';
    
    result.push({
      ...group,
      nguoiVanHanh: nguoiVanHanh,
      donGia: 0,
      chiPhiChayMay: 0,
      chiPhiGa: 0,
      chiPhiDao: 0,
      tongChiPhi: 0,
      totalHours: group.totalSetupHours + group.totalWorkHours,
    });
  });

  // ========== SẮP XẾP THEO NGÀY (MỚI NHẤT LÊN ĐẦU) + MÁY (A→Z) ==========
  result.sort((a, b) => {
    // 1. Sắp xếp theo ngày (giảm dần - mới nhất lên đầu)
    // Chuyển định dạng DD/MM/YYYY thành Date để so sánh
    const dateA = new Date(a.ngay.split('/').reverse().join('/'));
    const dateB = new Date(b.ngay.split('/').reverse().join('/'));
    
    if (dateA > dateB) return -1;  // Ngày mới hơn lên trước
    if (dateA < dateB) return 1;   // Ngày cũ hơn xuống sau
    
    // 2. Nếu cùng ngày, sắp xếp theo tên máy (A → Z)
    return a.may.localeCompare(b.may);
  });
  
  console.log(`📊 Số dòng sau khi gộp: ${result.length}`);
  return result;
}, [reports]);

  // ==================== CẬP NHẬT GIÁ ====================
  
  useEffect(() => {
    const updatePrices = async () => {
      if (rawData.length === 0) {
        setDataWithPrices([]);
        return;
      }

      setIsLoadingPrices(true);
      try {
        const [machines, chungLoai] = await Promise.all([
          loadMachines(),
          loadChungLoai()
        ]);

        const updated = rawData.map((row) => {
          const machine = findMachineByName(row.may, machines);
          const donGia = machine ? getMachineRateByShift(machine, row.caMay) : 250000;

          const chiPhiChayMay = row.totalHours > 0 ? row.totalHours * donGia : 0;

          let chiPhiGa = 0;
          if (donGia > 0 && row.totalSetupHours > 0) {
            chiPhiGa = (donGia / 2) * row.totalSetupHours;
          }

          let totalChiPhiDao = 0;
          if (row.reports && Array.isArray(row.reports)) {
            row.reports.forEach((report: any) => {
              totalChiPhiDao += calculateToolCost(report, chungLoai);
            });
          }

          return {
            ...row,
            donGia,
            chiPhiChayMay,
            chiPhiGa,
            chiPhiDao: totalChiPhiDao,
            tongChiPhi: chiPhiChayMay + chiPhiGa + totalChiPhiDao,
          };
        });

        setDataWithPrices(updated);
      } catch (error) {
        console.error('❌ Lỗi cập nhật giá:', error);
      } finally {
        setIsLoadingPrices(false);
      }
    };

    updatePrices();
  }, [rawData]);

  // ==================== HÀM TÍNH SUMMARY THEO DỮ LIỆU ĐÃ LỌC ====================
  
  const getSummary = (data: CostRow[]) => {
    const totalRunCost = data.reduce((sum, item) => sum + (item.chiPhiChayMay || 0), 0);
    const totalSetupCost = data.reduce((sum, item) => sum + (item.chiPhiGa || 0), 0);
    const totalToolCost = data.reduce((sum, item) => sum + (item.chiPhiDao || 0), 0);
    const totalCost = data.reduce((sum, item) => sum + (item.tongChiPhi || 0), 0);

    return (
      <div className="flex gap-3 flex-wrap">
        <div className="px-3 py-1 bg-blue-50 rounded-lg text-sm">
          <span className="text-gray-600">CP chạy máy:</span>
          <span className="ml-1 font-bold text-blue-600">{formatCurrency(totalRunCost)}</span>
        </div>
        <div className="px-3 py-1 bg-amber-50 rounded-lg text-sm">
          <span className="text-gray-600">CP gá:</span>
          <span className="ml-1 font-bold text-amber-600">{formatCurrency(totalSetupCost)}</span>
        </div>
        <div className="px-3 py-1 bg-emerald-50 rounded-lg text-sm">
          <span className="text-gray-600">CP dao:</span>
          <span className="ml-1 font-bold text-emerald-600">{formatCurrency(totalToolCost)}</span>
        </div>
        <div className="px-3 py-1 bg-red-50 rounded-lg text-sm">
          <span className="text-gray-600">Tổng CP:</span>
          <span className="ml-1 font-bold text-red-600">{formatCurrency(totalCost)}</span>
        </div>
        {isLoadingPrices && (
          <div className="px-3 py-1 bg-yellow-50 rounded-lg text-sm">
            <span className="text-yellow-600">⏳ Đang tải đơn giá...</span>
          </div>
        )}
      </div>
    );
  };

  // ==================== COLUMNS ====================
  
 // ==================== COLUMNS ====================
  
const columns: Column<CostRow>[] = [
  { key: 'ngay', header: 'Ngày' },
  { key: 'may', header: 'Máy' },
  { key: 'ca', header: 'Ca làm việc', align: 'center' },
  {
    key: 'caMay',
    header: 'Ca máy',
    align: 'center',
    render: (row: CostRow) => <span className="font-mono font-semibold text-purple-600">{row.caMay}</span>
  },
  { key: 'maDuAn', header: 'Mã dự án' },
  {
    key: 'soLuong',
    header: 'SL',
    align: 'center',
    render: (row: CostRow) => (row as any).soLuong || 0
  },
  {
    key: 'totalSetupHours',
    header: 'Tổng giờ gá',
    align: 'center',
    render: (row: CostRow) => `${(row as any).totalSetupHours?.toFixed(1) || 0}h`
  },
  {
    key: 'totalWorkHours',
    header: 'Tổng giờ chạy',
    align: 'center',
    render: (row: CostRow) => `${(row as any).totalWorkHours?.toFixed(1) || 0}h`
  },
  { 
    key: 'nguoiVanHanh', 
    header: 'NV vận hành',
    render: (row: CostRow) => (row as any).nguoiVanHanh || '---'
  },
  {
    key: 'donGia',
    header: 'Đơn giá máy',
    align: 'right',
    render: (row: CostRow) => <span className="font-mono text-gray-600">{formatCurrency(row.donGia)}/h</span>
  },
  {
    key: 'chiPhiChayMay',
    header: 'CP chạy máy',
    align: 'right',
    render: (row: CostRow) => <span className="text-blue-600">{formatCurrency(row.chiPhiChayMay)}</span>
  },
  {
    key: 'chiPhiGa',
    header: 'CP gá',
    align: 'right',
    render: (row: CostRow) => <span className="text-amber-600">{formatCurrency(row.chiPhiGa)}</span>
  },
  {
    key: 'chiPhiDao',
    header: 'CP dao',
    align: 'right',
    render: (row: CostRow) => {
      if (isLoadingPrices) return <span className="text-gray-400">⏳ Đang tải...</span>;
      if (row.chiPhiDao === 0) return <span className="text-gray-400 text-sm">Chưa có</span>;
      return <span className="text-emerald-600 font-bold">{formatCurrency(row.chiPhiDao)}</span>;
    }
  },
  {
    key: 'tongChiPhi',
    header: 'Tổng CP',
    align: 'right',
    render: (row: CostRow) => <span className="text-red-600 font-bold">{formatCurrency(row.tongChiPhi)}</span>
  },
];

  // ==================== RENDER ====================
  
  return (
    <div className="p-6">
      <ReportTable
        data={dataWithPrices}
        columns={columns}
        isLoading={isLoading || isLoadingPrices}
        title="💰 CHI PHÍ GIA CÔNG"
        description="Phân tích chi tiết các khoản chi phí sản xuất"
        searchPlaceholder="Tìm kiếm theo mã dự án, tên máy..."
        searchFields={['maDuAn', 'may']}  // ← Tìm kiếm theo mã dự án + tên máy
        exportFileName="chi_phi_gia_cong"
        exportSheetName="ChiPhiGiaCong"
        summary={getSummary}  // ← Truyền hàm để tự động cập nhật
      />
    </div>
  );
}