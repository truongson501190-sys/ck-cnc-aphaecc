import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BackupRestoreRecord } from '@/types/system';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';

const HISTORY_KEY = 'erp-backup-restore-history';

function snapshotLocalStorage(): Record<string, string> {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || key === HISTORY_KEY) continue;
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  }
  return data;
}

function downloadJsonFile(payload: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BackupRestore() {
  const [history, setHistory] = useState<BackupRestoreRecord[]>([]);
  const [restoreCandidateName, setRestoreCandidateName] = useState('');
  const [restoreCandidateData, setRestoreCandidateData] = useState<Record<string, unknown> | null>(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setHistory(loadArrayFromStorage<BackupRestoreRecord>(HISTORY_KEY));
  }, []);

  useEffect(() => {
    saveArrayToStorage(HISTORY_KEY, history);
  }, [history]);

  const summary = useMemo(
    () => ({
      backupCount: history.filter((record) => record.type === 'backup').length,
      restoreCount: history.filter((record) => record.type === 'restore').length,
      totalRecords: history.length,
    }),
    [history],
  );

  const createHistoryRecord = (type: BackupRestoreRecord['type'], name: string, notes?: string) => {
    const record: BackupRestoreRecord = {
      id: buildLocalId('backup-restore'),
      type,
      name,
      notes,
      createdAt: new Date().toISOString(),
    };
    setHistory((current) => [record, ...current]);
    return record;
  };

  const handleCreateBackup = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProgress(10);

    await new Promise((resolve) => setTimeout(resolve, 250));
    setProgress(40);

    const payload = {
      metadata: {
        name: `erp-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
        createdAt: new Date().toISOString(),
      },
      data: snapshotLocalStorage(),
    };
    const filename = payload.metadata.name;

    downloadJsonFile(payload, filename);
    createHistoryRecord('backup', filename, 'Tạo backup và tải về máy');
    setProgress(100);
    toast.success('Backup đã được tạo và tải xuống');

    window.setTimeout(() => {
      setProgress(0);
      setIsProcessing(false);
    }, 500);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreCandidateName(file.name);
    setProgress(10);

    const reader = new FileReader();
    reader.onload = () => {
      setProgress(60);
      try {
        const parsed = JSON.parse(reader.result as string);
        const payload = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
        setRestoreCandidateData(payload);
        setIsRestoreDialogOpen(true);
        toast.success('File backup đã sẵn sàng để khôi phục');
      } catch {
        toast.error('Không thể đọc file backup. Vui lòng kiểm tra định dạng JSON.');
      }
      setProgress(0);
    };
    reader.onerror = () => {
      toast.error('Lỗi khi đọc file backup.');
      setProgress(0);
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!restoreCandidateData || isProcessing) return;
    setIsProcessing(true);
    setProgress(20);

    window.setTimeout(() => {
      try {
        const keys = Object.keys(restoreCandidateData);
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key && key !== HISTORY_KEY) {
            localStorage.removeItem(key);
          }
        }

        keys.forEach((key) => {
          const value = restoreCandidateData[key];
          if (typeof value === 'string') {
            localStorage.setItem(key, value);
          } else {
            localStorage.setItem(key, JSON.stringify(value));
          }
        });

        setProgress(80);
        createHistoryRecord('restore', restoreCandidateName, `Khôi phục từ ${restoreCandidateName}`);
        toast.success('Restore dữ liệu thành công');
      } catch {
        toast.error('Restore thất bại, vui lòng thử lại.');
      } finally {
        setRestoreCandidateData(null);
        setRestoreCandidateName('');
        setIsRestoreDialogOpen(false);
        setProgress(0);
        setIsProcessing(false);
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Backup & Restore</h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Quản lý sao lưu dữ liệu ERP/WMS, tải backup xuống và khôi phục từ file JSON một cách an toàn.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleCreateBackup} disabled={isProcessing}>
              Tạo backup và tải xuống
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              Chọn file restore
              <input type="file" accept="application/json" className="sr-only" onChange={handleFileChange} disabled={isProcessing} />
            </label>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card className="order-2 xl:order-1">
            <CardHeader>
              <CardTitle>Hoạt động sao lưu</CardTitle>
              <CardDescription>Quá trình tạo backup hoặc tải lên file restore được hiển thị ngay lập tức.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Tệp restore</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{restoreCandidateName || 'Chưa chọn file'}</p>
                  </div>
                  <Badge variant="secondary">{isProcessing ? 'Đang xử lý' : 'Sẵn sàng'}</Badge>
                </div>

                <div className="rounded-full bg-slate-200 h-2 overflow-hidden dark:bg-slate-800">
                  <div className="h-2 bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Backup tạo</p>
                    <p className="mt-2 text-2xl font-semibold">{summary.backupCount}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Restore đã dùng</p>
                    <p className="mt-2 text-2xl font-semibold">{summary.restoreCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="order-1 xl:order-2">
            <CardHeader>
              <CardTitle>Hướng dẫn nhanh</CardTitle>
              <CardDescription>Thao tác nhanh cho việc sao lưu dữ liệu và khôi phục hệ thống bằng file JSON.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <p>1. Nhấn <strong>Tạo backup và tải xuống</strong> để xuất toàn bộ dữ liệu đang lưu.</p>
                <p>2. Chọn file JSON để khôi phục dữ liệu.</p>
                <p>3. Xác nhận khôi phục để thay thế dữ liệu hiện tại.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Lưu ý: Restore sẽ ghi đè dữ liệu đang lưu trữ hiện tại, hãy chắc chắn trước khi thực hiện.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lịch sử backup</CardTitle>
            <CardDescription>Danh sách các lần sao lưu và khôi phục hệ thống.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Tên file</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length ? (
                    history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{new Date(record.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={record.type === 'backup' ? 'secondary' : 'outline'}>
                            {record.type === 'backup' ? 'Backup' : 'Restore'}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.notes || '—'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                        Chưa có bản ghi sao lưu hoặc khôi phục nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Xác nhận khôi phục</DialogTitle>
            <DialogDescription>
              File <strong>{restoreCandidateName}</strong> đã được tải lên. Khôi phục sẽ thay thế dữ liệu hiện tại trong trình duyệt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              <p className="font-medium">Thao tác khôi phục dữ liệu</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
                <li>Ghi đè cấu hình và dữ liệu hiện tại.</li>
                <li>Nên sao lưu dữ liệu trước khi thực hiện.</li>
                <li>File phải là JSON hợp lệ mà hệ thống đã xuất.</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)} disabled={isProcessing}>
              Hủy
            </Button>
            <Button onClick={handleConfirmRestore} disabled={isProcessing}>
              Xác nhận khôi phục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
