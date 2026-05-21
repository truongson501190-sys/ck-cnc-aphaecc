import React from 'react';
import { ExactLayoutWarehouseExport } from '@/modules/warehouse/components/ExactLayoutWarehouseExport';
import { toast } from 'sonner';
import { postStockDocument } from '@/api/stock';
import type { WarehouseTransaction } from '@/types/inventory';
import { useQueryClient } from '@tanstack/react-query';

export const XuatKho: React.FC = () => {
  const queryClient = useQueryClient();

  const handleSubmit = async (
    transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>
  ) => {
    const { ok } = await postStockDocument({
      ...transaction,
      status: 'approved',
    } as WarehouseTransaction);
    if (ok) {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Đã ghi sổ xuất kho (stock_ledger)');
    } else {
      toast.error('Ghi sổ thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Xuất Kho</h1>
      <ExactLayoutWarehouseExport onSubmit={handleSubmit} />
    </div>
  );
};
