// src/hooks/useProductionReports.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase';
import { mapReportFromDb } from '@/lib/reportSyncMapping';

export interface ProductionReport {
  id: string;
  ngayThang: string;
  maySanXuat: string;
  ca: string;
  duAn: string;
  khach_hang: string;
  tenChiTiet: string;
  soLuongHoanThanh: number;
  nguoiVanHanh: string;
  nguoiKiemTra?: string;
  toolEntries: any[];
  setup_time_entries?: any[];
  work_time_entries?: any[];
  cpMay?: number;
  cpGa?: number;
  cpDaoCu?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  // thêm các trường khác nếu cần
}

export function useProductionReports() {
  const [reports, setReports] = useState<ProductionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('production_reports')
        .select('*')
        .eq('status', 'approved')
        .order('ngayThang', { ascending: false });

      if (supabaseError) throw supabaseError;
      const mappedReports = (data || []).map((item) => mapReportFromDb('production_reports', item) as unknown as ProductionReport);
      console.log('🔍 Dữ liệu thô từ Supabase (useProductionReports):', data);
      setReports(mappedReports);
    } catch (err) {
      console.error('Error loading production reports:', err);
      setError('Không thể tải dữ liệu báo cáo sản xuất');
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();

    // Realtime subscription
    const subscription = supabase
      .channel('production_reports_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_reports' },
        () => {
          loadReports(); // Tự động reload khi có thay đổi
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadReports]);

  return { reports, isLoading, error, reload: loadReports };
}