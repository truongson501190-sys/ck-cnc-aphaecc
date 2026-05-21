import React from 'react';
import { ExactLayoutWarehouseTransfer } from '@/modules/warehouse/components/ExactLayoutWarehouseTransfer';
import { toast } from 'sonner';
import { postStockDocument } from '@/api/stock';
import type { WarehouseTransaction } from '@/types/inventory';
import { useQueryClient } from '@tanstack/react-query';

export const ChuyenKho: React.FC = () => {
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
      toast.success('Đã ghi sổ chuyển kho (TRANSFER_OUT + TRANSFER_IN)');
    } else {
      toast.error('Ghi sổ thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Chuyển Kho</h1>
      <ExactLayoutWarehouseTransfer onSubmit={handleSubmit} />
    </div>
  );
};
