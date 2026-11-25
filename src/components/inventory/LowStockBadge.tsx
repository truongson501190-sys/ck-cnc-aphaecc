import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getLowStockAlert, type LowStockRow } from '@/api/stockInsights';

export function LowStockBadge() {
  const [rows, setRows] = useState<LowStockRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadAlerts = async () => {
      try {
        const result = await getLowStockAlert();
        if (!active) return;
        if (!result.ok) {
          toast.error(`Không tải được cảnh báo tồn kho: ${result.error}`);
          return;
        }
        setRows(result.data);
      } catch (error) {
        if (active) {
          toast.error(
            `Không tải được cảnh báo tồn kho: ${
              error instanceof Error ? error.message : 'Lỗi không xác định'
            }`
          );
        }
      }
    };

    void loadAlerts();
    return () => {
      active = false;
    };
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded border border-orange-300 bg-orange-100 px-3 py-1.5 text-orange-800 hover:bg-orange-200"
      >
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">{rows.length} SP dưới tồn tối thiểu</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-80 w-80 overflow-y-auto rounded-lg border bg-white text-slate-900 shadow-lg">
          <div className="border-b p-3 text-sm font-medium">Cảnh báo tồn kho</div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Mã</th>
                <th className="p-2 text-left">Tên</th>
                <th className="p-2 text-right">Tồn</th>
                <th className="p-2 text-right">Tối thiểu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ma_dao} className="border-t">
                  <td className="p-2 font-mono">{row.ma_dao}</td>
                  <td className="max-w-32 truncate p-2">{row.ten_dao}</td>
                  <td className="p-2 text-right font-medium text-red-600">{row.on_hand_total}</td>
                  <td className="p-2 text-right text-gray-500">{row.ton_toi_thieu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
