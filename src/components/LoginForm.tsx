// src/components/LoginForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/schemas/auth.schema';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export const LoginForm: React.FC = () => {
  const { login } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => login(data.msnv, data.password, data.rememberMe),
    onSuccess: (success) => {
      if (success) {
        toast({ title: 'Đăng nhập thành công!', variant: 'default' });
      } else {
        toast({ title: 'Đăng nhập thất bại!', variant: 'destructive' });
      }
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="msnv">MSNV</Label>
        <Input
          id="msnv"
          {...register('msnv')}
          className={errors.msnv ? 'border-red-500' : ''}
        />
        {errors.msnv && <p className="text-red-500 text-sm">{errors.msnv.message}</p>}
      </div>

      <div>
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="rememberMe" {...register('rememberMe')} />
        <Label htmlFor="rememberMe">Ghi nhớ đăng nhập</Label>
      </div>

      <Button type="submit" disabled={loginMutation.isPending} className="w-full">
        {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </Button>
    </form>
  );
};