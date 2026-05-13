import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Factory, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [msnv, setMsnv] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(msnv, password, rememberMe);
      if (success) {
        if (rememberMe) {
          localStorage.setItem('rememberedUser', msnv);
        } else {
          localStorage.removeItem('rememberedUser');
        }
        navigate('/');
      } else {
        setError('MSNV hoặc mật khẩu không đúng');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi đăng nhập');
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered user on component mount
  React.useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
      setMsnv(rememberedUser);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Nền xanh nổi bật hơn với hiệu ứng dandelion */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-500">
        {/* Dandelion seeds animation hoạt động - SỬ DỤNG CLASSES THAY VÌ INLINE STYLES */}
        <div className="absolute inset-0">
          {/* Dandelion seed 1 - Bay theo đường cong */}
          <div className="absolute top-20 left-10 animate-dandelion-curve">
            <div className="relative animate-dandelion-rotate-clockwise">
              <div className="w-12 h-12 opacity-80">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-8 bg-white rounded-full shadow-lg"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-6 h-0.5 bg-white/90 rounded-full origin-left shadow-sm"
                      style={{
                        transform: `rotate(${i * 22.5}deg)`,
                        transformOrigin: '0 50%'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dandelion seed 2 - Vịnh ngoằn ngoèo */}
          <div className="absolute top-40 right-20 animate-dandelion-zigzag">
            <div className="relative animate-dandelion-rotate-counter">
              <div className="w-10 h-10 opacity-75">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-6 bg-white rounded-full shadow-lg"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-5 h-0.5 bg-white/90 rounded-full origin-left shadow-sm"
                      style={{
                        transform: `rotate(${i * 30}deg)`,
                        transformOrigin: '0 50%'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dandelion seed 3 - Bay xoáy */}
          <div className="absolute bottom-32 left-1/4 animate-dandelion-spiral">
            <div className="relative animate-dandelion-rotate-slow">
              <div className="w-14 h-14 opacity-70">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-10 bg-white rounded-full shadow-lg"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-7 h-0.5 bg-white/90 rounded-full origin-left shadow-sm"
                      style={{
                        transform: `rotate(${i * 18}deg)`,
                        transformOrigin: '0 50%'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dandelion seed 4 - Bay lượn sóng */}
          <div className="absolute top-60 right-1/3 animate-dandelion-wave">
            <div className="relative animate-dandelion-rotate-clockwise">
              <div className="w-8 h-8 opacity-85">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-5 bg-white rounded-full shadow-lg"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-4 h-0.5 bg-white/90 rounded-full origin-left shadow-sm"
                      style={{
                        transform: `rotate(${i * 50}deg)`,
                        transformOrigin: '0 50%'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dandelion seed 5 - Bay theo hình 8 */}
          <div className="absolute bottom-20 right-10 animate-dandelion-figure8">
            <div className="relative animate-dandelion-rotate-counter">
              <div className="w-11 h-11 opacity-78">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-7 bg-white rounded-full shadow-lg"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(14)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-5.5 h-0.5 bg-white/90 rounded-full origin-left shadow-sm"
                      style={{
                        transform: `rotate(${i * 25.7}deg)`,
                        transformOrigin: '0 50%'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dandelion seed 6 - Bay nhẹ nhàng */}
          <div className="absolute top-1/3 left-1/6 animate-dandelion-gentle">
            <div className="relative animate-dandelion-rotate-slow">
              <div className="w-9 h-9 opacity-83">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-6 bg-white rounded-full shadow-lg"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-4.5 h-0.5 bg-white/90 rounded-full origin-left shadow-sm"
                      style={{
                        transform: `rotate(${i * 45}deg)`,
                        transformOrigin: '0 50%'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Thêm 3 hạt bồ công anh nữa để dễ thấy */}
          <div className="absolute top-1/2 left-1/2 animate-dandelion-curve">
            <div className="relative animate-dandelion-rotate-clockwise">
              <div className="w-10 h-10 opacity-90">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-6 bg-white rounded-full shadow-lg"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-5 h-0.5 bg-white rounded-full origin-left shadow-sm"
                      style={{
                        transform: `rotate(${i * 50}deg)`,
                        transformOrigin: '0 80%'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-80 left-20 animate-dandelion-wave">
            <div className="relative animate-dandelion-rotate-counter">
              <div className="w-8 h-8 opacity-85">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-5 bg-white rounded-full shadow-lg"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-4 h-0.5 bg-white rounded-full origin-left shadow-sm"
                      style={{
                        transform: `rotate(${i * 45}deg)`,
                        transformOrigin: '0 50%'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-40 right-1/4 animate-dandelion-gentle">
            <div className="relative animate-dandelion-rotate-slow">
              <div className="w-6 h-6 opacity-80">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0.5 h-4 bg-white rounded-full shadow-lg"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-0.5 bg-white rounded-full origin-left shadow-sm"
                      style={{
                        transform: `rotate(${i * 60}deg)`,
                        transformOrigin: '0 50%'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login form */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo AlphaECC lớn */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <img 
              src="assets/logo alphaecc.png" 
              alt="AlphaEcc logo" 
              className="h-30 mx-auto drop-shadow-2x1 filter brightness-130 contrast-140"
            />
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg tracking-wide">
            Xưởng CNC-CK
          </h1>
          <p className="text-white/95 text-lg font-medium drop-shadow-md">
            Hệ thống quản lý kho nôi bộ
          </p>
        </div>

        {/* Form đăng nhập */}
        <Card className="bg-white/25 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl text-white font-bold drop-shadow-md">
              Đăng nhập
            </CardTitle>
            <CardDescription className="text-white/90 font-medium drop-shadow-sm">
              Nhập thông tin để truy cập hệ thống
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="msnv" className="text-sm font-semibold text-white drop-shadow-sm">
                  Mã số nhân viên
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-white/80" />
                  <Input
                    id="msnv"
                    type="text"
                    value={msnv}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMsnv(e.target.value)}
                    placeholder="Nhập MSNV"
                    className="pl-12 h-10 bg-white/30 border-white/60 text-white placeholder:text-white/70 focus:border-white/80 focus:ring-white/50 backdrop-blur-sm font-medium rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-white drop-shadow-sm">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-white/80" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="pl-12 pr-12 h-10 bg-white/30 border-white/60 text-white placeholder:text-white/70 focus:border-white/80 focus:ring-white/50 backdrop-blur-sm font-medium rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-0 text-white/120 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Ghi nhớ đăng nhập với checkbox tùy chỉnh */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <label
                    htmlFor="remember"
                    className="flex items-center cursor-pointer"
                  >
                    <div className={`w-5 h-5 rounded border-2 border-white/60 bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 ${
                      rememberMe ? 'bg-white/40 border-white/80' : 'hover:bg-white/30'
                    }`}>
                      {rememberMe && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="ml-3 text-sm font-medium text-white/95 drop-shadow-sm">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <Alert className="border-red-300/60 bg-red-500/30 backdrop-blur-sm rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-200" />
                  <AlertDescription className="text-red-100 font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-white/35 hover:bg-white/45 text-white font-semibold border border-white/60 backdrop-blur-sm transition-all duration-300 shadow-lg rounded-xl"
              >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>

            {/* Demo/account helper UI removed per user request */}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-red/80 font-medium drop-shadow-sm">
            © 2026 Alpha ECC - Xưởng CNC-CK Production Management System
          </p>
          <p className="text-xs text-red/60 font-medium drop-shadow-sm">
            Designer: Nguyễn Trường Sơn
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;