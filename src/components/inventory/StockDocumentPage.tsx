import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  createDocument, postDocument, listDocuments,
  type StockDocumentType, type StockDocumentRow,
} from '@/api/stockDocument';
import { getWarehouses, getProducts, type WarehouseRow, type ToolRow } from '@/api/warehouse';

type LineDraft = { productId: string; quantity: number; unitCost: number };

type Props = { type: StockDocumentType; title: string };

export function StockDocumentPage({ type, title }: Props) {
  const [docs, setDocs] = useState<StockDocumentRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [products, setProducts] = useState<ToolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [warehouseId, setWarehouseId] = useState('');
  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ productId: '', quantity: 1, unitCost: 0 }]);

  const currentUser = { id: 'manual-test' }; // TODO: lấy từ auth

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, ws, ps] = await Promise.all([
        listDocuments({ documentType: type, limit: 100 }),
        getWarehouses(),
        getProducts(),
      ]);
      if (r.ok) setDocs(r.data);
      else toast.error(r.error);
      if (ws.ok) setWarehouses(ws.data);
      else toast.error(ws.error);
      if (ps.ok) setProducts(ps.data);
      else toast.error(ps.error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addRow = () => setLines(p => [...p, { productId: '', quantity: 1, unitCost: 0 }]);
  const removeRow = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<LineDraft>) =>
    setLines(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'TRANSFER') {
      if (!fromWh || !toWh) return alert('Chọn kho nguồn và kho đích');
      if (fromWh === toWh) return alert('Kho nguồn và kho đích không được trùng');
    } else {
      if (!warehouseId) return alert('Chọn kho');
    }

    const valid = lines.filter(l => l.productId && l.quantity > 0);
    if (valid.length === 0) return alert('Chưa có dòng hợp lệ');

    const ids = valid.map(v => v.productId);
    if (new Set(ids).size !== ids.length) return alert('Có sản phẩm bị trùng');

    setSubmitting(true);
    try {
      // Bước 1: tạo phiếu
      const r1 = await createDocument({
        documentType: type,
        referenceNumber: `${type}-${Date.now()}`,
        transactionDate: date,
        warehouseId: type !== 'TRANSFER' ? warehouseId : undefined,
        fromWarehouseId: type === 'TRANSFER' ? fromWh : undefined,
        toWarehouseId: type === 'TRANSFER' ? toWh : undefined,
        notes,
        createdBy: currentUser.id,
        lines: valid.map((l, index) => ({
          lineNo: index + 1,
          productId: l.productId,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      });
      if (!r1.ok) {
        toast.error('Tạo phiếu lỗi: ' + r1.error);
        return;
      }

      // Bước 2: post ledger
      const r2 = await postDocument(r1.documentId, currentUser.id);
      if (!r2.ok) {
        toast.error('Ghi ledger lỗi: ' + r2.error);
        return;
      }

      toast.success(`${title} thành công — ${r2.ledgerIds.length} dòng ledger`);
      setLines([{ productId: '', quantity: 1, unitCost: 0 }]);
      setNotes('');
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>

      <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {type !== 'TRANSFER' ? (
            <div>
              <label className="block text-sm mb-1">Kho</label>
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full border rounded p-2">
                <option value="">— Chọn —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm mb-1">Kho nguồn</label>
                <select value={fromWh} onChange={e => setFromWh(e.target.value)} className="w-full border rounded p-2">
                  <option value="">— Chọn —</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Kho đích</label>
                <select value={toWh} onChange={e => setToWh(e.target.value)} className="w-full border rounded p-2">
                  <option value="">— Chọn —</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm mb-1">Ngày</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Ghi chú</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded p-2" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_100px_120px_40px] gap-2 text-sm font-medium">
            <span>Sản phẩm</span>
            <span className="text-right">Số lượng</span>
            <span className="text-right">Đơn giá</span>
            <span></span>
          </div>
          {lines.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_120px_40px] gap-2">
              <select value={it.productId} onChange={e => updateRow(i, { productId: e.target.value })} className="border rounded p-2">
                <option value="">— Chọn SP —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.ma_dao ? `${p.ma_dao} — ` : ''}{p.ten_dao}</option>)}
              </select>
              <input type="number" min={1} value={it.quantity}
                onChange={e => updateRow(i, { quantity: Number(e.target.value) })}
                className="border rounded p-2 text-right" />
              <input type="number" min={0} value={it.unitCost}
                onChange={e => updateRow(i, { unitCost: Number(e.target.value) })}
                className="border rounded p-2 text-right" />
              <button type="button" onClick={() => removeRow(i)} className="text-red-600">✕</button>
            </div>
          ))}
          <button type="button" onClick={addRow} className="text-sm text-blue-600">+ Thêm dòng</button>
        </div>

        <button type="submit" disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {submitting ? 'Đang lưu…' : `Tạo & post ${title}`}
        </button>
      </form>

      <div className="border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Số phiếu</th>
              <th className="p-2 text-left">Ngày</th>
              <th className="p-2 text-left">Trạng thái</th>
              <th className="p-2 text-right">Số dòng</th>
              <th className="p-2 text-right">Ledger</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-4 text-center">Đang tải…</td></tr>}
            {!loading && docs.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Chưa có phiếu</td></tr>
            )}
            {docs.map(d => (
              <tr key={d.id} className="border-t">
                <td className="p-2 font-mono text-xs">{d.reference_number}</td>
                <td className="p-2">{d.transaction_date}</td>
                <td className="p-2">
                  <span className={d.posted_at ? 'text-green-600' : 'text-gray-600'}>
                    {d.workflow_status}
                  </span>
                </td>
                <td className="p-2 text-right">—</td>
                <td className="p-2 text-right">
                  {d.posted_at ? '✅' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}