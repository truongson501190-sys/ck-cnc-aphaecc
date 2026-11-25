import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { listMovements, type LedgerRow } from '@/api/stockLedger';
import { getWarehouses } from '@/api/warehouse';

const TYPE_LABEL: Record<string, string> = {
  IN: 'Nhập', OUT: 'Xuất', OIL_OUT: 'Xuất dầu',
  TRANSFER_IN: 'Chuyển đến', TRANSFER_OUT: 'Chuyển đi',
  ADJUSTMENT: 'Điều chỉnh',
};

export default function TransactionHistory() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [movementType, setMovementType] = useState('');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const w = await getWarehouses();
      if (w.ok) setWarehouses(w.data);
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listMovements({
        warehouseId: warehouseId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        movementTypes: movementType ? [movementType] : undefined,
        limit: 500,
      });
      if (!res.ok) { toast.error(res.error); return; }
      setRows(res.data.reverse()); // mới nhất trước
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Lịch sử giao dịch</h1>

      <div className="border rounded p-3 grid grid-cols-5 gap-2">
        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="border rounded p-2">
          <option value="">— Tất cả kho —</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
        </select>
        <select value={movementType} onChange={e => setMovementType(e.target.value)} className="border rounded p-2">
          <option value="">— Tất cả loại —</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border rounded p-2" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border rounded p-2" />
        <button onClick={load} disabled={loading} className="bg-blue-600 text-white rounded px-3">
          {loading ? 'Đang tải…' : 'Lọc'}
        </button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Thời gian</th>
            <th className="p-2 text-left">Loại</th>
            <th className="p-2 text-left">Kho</th>
            <th className="p-2 text-left">Sản phẩm</th>
            <th className="p-2 text-right">±</th>
            <th className="p-2 text-left">Người tạo</th>
            <th className="p-2 text-left">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="p-4 text-center text-gray-500">Không có giao dịch</td></tr>
          )}
          {rows.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{new Date(r.occurred_at).toLocaleString('vi-VN')}</td>
              <td className="p-2">{TYPE_LABEL[r.movement_type] ?? r.movement_type}</td>
              <td className="p-2 text-xs">{r.warehouse_id}</td>
              <td className="p-2 text-xs">{r.product_id}</td>
              <td className={`p-2 text-right font-medium ${
                r.qty_delta > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {r.qty_delta > 0 ? '+' : ''}{r.qty_delta}
              </td>
              <td className="p-2 text-xs">{r.created_by ?? '—'}</td>
              <td className="p-2 text-xs text-gray-600">{r.notes ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}