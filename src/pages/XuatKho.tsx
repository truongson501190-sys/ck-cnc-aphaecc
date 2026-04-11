import React from 'react';
import { ExactLayoutWarehouseExport } from '@/components/inventory/ExactLayoutWarehouseExport';
import { toast } from 'sonner';

export const XuatKho: React.FC = () => {
  const handleSubmit = (transaction: any) => {
    const savedTransactions = JSON.parse(localStorage.getItem('warehouseTransactions') || '[]');
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('warehouseTransactions', JSON.stringify([newTransaction, ...savedTransactions]));
    toast.success('Đã lưu phiếu xuất kho thành công!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Xuất Kho</h1>
      </div>

      <ExactLayoutWarehouseExport onSubmit={handleSubmit} />
    </div>
  );
};