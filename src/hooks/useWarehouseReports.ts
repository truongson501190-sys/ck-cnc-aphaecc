// src/hooks/useWarehouseReports.ts
import { useState, useEffect, useCallback } from 'react';
import { warehouseEntries } from '@/modules/reports/mock/warehouseReportData';

export interface WarehouseEntry {
  id: string;
  date: string;
  type: 'in' | 'out' | 'transfer' | 'oil';
  warehouse: string;
  material: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  reference?: string;
}

export function useWarehouseReports() {
  const [reports, setReports] = useState<WarehouseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Giả lập async (sau này thay bằng supabase)
      await new Promise((resolve) => setTimeout(resolve, 300));
      setReports(warehouseEntries);
    } catch (error) {
      console.error('Error loading warehouse reports:', error);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { reports, isLoading, reload: loadData };
}