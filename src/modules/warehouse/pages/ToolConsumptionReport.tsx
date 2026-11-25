import { useState } from 'react';
import { toast } from 'sonner';
import {
  getConsumptionByMachine,
  getConsumptionByProject,
  getScrapByMonth,
  type ConsumptionByMachineRow,
  type ConsumptionByProjectRow,
  type ScrapByMonthRow,
} from '@/api/toolReturn';

type Tab = 'machine' | 'project' | 'month';

export default function ToolConsumptionReport() {
  const [tab, setTab] = useState<Tab>('machine');
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [monthFrom, setMonthFrom] = useState(defaultMonth);
  const [monthTo, setMonthTo] = useState(defaultMonth);

  const [machineRows, setMachineRows] = useState<ConsumptionByMachineRow[]>([]);
  const [projectRows, setProjectRows] = useState<ConsumptionByProjectRow[]>([]);
  const [monthRows, setMonthRows] = useState<ScrapByMonthRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'machine') {
        const res = await getConsumptionByMachine(undefined, monthFrom === monthTo ? monthFrom : undefined);
        if (!res.ok) { toast.error(res.error); return; }
        // Nếu monthFrom === monthTo → API filter theo tháng; nếu khác → load tất cả + filter client
        let rows = res.data;
        if (monthFrom !== monthTo) {
          rows = rows.filter(r => r.month >= `${monthFrom}-01` && r.month <= `${monthTo}-31`);
        }
        setMachineRows(rows);
      } else if (tab === 'project') {
        const res = await getConsumptionByProject(undefined, monthFrom === monthTo ? monthFrom : undefined);
        if (!res.ok) { toast.error(res.error); return; }
        let rows = res.data;
        if (monthFrom !== monthTo) {
          rows = rows.filter(r => r.month >= `${monthFrom}-01` && r.month <= `${monthTo}-31`);
        }
        setProjectRows(rows);
      } else {
        const res = await getScrapByMonth({ monthFrom, monthTo });
        if (!res.ok) { toast.error(res.error); return; }
        setMonthRows(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (tab === 'machine') {
      return (
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Máy</th>
              <th className="p-2 text-left">Sản phẩm</th>
              <th className="p-2 text-left">Tháng</th>
              <th className="p-2 text-right">SL cấp</th>
              <th className="p-2 text-right">SL trả</th>
              <th className="p-2 text-right">Hao hụt</th>
              <th className="p-2 text-right">Số lần</th>
            </tr>
          </thead>
          <tbody>
            {machineRows.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
            )}
            {machineRows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 text-xs">{r.ma_may ?? r.machine_id.slice(0, 8)} — {r.ten_may ?? ''}</td>
                <td className="p-2 text-xs">{r.product_id}</td>
                <td className="p-2 text-xs">{r.month}</td>
                <td className="p-2 text-right">{r.qty_issued}</td>
                <td className="p-2 text-right">{r.qty_returned}</td>
                <td className="p-2 text-right font-medium text-red-600">{r.qty_consumed}</td>
                <td className="p-2 text-right">{r.return_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (tab === 'project') {
      return (
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Dự án</th>
              <th className="p-2 text-left">KH</th>
              <th className="p-2 text-left">Sản phẩm</th>
              <th className="p-2 text-left">Tháng</th>
              <th className="p-2 text-right">SL cấp</th>
              <th className="p-2 text-right">SL trả</th>
              <th className="p-2 text-right">Hao hụt</th>
            </tr>
          </thead>
          <tbody>
            {projectRows.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
            )}
            {projectRows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 text-xs">{r.ma_du_an ?? r.project_id.slice(0, 8)} — {r.ten_du_an ?? ''}</td>
                <td className="p-2 text-xs">{r.khach_hang ?? '—'}</td>
                <td className="p-2 text-xs">{r.product_id}</td>
                <td className="p-2 text-xs">{r.month}</td>
                <td className="p-2 text-right">{r.qty_issued}</td>
                <td className="p-2 text-right">{r.qty_returned}</td>
                <td className="p-2 text-right font-medium text-red-600">{r.qty_consumed}</td>
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
            <th className="p-2 text-right">Tổng SL thu</th>
          </tr>
        </thead>
        <tbody>
          {monthRows.length === 0 && (
            <tr><td colSpan={3} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
          )}
          {monthRows.map(r => (
            <tr key={r.month} className="border-t">
              <td className="p-2">{r.month}</td>
              <td className="p-2 text-right">{r.so_phieu}</td>
              <td className="p-2 text-right font-medium">{r.total_qty}</td>
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