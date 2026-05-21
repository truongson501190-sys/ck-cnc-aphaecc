import React from 'react';
import { ExactLayoutWarehouseImport } from '@/modules/warehouse/components/ExactLayoutWarehouseImport';
import { toast } from 'sonner';
import { postStockDocument } from '@/api/stock';
import type { WarehouseTransaction } from '@/types/inventory';
import { useQueryClient } from '@tanstack/react-query';

export const NhapKho: React.FC = () => {
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
      toast.success('Đã ghi sổ nhập kho (stock_ledger)');
    } else {
      toast.error('Ghi sổ thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Nhập Kho</h1>
      <ExactLayoutWarehouseImport onSubmit={handleSubmit} />
    </div>
  );
};
