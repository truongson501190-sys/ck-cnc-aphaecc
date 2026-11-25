import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { listToolReturns, type ToolReturnRow, type ToolReturnItemRow } from '@/api/toolReturn';
import { getWarehouses } from '@/api/warehouse';

export default function ToolReturns() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState<ToolReturnRow[]>([]);
  const [itemsByReturn, setItemsByReturn] = useState<Record<string, ToolReturnItemRow[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
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
      const res = await listToolReturns({
        warehouseId: warehouseId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        limit: 500,
      });
      if (!res.ok) { toast.error(res.error); return; }
      setRows(res.data);
      setItemsByReturn(res.itemsByReturn);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exportCsv = () => {
    const header = 'Ngày,Kho,Sản phẩm,SL thu về,Kg,Tình trạng,Máy,Dự án,Phiếu xuất\n';
    const body = rows.flatMap(h =>
      (itemsByReturn[h.id] ?? []).map(it =>
        [h.returned_date, h.warehouse_id, it.product_id, it.quantity_returned,
         it.weight_kg ?? '', it.condition ?? '', it.machine_id ?? '', it.project_id ?? '',
         h.document_id.slice(0, 8)].join(',')
      )
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ToolReturns_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Nhật ký thu hồi công cụ</h1>

      <div className="border rounded p-3 grid grid-cols-4 gap-2">
        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="border rounded p-2">
          <option value="">— Tất cả kho —</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border rounded p-2" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border rounded p-2" />
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="bg-blue-600 text-white rounded px-3 flex-1">
            {loading ? '…' : 'Lọc'}
          </button>
          <button onClick={exportCsv} className="bg-green-600 text-white rounded px-3">CSV</button>
        </div>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Ngày</th>
            <th className="p-2 text-left">Kho</th>
            <th className="p-2 text-right">Số dòng</th>
            <th className="p-2 text-right">Tổng SL</th>
            <th className="p-2 text-right">Tổng Kg</th>
            <th className="p-2 text-left">Người trả</th>
            <th className="p-2 text-left">Người nhận</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={8} className="p-4 text-center text-gray-500">Chưa có phiếu nào</td></tr>
          )}
          {rows.map(h => {
            const items = itemsByReturn[h.id] ?? [];
            const totalQty = items.reduce((s, it) => s + Number(it.quantity_returned), 0);
            const totalKg = items.reduce((s, it) => s + (Number(it.weight_kg) || 0), 0);
            const isExpanded = expanded === h.id;
            return (
              <>
                <tr key={h.id} className="border-t">
                  <td className="p-2">{h.returned_date}</td>
                  <td className="p-2 text-xs">{h.warehouse_id}</td>
                  <td className="p-2 text-right">{items.length}</td>
                  <td className="p-2 text-right font-medium">{totalQty}</td>
                  <td className="p-2 text-right">{totalKg > 0 ? totalKg.toFixed(2) : '—'}</td>
                  <td className="p-2 text-xs">{h.returned_by ?? '—'}</td>
                  <td className="p-2 text-xs">{h.received_by ?? '—'}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => setExpanded(isExpanded ? null : h.id)} className="px-3 py-1 bg-gray-200 rounded">
                      {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={h.id + '-detail'}>
                    <td colSpan={8} className="p-4 bg-gray-50">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b font-medium">
                            <th className="p-1 text-left">Sản phẩm</th>
                            <th className="p-1 text-right">SL</th>
                            <th className="p-1 text-right">Kg</th>
                            <th className="p-1 text-left">Tình trạng</th>
                            <th className="p-1 text-left">Máy</th>
                            <th className="p-1 text-left">Dự án</th>
                            <th className="p-1 text-left">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(it => (
                            <tr key={it.id} className="border-b">
                              <td className="p-1">{it.product_id}</td>
                              <td className="p-1 text-right">{it.quantity_returned}</td>
                              <td className="p-1 text-right">{it.weight_kg ?? '—'}</td>
                              <td className="p-1">{it.condition ?? '—'}</td>
                              <td className="p-1 text-xs">{it.machine_id?.slice(0, 8) ?? '—'}</td>
                              <td className="p-1 text-xs">{it.project_id?.slice(0, 8) ?? '—'}</td>
                              <td className="p-1 text-gray-600">{it.notes ?? ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}