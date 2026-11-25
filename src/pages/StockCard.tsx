import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getStockCard, type LedgerRow } from '@/api/stockLedger';
import { getWarehouses, getProducts } from '@/api/warehouse';

const TYPE_LABEL: Record<string, string> = {
  IN: 'Nhập',
  OUT: 'Xuất',
  OIL_OUT: 'Xuất dầu',
  TRANSFER_IN: 'Chuyển đến',
  TRANSFER_OUT: 'Chuyển đi',
  ADJUSTMENT: 'Điều chỉnh',
};

export default function StockCard() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState<(LedgerRow & { running_qty: number })[]>([]);
  const [opening, setOpening] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [w, p] = await Promise.all([getWarehouses(), getProducts()]);
      if (w.ok) setWarehouses(w.data);
      if (p.ok) setProducts(p.data);
    })();
  }, []);

  const load = async () => {
    if (!warehouseId || !productId) {
      toast.error('Chọn kho và sản phẩm');
      return;
    }
    setLoading(true);
    try {
      const res = await getStockCard({ warehouseId, productId, fromDate, toDate });
      if (!res.ok) { toast.error(res.error); return; }
      setRows(res.rows);
      setOpening(res.opening);
    } finally {
      setLoading(false);
    }
  };

  const totalIn = rows.filter(r => r.qty_delta > 0).reduce((s, r) => s + Number(r.qty_delta), 0);
  const totalOut = rows.filter(r => r.qty_delta < 0).reduce((s, r) => s + Math.abs(Number(r.qty_delta)), 0);
  const closing = rows.length > 0 ? rows[rows.length - 1].running_qty : opening;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Thẻ kho</h1>

      <div className="border rounded p-3 grid grid-cols-5 gap-2">
        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="border rounded p-2">
          <option value="">— Kho —</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
        </select>
        <select value={productId} onChange={e => setProductId(e.target.value)} className="border rounded p-2">
          <option value="">— Sản phẩm —</option>
          {products.map(p => <option key={p.id} value={p.ma_dao ?? p.id}>{p.ten_dao}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border rounded p-2" placeholder="Từ ngày" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border rounded p-2" placeholder="Đến ngày" />
        <button onClick={load} disabled={loading} className="bg-blue-600 text-white rounded px-3">
          {loading ? 'Đang tải…' : 'Xem'}
        </button>
      </div>

      <div className="flex gap-4 text-sm">
        <span>Tồn đầu: <b>{opening}</b></span>
        <span className="text-green-600">Nhập: <b>+{totalIn}</b></span>
        <span className="text-red-600">Xuất: <b>-{totalOut}</b></span>
        <span>Tồn cuối: <b>{closing}</b></span>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Ngày</th>
            <th className="p-2 text-left">Loại</th>
            <th className="p-2 text-left">Chứng từ</th>
            <th className="p-2 text-left">Ghi chú</th>
            <th className="p-2 text-right">Nhập</th>
            <th className="p-2 text-right">Xuất</th>
            <th className="p-2 text-right">Tồn</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="p-4 text-center text-gray-500">Chưa có giao dịch</td></tr>
          )}
          {rows.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{new Date(r.occurred_at).toLocaleString('vi-VN')}</td>
              <td className="p-2">{TYPE_LABEL[r.movement_type] ?? r.movement_type}</td>
              <td className="p-2 font-mono text-xs">{r.reference ?? r.document_id?.slice(0, 8) ?? '—'}</td>
              <td className="p-2 text-xs text-gray-600">{r.notes ?? ''}</td>
              <td className="p-2 text-right text-green-600">
                {r.qty_delta > 0 ? `+${r.qty_delta}` : ''}
              </td>
              <td className="p-2 text-right text-red-600">
                {r.qty_delta < 0 ? `${r.qty_delta}` : ''}
              </td>
              <td className="p-2 text-right font-medium">{r.running_qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}