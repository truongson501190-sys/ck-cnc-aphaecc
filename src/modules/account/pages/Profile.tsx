import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{8,15}$/;

export default function Profile() {
  const { user, updateProfile } = useAuth();

  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    setAvatarPreview(user.avatarUrl || '');
    setFullName(user.fullName || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setAddress(user.address || '');
  }, [user]);

  const emailValid = useMemo(
    () => (email ? EMAIL_REGEX.test(email) : true),
    [email]
  );

  const phoneValid = useMemo(
    () => (phone ? PHONE_REGEX.test(phone) : true),
    [phone]
  );

  const canSave = Boolean(
    fullName.trim() &&
    emailValid &&
    phoneValid
  );

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn ảnh hợp lệ');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!canSave) {
      toast.error('Vui lòng kiểm tra lại thông tin');
      return;
    }

    setSubmitting(true);

    try {
      updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        avatarUrl: avatarPreview,
      });

      toast.success('Cập nhật hồ sơ thành công');
    } catch (error) {
      toast.error('Cập nhật hồ sơ thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-700 dark:text-slate-200">
            Bạn cần đăng nhập để truy cập hồ sơ cá nhân.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            {/* NÚT QUAY VỀ TRANG CHỦ */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.location.href = '/'}
              className="h-10 w-10 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                Hồ sơ cá nhân
              </h1>

              <p className="text-sm text-slate-600 dark:text-slate-400">
                Cập nhật thông tin liên hệ và ảnh đại diện của bạn.
              </p>
            </div>

          </div>

        </div>

        <Card className="overflow-hidden">

          <CardHeader>
            <CardTitle>
              Thông tin tài khoản
            </CardTitle>
          </CardHeader>

          <CardContent>

            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

              {/* LEFT */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                <div className="flex flex-col items-center gap-4 text-center">

                  <div className="relative">

                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="h-32 w-32 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <UserCircle className="h-16 w-16" />
                      </div>
                    )}

                    <label className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800">

                      <Camera className="h-5 w-5" />

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />

                    </label>

                  </div>

                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {user.fullName}
                    </p>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {user.position || 'Nhân viên'}
                    </p>
                  </div>

                  <div className="space-y-2 text-left text-sm text-slate-600 dark:text-slate-400">

                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        MSNV:
                      </span>{' '}
                      {user.msnv}
                    </p>

                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        Vai trò:
                      </span>{' '}
                      {user.role}
                    </p>

                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        Đơn vị:
                      </span>{' '}
                      {user.department}
                    </p>

                  </div>

                </div>

              </div>

              {/* RIGHT */}
              <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      Họ và tên
                    </Label>

                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">

                    <Label htmlFor="email">
                      Email
                    </Label>

                    <div className="relative">

                      <Input
                        id="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                      />

                      <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    </div>

                    {!emailValid && (
                      <p className="text-sm text-rose-500">
                        Email không hợp lệ.
                      </p>
                    )}

                  </div>

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="space-y-2">

                    <Label htmlFor="phone">
                      Số điện thoại
                    </Label>

                    <div className="relative">

                      <Input
                        id="phone"
                        value={phone}
                        onChange={(event) =>
                          setPhone(event.target.value)
                        }
                      />

                      <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    </div>

                    {!phoneValid && (
                      <p className="text-sm text-rose-500">
                        Số điện thoại chỉ chứa 8-15 chữ số.
                      </p>
                    )}

                  </div>

                  <div className="space-y-2">

                    <Label htmlFor="address">
                      Địa chỉ
                    </Label>

                    <div className="relative">

                      <Input
                        id="address"
                        value={address}
                        onChange={(event) =>
                          setAddress(event.target.value)
                        }
                      />

                      <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    </div>

                  </div>

                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">

                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />

                    <span>
                      Thông tin luôn được cập nhật khi lưu.
                    </span>

                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={!canSave || submitting}
                  >
                    {submitting
                      ? 'Đang lưu...'
                      : 'Lưu hồ sơ'}
                  </Button>

                </div>

              </div>

            </div>

          </CardContent>

        </Card>

      </div>
    </div>
  );
}