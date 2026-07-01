import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { AuditLogEntry } from '@/types/system';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import { usePermission } from '@/hooks/usePermission';

const STORAGE_KEY = 'erp-audit-log';

const DEFAULT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-1',
    user: 'nguyen.van.a',
    action: 'login',
    module: 'Auth',
    resource: 'Đăng nhập',
    ipAddress: '192.168.1.10',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'audit-2',
    user: 'pham.thi.b',
    action: 'add',
    module: 'Kho',
    resource: 'Thêm phiếu nhập',
    ipAddress: '192.168.1.12',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'audit-3',
    user: 'le.van.c',
    action: 'edit',
    module: 'QC',
    resource: 'Chỉnh sửa phiếu kiểm',
    ipAddress: '192.168.1.15',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'audit-4',
    user: 'tran.thi.d',
    action: 'approve',
    module: 'Kho',
    resource: 'Duyệt phiếu chuyển kho',
    ipAddress: '192.168.1.20',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'audit-5',
    user: 'nguyen.van.a',
    action: 'logout',
    module: 'Auth',
    resource: 'Đăng xuất',
    ipAddress: '192.168.1.10',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'audit-6',
    user: 'pham.thi.b',
    action: 'delete',
    module: 'Production',
    resource: 'Xóa lệnh sản xuất',
    ipAddress: '192.168.1.12',
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
];

const actionLabels: Record<AuditLogEntry['action'], string> = {
  login: 'Login',
  logout: 'Logout',
  add: 'Thêm',
  edit: 'Sửa',
  delete: 'Xóa',
  approve: 'Duyệt phiếu',
};

const actionBadges: Record<AuditLogEntry['action'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  login: 'secondary',
  logout: 'outline',
  add: 'default',
  edit: 'default',
  delete: 'destructive',
  approve: 'secondary',
};

function getUserOptions(logs: AuditLogEntry[]) {
  return Array.from(new Set(logs.map((log) => log.user))).sort();
}

export default function AuditLog() {
  const { canEdit: permCanEdit, canView: permCanView } = usePermission();
  const canView = permCanView('audit_log');
  const canAdd = permCanEdit('audit_log');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const stored = loadArrayFromStorage<AuditLogEntry>(STORAGE_KEY);
    setLogs(stored.length ? stored : DEFAULT_LOGS);
  }, []);

  useEffect(() => {
    saveArrayToStorage(STORAGE_KEY, logs);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (userFilter !== 'all' && log.user !== userFilter) return false;
      if (dateFrom && log.createdAt < dateFrom) return false;
      if (dateTo && log.createdAt > `${dateTo}T23:59:59`) return false;
      if (!search) return true;
      const query = search.toLowerCase();
      return (
        log.user.toLowerCase().includes(query) ||
        log.module.toLowerCase().includes(query) ||
        log.resource?.toLowerCase().includes(query) ||
        actionLabels[log.action].toLowerCase().includes(query) ||
        log.ipAddress.toLowerCase().includes(query)
      );
    });
  }, [logs, userFilter, dateFrom, dateTo, search]);

  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPageLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  const userOptions = useMemo(() => getUserOptions(logs), [logs]);

  const handleResetFilters = () => {
    setSearch('');
    setUserFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleAddSample = () => {
    const newLog: AuditLogEntry = {
      id: buildLocalId('audit'),
      user: 'admin',
      action: 'approve',
      module: 'Báo cáo',
      resource: 'Duyệt báo cáo tồn kho',
      ipAddress: '192.168.1.25',
      createdAt: new Date().toISOString(),
    };
    setLogs((current) => [newLog, ...current]);
    toast.success('Đã thêm bản ghi audit mẫu');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Audit Log</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Theo dõi các thao tác người dùng: login, logout, thêm, sửa, xóa, duyệt phiếu.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleResetFilters}>Reset bộ lọc</Button>
            {canAdd && <Button onClick={handleAddSample}>Thêm bản ghi mẫu</Button>}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lọc audit</CardTitle>
            <CardDescription>Search, lọc user và lọc theo khoảng thời gian.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
              <div>
                <Label htmlFor="search">Tìm kiếm</Label>
                <Input
                  id="search"
                  placeholder="User, module, hành động hoặc IP"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <Label htmlFor="userFilter">User</Label>
                <Select value={userFilter} onValueChange={(value) => { setUserFilter(value); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {userOptions.map((user) => (
                      <SelectItem key={user} value={user}>{user}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateFrom">Từ ngày</Label>
                <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
              </div>
              <div>
                <Label htmlFor="dateTo">Đến ngày</Label>
                <Input id="dateTo" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Danh sách log</CardTitle>
                <CardDescription>{filteredLogs.length} bản ghi tìm thấy</CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="text-sm text-slate-500 dark:text-slate-400">Trang {page} / {pageCount}</div>
                <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>{size} / trang</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Tài nguyên</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageLogs.length > 0 ? (
                    currentPageLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">{log.user}</TableCell>
                        <TableCell>
                          <Badge variant={actionBadges[log.action]}>{actionLabels[log.action]}</Badge>
                        </TableCell>
                        <TableCell>{log.module}</TableCell>
                        <TableCell>{log.resource || '—'}</TableCell>
                        <TableCell>{log.ipAddress}</TableCell>
                        <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                        Không có dữ liệu phù hợp với bộ lọc.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Tổng cộng {filteredLogs.length} bản ghi
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Trước
                </Button>
                <Button variant="outline" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
                  Sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
