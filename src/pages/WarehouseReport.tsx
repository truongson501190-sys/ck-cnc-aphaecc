import { useState } from 'react';
import { toast } from 'sonner';
import { getNxtReport, type NxtRow } from '@/api/stockLedger';
import { getWarehouses } from '@/api/warehouse';
import { useEffect } from 'react';

export default function WarehouseReport() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [fromDate, setFromDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<NxtRow[]>([]);
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
      const res = await getNxtReport({
        fromDate, toDate,
        warehouseId: warehouseId || undefined,
      });
      if (!res.ok) { toast.error(res.error); return; }
      setRows(res.rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // load lần đầu

  const exportCsv = () => {
    const header = 'Kho,Sản phẩm,Tồn đầu,Nhập,Xuất,Chuyển đến,Chuyển đi,Điều chỉnh,Tồn cuối\n';
    const body = rows.map(r =>
      [r.warehouse_id, r.product_id, r.opening, r.in_qty, r.out_qty,
       r.transfer_in, r.transfer_out, r.adjust, r.closing].join(',')
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `NXT_${fromDate}_${toDate}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Báo cáo Nhập - Xuất - Tồn</h1>

      <div className="border rounded p-3 grid grid-cols-4 gap-2">
        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="border rounded p-2">
          <option value="">— Tất cả kho —</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border rounded p-2" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border rounded p-2" />
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="bg-blue-600 text-white rounded px-3 flex-1">
            {loading ? '…' : 'Xem'}
          </button>
          <button onClick={exportCsv} className="bg-green-600 text-white rounded px-3">CSV</button>
        </div>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Kho</th>
            <th className="p-2 text-left">Sản phẩm</th>
            <th className="p-2 text-right">Tồn đầu</th>
            <th className="p-2 text-right">Nhập</th>
            <th className="p-2 text-right">Xuất</th>
            <th className="p-2 text-right">Chuyển đến</th>
            <th className="p-2 text-right">Chuyển đi</th>
            <th className="p-2 text-right">Điều chỉnh</th>
            <th className="p-2 text-right">Tồn cuối</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={9} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="p-2 text-xs">{r.warehouse_id}</td>
              <td className="p-2 text-xs">{r.product_id}</td>
              <td className="p-2 text-right">{r.opening}</td>
              <td className="p-2 text-right text-green-600">{r.in_qty || ''}</td>
              <td className="p-2 text-right text-red-600">{r.out_qty || ''}</td>
              <td className="p-2 text-right text-green-600">{r.transfer_in || ''}</td>
              <td className="p-2 text-right text-red-600">{r.transfer_out || ''}</td>
              <td className={`p-2 text-right ${r.adjust > 0 ? 'text-green-600' : r.adjust < 0 ? 'text-red-600' : ''}`}>
                {r.adjust > 0 ? '+' : ''}{r.adjust || ''}
              </td>
              <td className="p-2 text-right font-bold">{r.closing}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}