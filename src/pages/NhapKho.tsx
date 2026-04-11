import React from 'react';
import { ExactLayoutWarehouseImport } from '@/components/inventory/ExactLayoutWarehouseImport';
import { toast } from 'sonner';

export const NhapKho: React.FC = () => {
  const handleSubmit = (transaction: any) => {
    const savedTransactions = JSON.parse(localStorage.getItem('warehouseTransactions') || '[]');
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('warehouseTransactions', JSON.stringify([newTransaction, ...savedTransactions]));
    toast.success('Đã lưu phiếu nhập kho thành công!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Nhập Kho</h1>
      </div>

      <ExactLayoutWarehouseImport onSubmit={handleSubmit} />
    </div>
  );
};