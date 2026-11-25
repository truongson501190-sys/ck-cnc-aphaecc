import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getToolReturns, type ToolReturnRow, type ToolReturnItemRow } from '@/api/toolReturn';
import { getWarehouses } from '@/api/warehouse';

type RowWithItems = ToolReturnRow & { items: ToolReturnItemRow[] };

const COND_LABEL: Record<string, string> = {
  tot: 'Tốt', mon: 'Mòn', hong: 'Hỏng',
};

export default function ToolReturns() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState<RowWithItems[]>([]);
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
      const res = await getToolReturns({
        warehouseId: warehouseId || undefined,
        fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
        toDate: toDate ? new Date(toDate + 'T23:59:59').toISOString() : undefined,
        limit: 500,
      });
      if (!res.ok) { toast.error(res.error); return; }
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
        <button onClick={load} disabled={loading} className="bg-blue-600 text-white rounded px-3">
          {loading ? '…' : 'Lọc'}
        </button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Ngày</th>
            <th className="p-2 text-left">Kho</th>
            <th className="p-2 text-right">Số dòng</th>
            <th className="p-2 text-right">Tổng SL thu</th>
            <th className="p-2 text-left">Người trả</th>
            <th className="p-2 text-left">Người nhận</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="p-4 text-center text-gray-500">Chưa có phiếu nào</td></tr>
          )}
          {rows.map(h => {
            const totalQty = h.items.reduce((s, it) => s + Number(it.qty_returned), 0);
            const isExpanded = expanded === h.id;
            return (
              <>
                <tr key={h.id} className="border-t">
                  <td className="p-2">{new Date(h.returned_at).toLocaleString('vi-VN')}</td>
                  <td className="p-2 text-xs">{h.warehouse_id}</td>
                  <td className="p-2 text-right">{h.items.length}</td>
                  <td className="p-2 text-right font-medium">{totalQty}</td>
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
                    <td colSpan={7} className="p-4 bg-gray-50">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b font-medium">
                            <th className="p-1 text-left">Sản phẩm</th>
                            <th className="p-1 text-right">SL cấp</th>
                            <th className="p-1 text-right">SL trả</th>
                            <th className="p-1 text-left">Tình trạng</th>
                            <th className="p-1 text-left">Máy</th>
                            <th className="p-1 text-left">Dự án</th>
                            <th className="p-1 text-left">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {h.items.map(it => (
                            <tr key={it.id} className="border-b">
                              <td className="p-1">{it.product_id}</td>
                              <td className="p-1 text-right">{it.qty_issued}</td>
                              <td className="p-1 text-right">{it.qty_returned}</td>
                              <td className="p-1">{it.condition ? COND_LABEL[it.condition] : '—'}</td>
                              <td className="p-1 text-xs">{it.machine_id?.slice(0, 8) ?? '—'}</td>
                              <td className="p-1 text-xs">{it.project_id?.slice(0, 8) ?? '—'}</td>
                              <td className="p-1 text-gray-600">{it.note ?? ''}</td>
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