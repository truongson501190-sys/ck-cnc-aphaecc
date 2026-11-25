import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { InventoryCountForm } from '@/components/inventory/InventoryCountForm';
import {
  createSession,
  listSessions,
  applyVariance,
  getSessionById,
  type InventoryCountLineRow,
} from '@/api/inventoryCount';
import { getSupabase } from '@/supabase';

const currentUser = { id: 'TODO:auth-user-id' }; // TODO: lấy từ auth context

// ============ HELPERS ============
async function loadWarehouses() {
  const client = getSupabase();
  if (!client) return [];
  const { data } = await client.from('warehouses').select('id, name').order('name');
  return data ?? [];
}
async function loadProducts() {
  const client = getSupabase();
  if (!client) return [];
  const { data } = await client.from('products').select('id, name, sku').order('name');
  return data ?? [];
}
async function getSystemQty(warehouseId: string, productId: string): Promise<number> {
  const client = getSupabase();
  if (!client) return 0;
  const { data } = await client
    .from('stock_ledger')
    .select('qty_delta')
    .eq('warehouse_id', warehouseId)
    .eq('product_id', productId);
  return (data ?? []).reduce((s: number, r: any) => s + Number(r.qty_delta), 0);
}

// ============ PAGE ============
export default function InventoryCount() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedLines, setExpandedLines] = useState<InventoryCountLineRow[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sResult, ws, ps] = await Promise.all([
        listSessions({ limit: 100 }),
        loadWarehouses(),
        loadProducts(),
      ]);
      if (sResult.ok) setSessions(sResult.data);
      else toast.error(sResult.error);
      setWarehouses(ws);
      setProducts(ps);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreate = async (payload: any) => {
    setSubmitting(true);
    try {
      const res = await createSession({ ...payload, createdBy: currentUser.id });
      if (!res.ok) return res;
      toast.success('Đã tạo phiếu kiểm kê');
      await loadAll();
      return { ok: true };
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (sid: string) => {
    if (!window.confirm('Áp dụng chênh lệch? Tồn kho sẽ được điều chỉnh ngay.')) return;
    const res = await applyVariance(sid, currentUser.id);
    if (!res.ok) {
      toast.error('Áp dụng thất bại: ' + res.error);
      return;
    }
    toast.success(
      res.adjustedLines === 0
        ? 'Không có chênh lệch — phiếu đánh dấu đã xử lý'
        : `Đã áp dụng ${res.adjustedLines} dòng điều chỉnh`
    );
    await loadAll();
    if (expandedId === sid) {
      const detail = await getSessionById(sid);
      if (detail.ok) setExpandedLines(detail.lines);
    }
  };

  const handleExpand = async (sid: string) => {
    if (expandedId === sid) {
      setExpandedId(null);
      return;
    }
    const res = await getSessionById(sid);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setExpandedId(sid);
    setExpandedLines(res.lines);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Kiểm kê kho</h1>

      <InventoryCountForm
        warehouses={warehouses}
        products={products}
        getSystemQty={getSystemQty}
        onSubmit={handleCreate}
        submitting={submitting}
      />

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Ngày tạo</th>
              <th className="p-2 text-left">Kho</th>
              <th className="p-2 text-left">Trạng thái</th>
              <th className="p-2 text-left">Ghi chú</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="p-4 text-center">Đang tải…</td></tr>
            )}
            {!loading && sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Chưa có phiếu kiểm kê nào
                </td>
              </tr>
            )}
            {sessions.map(s => {
              const isExpanded = expandedId === s.id;
              return (
                <>
                  <tr key={s.id} className="border-t">
                    <td className="p-2">
                      {new Date(s.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-2">{s.warehouse_id}</td>
                    <td className="p-2">
                      <span className={
                        s.status === 'posted' ? 'text-green-600 font-medium' :
                        s.status === 'counted' ? 'text-blue-600' : 'text-gray-600'
                      }>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-2 text-gray-600">{s.notes ?? '—'}</td>
                    <td className="p-2 text-right space-x-2">
                      <button
                        onClick={() => handleExpand(s.id)}
                        className="px-3 py-1 bg-gray-200 rounded"
                      >
                        {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                      </button>
                      {s.status !== 'posted' && (
                        <button
                          onClick={() => handleApply(s.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Áp dụng chênh lệch
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={s.id + '-detail'}>
                      <td colSpan={5} className="p-4 bg-gray-50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b font-medium">
                              <th className="p-1 text-left">Sản phẩm</th>
                              <th className="p-1 text-right">Tồn hệ thống</th>
                              <th className="p-1 text-right">Số đếm</th>
                              <th className="p-1 text-right">Chênh lệch</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expandedLines.map(l => {
                              const sys = Number(l.system_qty);
                              const cnt = Number(l.counted_qty);
                              const diff = Number(l.variance_qty ?? (cnt - sys));
                              return (
                                <tr key={l.id} className="border-b">
                                  <td className="p-1">{l.product_id}</td>
                                  <td className="p-1 text-right">{sys}</td>
                                  <td className="p-1 text-right">{cnt}</td>
                                  <td className={`p-1 text-right ${
                                    diff > 0 ? 'text-green-600' :
                                    diff < 0 ? 'text-red-600' : ''
                                  }`}>
                                    {diff > 0 ? '+' : ''}{diff}
                                  </td>
                                </tr>
                              );
                            })}
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
    </div>
  );
}