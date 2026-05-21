import React from 'react';
import { SimpleOilExport } from '@/components/inventory/SimpleOilExport';
import { toast } from 'sonner';

export const XuatDau: React.FC = () => {
  const handleSubmit = (transaction: any) => {
    const savedTransactions = JSON.parse(localStorage.getItem('warehouseTransactions') || '[]');
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('warehouseTransactions', JSON.stringify([newTransaction, ...savedTransactions]));
    toast.success('Đã lưu phiếu xuất dầu thành công!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Xuất Dầu</h1>
      </div>

      <SimpleOilExport onSubmit={handleSubmit} />
    </div>
  );
};