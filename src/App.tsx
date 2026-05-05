import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './supabase'; // init supabase

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import Index from './pages/Index';
import { UserManagement } from './pages/UserManagement';
import { QuanLyDanhMuc } from './pages/QuanLyDanhMuc';
import { NhapKho } from './pages/NhapKho';
import { XuatKho } from './pages/XuatKho';
import { ChuyenKho } from './pages/ChuyenKho';
import { XuatDau } from './pages/XuatDau';
import { TonKho } from './pages/TonKho';

// UI
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

// React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ✅ tạo 1 lần duy nhất
const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />

        <AuthProvider>
          <Router>
            <Routes>

              {/* ================= PUBLIC ================= */}
              <Route path="/login" element={<LoginPage />} />

              {/* ================= REDIRECT ================= */}
              <Route path="/" element={<Navigate to="/trang-chu" replace />} />

              {/* ================= MAIN ================= */}
              <Route
                path="/trang-chu"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />

              {/* ================= BÁO CÁO ================= */}
              <Route
                path="/ton-kho"
                element={
                  <ProtectedRoute requiredModule="bao-cao-tong-hop">
                    <TonKho />
                  </ProtectedRoute>
                }
              />

              {/* ================= ADMIN ================= */}
              <Route
                path="/user-management"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              {/* ================= MANAGER + ADMIN ================= */}
              <Route
                path="/quan-ly-danh-muc"
                element={
                  <ProtectedRoute requiredRole="manager">
                    <QuanLyDanhMuc />
                  </ProtectedRoute>
                }
              />

              {/* ================= KHO TỔNG ================= */}
              <Route
                path="/nhap-kho"
                element={
                  <ProtectedRoute requiredModule="kho-tong">
                    <NhapKho />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/xuat-kho"
                element={
                  <ProtectedRoute requiredModule="kho-tong">
                    <XuatKho />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/chuyen-kho"
                element={
                  <ProtectedRoute requiredModule="kho-tong">
                    <ChuyenKho />
                  </ProtectedRoute>
                }
              />

              {/* ================= KHO DẦU ================= */}
              <Route
                path="/xuat-dau"
                element={
                  <ProtectedRoute requiredModule="kho-dau">
                    <XuatDau />
                  </ProtectedRoute>
                }
              />

              {/* ================= 404 ================= */}
              <Route path="*" element={<Navigate to="/trang-chu" replace />} />

            </Routes>
          </Router>
        </AuthProvider>

      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;