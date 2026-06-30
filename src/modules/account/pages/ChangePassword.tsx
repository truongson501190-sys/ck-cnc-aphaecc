import { useMemo, useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeService } from '@/services/employeeService';
import { toast } from 'sonner';
import { hashPassword, verifyPassword } from '@/lib/passwordUtils';

function evaluateStrength(password: string) {
  const points = [
    password.length >= 6,
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
  const { user, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => evaluateStrength(newPassword), [newPassword]);
  const passwordMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isValidLength = newPassword.length >= 6;
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!user) {
      toast.error('Bạn phải đăng nhập để đổi mật khẩu');
      return;
    }

    if (!oldPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (!newPassword) {
      toast.error('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (!isValidLength) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (!hasLower) {
      toast.error('Mật khẩu mới phải có chữ thường');
      return;
    }

    if (!hasNumber) {
      toast.error('Mật khẩu mới phải có chữ số');
      return;
    }

    if (!passwordMatch) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (oldPassword === newPassword) {
      toast.error('Mật khẩu mới không được giống mật khẩu cũ');
      return;
    }

    setSubmitting(true);

    try {
      // Get current employee from Supabase
      const emp = await EmployeeService.getByMsnv(user.msnv);
      if (!emp) {
        toast.error('Không tìm thấy thông tin người dùng');
        setSubmitting(false);
        return;
      }

      // Verify old password
      const isCurrentPasswordCorrect = await verifyPassword(oldPassword, emp.password_hash);
      if (!isCurrentPasswordCorrect) {
        toast.error('Mật khẩu hiện tại không đúng');
        setSubmitting(false);
        return;
      }

      // Hash new password and update
      const newHashedPassword = await hashPassword(newPassword);
      await EmployeeService.update(user.msnv, {
        password_hash: newHashedPassword
      });

      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.');

      // Reset form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Logout and redirect to login
      setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, 2000);

    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error('Có lỗi xảy ra khi lưu mật khẩu mới: ' + error.message);
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
              {/* Mật khẩu hiện tại */}
              <div className="space-y-2">
                <Label htmlFor="old-password">Mật khẩu hiện tại</Label>
                <div className="relative">
                  <Input
                    id="old-password"
                    type={showOld ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu hiện tại"
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                    disabled={submitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500"
                    onClick={() => setShowOld((prev) => !prev)}
                  >
                    {showOld ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div className="space-y-2">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự, có chữ thường và số)"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={submitting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500"
                    onClick={() => setShowNew((prev) => !prev)}
                  >
                    {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={submitting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500"
                    onClick={() => setShowConfirm((prev) => !prev)}
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Độ mạnh mật khẩu */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="h-5 w-5 text-sky-500" />
                  <span>Độ mạnh mật khẩu: {strength.label}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className={`${strength.color} h-2 transition-all duration-300`} style={{ width: `${strength.score}%` }} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <p className={`flex items-center gap-2 ${isValidLength ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isValidLength ? '✓' : '•'} Ít nhất 6 ký tự
                  </p>
                  <p className={`flex items-center gap-2 ${hasLower ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {hasLower ? '✓' : '•'} Có chữ thường
                  </p>
                  <p className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {hasNumber ? '✓' : '•'} Có chữ số
                  </p>
                  <p className={`flex items-center gap-2 ${passwordMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {passwordMatch ? '✓' : '•'} Mật khẩu xác nhận khớp
                  </p>
                </div>
              </div>

              {/* Button */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button 
                  type="submit" 
                  disabled={submitting || !oldPassword || !newPassword || !confirmPassword || !passwordMatch}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </Button>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Mật khẩu mới phải đủ mạnh để bảo mật hệ thống.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}