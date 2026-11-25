import { useState } from 'react';
import { toast } from 'sonner';
import {
  getConsumptionByMachine,
  getConsumptionByProject,
  getScrapByMonth,
  type ConsumptionByKeyRow,
} from '@/api/toolReturn';

type Tab = 'machine' | 'project' | 'month';

export default function ToolConsumptionReport() {
  const [tab, setTab] = useState<Tab>('machine');
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [monthFrom, setMonthFrom] = useState(defaultFrom);
  const [monthTo, setMonthTo] = useState(defaultFrom);

  const [machineRows, setMachineRows] = useState<ConsumptionByKeyRow[]>([]);
  const [projectRows, setProjectRows] = useState<ConsumptionByKeyRow[]>([]);
  const [monthRows, setMonthRows] = useState<Array<{ month: string; total_qty: number; total_weight_kg: number; so_phieu: number }>>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'machine') {
        const res = await getConsumptionByMachine({ monthFrom, monthTo });
        if (!res.ok) { toast.error(res.error); return; }
        setMachineRows(res.rows);
      } else if (tab === 'project') {
        const res = await getConsumptionByProject({ monthFrom, monthTo });
        if (!res.ok) { toast.error(res.error); return; }
        setProjectRows(res.rows);
      } else {
        const res = await getScrapByMonth({ monthFrom, monthTo });
        if (!res.ok) { toast.error(res.error); return; }
        setMonthRows(res.rows);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (tab === 'machine' || tab === 'project') {
      const rows = tab === 'machine' ? machineRows : projectRows;
      return (
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">{tab === 'machine' ? 'Máy' : 'Dự án'}</th>
              <th className="p-2 text-right">Số lần thu hồi</th>
              <th className="p-2 text-right">Tổng SL</th>
              <th className="p-2 text-right">Tổng Kg</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.key} className="border-t">
                <td className="p-2 text-xs">{r.key.slice(0, 8)}</td>
                <td className="p-2 text-right">{r.so_lan}</td>
                <td className="p-2 text-right font-medium">{r.total_qty}</td>
                <td className="p-2 text-right">{r.total_weight_kg > 0 ? r.total_weight_kg.toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return (
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Tháng</th>
            <th className="p-2 text-right">Số phiếu</th>
            <th className="p-2 text-right">Tổng SL</th>
            <th className="p-2 text-right">Tổng Kg</th>
          </tr>
        </thead>
        <tbody>
          {monthRows.length === 0 && (
            <tr><td colSpan={4} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
          )}
          {monthRows.map(r => (
            <tr key={r.month} className="border-t">
              <td className="p-2">{r.month}</td>
              <td className="p-2 text-right">{r.so_phieu}</td>
              <td className="p-2 text-right font-medium">{r.total_qty}</td>
              <td className="p-2 text-right">{r.total_weight_kg > 0 ? r.total_weight_kg.toFixed(2) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Báo cáo hao hụt công cụ</h1>

      <div className="flex gap-2 border-b">
        {(['machine', 'project', 'month'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 ${tab === t ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-600'}`}
          >
            {t === 'machine' ? 'Theo máy' : t === 'project' ? 'Theo dự án' : 'Tổng hợp tháng'}
          </button>
        ))}
      </div>

      <div className="border rounded p-3 grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Từ tháng</label>
          <input type="month" value={monthFrom} onChange={e => setMonthFrom(e.target.value)} className="border rounded p-2 w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Đến tháng</label>
          <input type="month" value={monthTo} onChange={e => setMonthTo(e.target.value)} className="border rounded p-2 w-full" />
        </div>
        <div className="flex items-end">
          <button onClick={load} disabled={loading} className="bg-blue-600 text-white rounded px-3 py-2 w-full">
            {loading ? '…' : 'Xem'}
          </button>
        </div>
      </div>

      {renderTable()}
    </div>
  );
}