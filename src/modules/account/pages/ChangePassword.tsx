import { useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import { toast } from 'sonner';

interface UserRecord {
  id: string;
  msnv: string;
  fullName: string;
  department: string;
  position: string;
  role: string;
  status: boolean;
  passwordHash: string;
  createdAt: string;
  lastLogin?: string | Date;
  [key: string]: unknown;
}

function evaluateStrength(password: string) {
  const points = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (points >= 5) return { label: 'Rất mạnh', color: 'bg-emerald-500', score: 100 };
  if (points >= 4) return { label: 'Mạnh', color: 'bg-sky-500', score: 80 };
  if (points >= 3) return { label: 'Trung bình', color: 'bg-amber-500', score: 60 };
  return { label: 'Yếu', color: 'bg-rose-500', score: 40 };
}

export default function ChangePassword() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => evaluateStrength(newPassword), [newPassword]);
  const passwordMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isValidLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast.error('Bạn phải đăng nhập để đổi mật khẩu');
      return;
    }

    const allUsers = loadArrayFromStorage<UserRecord>('userRecords');
    const currentRecord = allUsers.find((record) => record.msnv === user.msnv && record.status === true);

    if (!currentRecord) {
      toast.error('Không tìm thấy thông tin người dùng');
      return;
    }

    if (!oldPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (currentRecord.passwordHash !== oldPassword) {
      toast.error('Mật khẩu hiện tại không đúng');
      return;
    }

    if (!isValidLength || !hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      toast.error('Mật khẩu mới chưa đủ mạnh');
      return;
    }

    if (!passwordMatch) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setSubmitting(true);
    try {
      const updated = allUsers.map((record) =>
        record.msnv === user.msnv ? { ...record, passwordHash: newPassword } : record
      );
      saveArrayToStorage('userRecords', updated);
      toast.success('Đổi mật khẩu thành công');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi lưu mật khẩu mới');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Đổi mật khẩu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 text-slate-700 dark:text-slate-300">
              <p className="text-sm leading-6">
                Vui lòng nhập mật khẩu hiện tại và mật khẩu mới. Hệ thống sẽ kiểm tra độ mạnh và xác nhận.
              </p>
            </div>
            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="old-password">Mật khẩu hiện tại</Label>
                <div className="relative">
                  <Input
                    id="old-password"
                    type={showOld ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu hiện tại"
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500"
                    onClick={() => setShowOld((prev) => !prev)}
                    aria-label={showOld ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  >
                    {showOld ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500"
                    onClick={() => setShowNew((prev) => !prev)}
                    aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  >
                    {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="h-5 w-5 text-sky-500" />
                  <span>Độ mạnh mật khẩu: {strength.label}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className={`${strength.color} h-2`} style={{ width: `${strength.score}%` }} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <p className={isValidLength ? 'text-emerald-500' : 'text-rose-500'}>• Ít nhất 8 ký tự</p>
                  <p className={hasUpper ? 'text-emerald-500' : 'text-rose-500'}>• Có chữ hoa</p>
                  <p className={hasLower ? 'text-emerald-500' : 'text-rose-500'}>• Có chữ thường</p>
                  <p className={hasNumber ? 'text-emerald-500' : 'text-rose-500'}>• Có chữ số</p>
                  <p className={hasSymbol ? 'text-emerald-500' : 'text-rose-500'}>• Có ký tự đặc biệt</p>
                  <p className={passwordMatch ? 'text-emerald-500' : 'text-rose-500'}>• Mật khẩu xác nhận khớp</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </Button>
                <p className="text-sm text-slate-500 dark:text-slate-400">Mật khẩu mới phải mạnh để bảo mật hệ thống.</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
