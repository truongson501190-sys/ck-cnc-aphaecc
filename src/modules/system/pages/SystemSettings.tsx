import { useEffect, useMemo, useState } from 'react';
import { Camera, Globe2, Mail, Server, ShieldCheck, Clock, Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';

interface EmailConfig {
  smtpServer: string;
  port: string;
  fromAddress: string;
}

interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
}

interface SystemSettingsData {
  companyName: string;
  logoUrl: string;
  currency: 'VND' | 'USD' | 'EUR';
  theme: 'light' | 'dark';
  language: 'vi' | 'en';
  emailConfig: EmailConfig;
  backupConfig: BackupConfig;
}

const STORAGE_KEY = 'erp-system-settings';

const DEFAULT_SETTINGS: SystemSettingsData = {
  companyName: 'CNC-CK ERP',
  logoUrl: '',
  currency: 'VND',
  theme: 'light',
  language: 'vi',
  emailConfig: {
    smtpServer: 'smtp.example.com',
    port: '587',
    fromAddress: 'noreply@cnc-ck.vn',
  },
  backupConfig: {
    enabled: true,
    frequency: 'daily',
    retentionDays: 30,
  },
};

function applyTheme(theme: SystemSettingsData['theme']) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettingsData>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = loadArrayFromStorage<SystemSettingsData>(STORAGE_KEY);
    if (stored.length) {
      setSettings(stored[0]);
      applyTheme(stored[0].theme);
    } else {
      applyTheme(DEFAULT_SETTINGS.theme);
    }
  }, []);

  const canSave = useMemo(() => Boolean(settings.companyName.trim() && settings.emailConfig.fromAddress.trim()), [settings]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSettings((prev) => ({ ...prev, logoUrl: String(reader.result) }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!canSave) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setSubmitting(true);
    try {
      saveArrayToStorage(STORAGE_KEY, [settings]);
      applyTheme(settings.theme);
      toast.success('Đã lưu cài đặt hệ thống');
    } catch (error) {
      toast.error('Lưu cài đặt thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Cài đặt hệ thống</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Quản lý cấu hình công ty, giao diện, email và backup tự động.</p>
          </div>
          <Button onClick={handleSave} disabled={submitting || !canSave}>
            {submitting ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        </div>

        <Card>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="general">Chung</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="backup">Backup</TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="relative">
                        {settings.logoUrl ? (
                          <img src={settings.logoUrl} alt="Logo công ty" className="h-32 w-32 rounded-2xl object-cover" />
                        ) : (
                          <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <Building2 className="h-14 w-14" />
                          </div>
                        )}
                        <label className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
                          <Camera className="h-5 w-5" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Upload logo công ty</p>
                        <p className="text-xs text-slate-400">PNG/JPG tối đa 1MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Tên công ty</Label>
                        <Input
                          id="companyName"
                          value={settings.companyName}
                          onChange={(event) => setSettings((prev) => ({ ...prev, companyName: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Đơn vị tiền tệ</Label>
                        <Select
                          value={settings.currency}
                          onValueChange={(value) => setSettings((prev) => ({ ...prev, currency: value as SystemSettingsData['currency'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VND">VND</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <Select
                          value={settings.theme}
                          onValueChange={(value) => setSettings((prev) => ({ ...prev, theme: value as SystemSettingsData['theme'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Sáng</SelectItem>
                            <SelectItem value="dark">Tối</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language">Ngôn ngữ</Label>
                        <Select
                          value={settings.language}
                          onValueChange={(value) => setSettings((prev) => ({ ...prev, language: value as SystemSettingsData['language'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email">
                <div className="grid gap-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="smtpServer">SMTP Server</Label>
                      <div className="relative">
                        <Input
                          id="smtpServer"
                          value={settings.emailConfig.smtpServer}
                          onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            emailConfig: { ...prev.emailConfig, smtpServer: event.target.value },
                          }))}
                        />
                        <Server className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">Cổng SMTP</Label>
                      <div className="relative">
                        <Input
                          id="smtpPort"
                          value={settings.emailConfig.port}
                          onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            emailConfig: { ...prev.emailConfig, port: event.target.value },
                          }))}
                        />
                        <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromAddress">Email gửi</Label>
                    <div className="relative">
                      <Input
                        id="fromAddress"
                        value={settings.emailConfig.fromAddress}
                        onChange={(event) => setSettings((prev) => ({
                          ...prev,
                          emailConfig: { ...prev.emailConfig, fromAddress: event.target.value },
                        }))}
                      />
                      <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="backup">
                <div className="grid gap-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="backupEnabled">Backup tự động</Label>
                      <Select
                        value={settings.backupConfig.enabled ? 'enabled' : 'disabled'}
                        onValueChange={(value) => setSettings((prev) => ({
                          ...prev,
                          backupConfig: { ...prev.backupConfig, enabled: value === 'enabled' },
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enabled">Bật</SelectItem>
                          <SelectItem value="disabled">Tắt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backupFrequency">Tần suất</Label>
                      <Select
                        value={settings.backupConfig.frequency}
                        onValueChange={(value) => setSettings((prev) => ({
                          ...prev,
                          backupConfig: { ...prev.backupConfig, frequency: value as BackupConfig['frequency'] },
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Hàng ngày</SelectItem>
                          <SelectItem value="weekly">Hàng tuần</SelectItem>
                          <SelectItem value="monthly">Hàng tháng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retentionDays">Giữ backup (ngày)</Label>
                    <Input
                      id="retentionDays"
                      type="number"
                      min={1}
                      value={settings.backupConfig.retentionDays}
                      onChange={(event) => setSettings((prev) => ({
                        ...prev,
                        backupConfig: { ...prev.backupConfig, retentionDays: Number(event.target.value) },
                      }))}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Backup tự động giúp bảo vệ dữ liệu khi có sự cố.
                    </div>
                    <p className="mt-2">Khi bật backup, hệ thống sẽ giả lập lưu file cấu hình định kỳ và cảnh báo nếu quá hạn giữ.</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
