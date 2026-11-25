import { useState } from 'react';

export type WarehouseOption = { id: string; name: string };
export type ProductOption = { id: string; name: string; sku?: string };

export type CountFormLine = {
  productId: string;
  countedQty: number;
  systemQty: number;
};

type Props = {
  warehouses: WarehouseOption[];
  products: ProductOption[];
  getSystemQty: (warehouseId: string, productId: string) => Promise<number>;
  onSubmit: (payload: {
    warehouseId: string;
    notes?: string;
    lines: CountFormLine[];
  }) => Promise<{ ok: boolean; error?: string }>;
  submitting: boolean;
};

export function InventoryCountForm({
  warehouses,
  products,
  getSystemQty,
  onSubmit,
  submitting,
}: Props) {
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<CountFormLine[]>([
    { productId: '', countedQty: 0, systemQty: 0 },
  ]);
  const [loadingSystem, setLoadingSystem] = useState<Record<number, boolean>>({});

  const refreshSystemForRow = async (idx: number, productId: string, whId: string) => {
    if (!productId || !whId) {
      setLines(p => p.map((it, i) => (i === idx ? { ...it, systemQty: 0 } : it)));
      return;
    }
    setLoadingSystem(s => ({ ...s, [idx]: true }));
    try {
      const qty = await getSystemQty(whId, productId);
      setLines(p => p.map((it, i) => (i === idx ? { ...it, systemQty: qty } : it)));
    } finally {
      setLoadingSystem(s => ({ ...s, [idx]: false }));
    }
  };

  const handleWarehouseChange = async (v: string) => {
    setWarehouseId(v);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].productId) await refreshSystemForRow(i, lines[i].productId, v);
    }
  };

  const handleProductChange = async (idx: number, productId: string) => {
    setLines(p => p.map((it, i) => (i === idx ? { ...it, productId } : it)));
    await refreshSystemForRow(idx, productId, warehouseId);
  };

  const addRow = () => setLines(p => [...p, { productId: '', countedQty: 0, systemQty: 0 }]);
  const removeRow = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<CountFormLine>) =>
    setLines(p => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) return alert('Chọn kho kiểm kê');
    const valid = lines.filter(l => l.productId && l.countedQty >= 0);
    if (valid.length === 0) return alert('Chưa có dòng hợp lệ');

    const ids = valid.map(v => v.productId);
    if (new Set(ids).size !== ids.length) return alert('Có sản phẩm bị trùng');

    const res = await onSubmit({ warehouseId, notes, lines: valid });
    if (!res.ok) {
      alert('Lỗi: ' + (res.error ?? 'unknown'));
      return;
    }
    setLines([{ productId: '', countedQty: 0, systemQty: 0 }]);
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Kho kiểm kê</label>
          <select
            value={warehouseId}
            onChange={e => handleWarehouseChange(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">— Chọn kho —</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Ghi chú</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-2 text-sm font-medium">
          <span>Sản phẩm</span>
          <span className="text-right">Tồn hệ thống</span>
          <span className="text-right">Số đếm thực tế</span>
          <span className="text-right">Chênh lệch</span>
          <span></span>
        </div>
        {lines.map((it, i) => {
          const variance = it.countedQty - it.systemQty;
          return (
            <div key={i} className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-2">
              <select
                value={it.productId}
                onChange={e => handleProductChange(i, e.target.value)}
                className="border rounded p-2"
              >
                <option value="">— Chọn SP —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.sku ? `${p.sku} — ` : ''}{p.name}
                  </option>
                ))}
              </select>
              <div className="border rounded p-2 text-right bg-gray-50">
                {loadingSystem[i] ? '…' : it.systemQty}
              </div>
              <input
                type="number"
                min={0}
                value={it.countedQty}
                onChange={e => updateRow(i, { countedQty: Number(e.target.value) })}
                className="border rounded p-2 text-right"
              />
              <div
                className={`border rounded p-2 text-right bg-gray-50 ${
                  variance > 0 ? 'text-green-600' :
                  variance < 0 ? 'text-red-600' : ''
                }`}
              >
                {variance > 0 ? '+' : ''}{variance}
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-red-600"
              >
                ✕
              </button>
            </div>
          );
        })}
        <button type="button" onClick={addRow} className="text-sm text-blue-600">
          + Thêm dòng
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {submitting ? 'Đang lưu…' : 'Tạo phiếu kiểm kê'}
      </button>
    </form>
  );
}