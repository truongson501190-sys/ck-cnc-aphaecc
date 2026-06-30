import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WarehouseTransaction } from '@/types/inventory';

interface SimpleOilExportProps {
  onSubmit: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void;
}

export function SimpleOilExport({ onSubmit }: SimpleOilExportProps) {
  const [product, setProduct] = React.useState('');
  const [quantity, setQuantity] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      type: 'oil_export',
      itemName: product,
      quantity: parseFloat(quantity) || 0,
      unit: 'L',
      price: 0,
      totalValue: 0,
      referenceNumber: `XDO-${Date.now()}`,
      status: 'pending',
      transactionDate: new Date().toISOString().split('T')[0],
      notes,
    });
    setProduct('');
    setQuantity('');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Sản phẩm</Label>
        <Input value={product} onChange={(e) => setProduct(e.target.value)} required />
      </div>
      <div>
        <Label>Số lượng</Label>
        <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </div>
      <div>
        <Label>Ghi chú</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit">Lưu phiếu xuất dầu</Button>
    </form>
  );
}
