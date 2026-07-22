// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import ProtectedRoute from '@/shared/layout/ProtectedRoute';
import Layout from '@/components/Layout';
import { ERP_ROUTE } from '@/modules/erp/routes';
import { ErpBootstrap } from '@/shared/layout/ErpBootstrap';
import './supabase';
import './i18n';

// ============================================================
// 1. LAZY LOAD COMPONENTS (Tối ưu performance)
// ============================================================

// Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Index = lazy(() => import('./pages/Index'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

// Warehouse
const NhapKho = lazy(() => import('@/modules/warehouse').then(m => ({ default: m.NhapKho })));
const XuatKho = lazy(() => import('@/modules/warehouse').then(m => ({ default: m.XuatKho })));
const ChuyenKho = lazy(() => import('@/modules/warehouse').then(m => ({ default: m.ChuyenKho })));
const XuatDau = lazy(() => import('@/modules/warehouse').then(m => ({ default: m.XuatDau })));
const InventoryCount = lazy(() => import('@/modules/warehouse').then(m => ({ default: m.InventoryCount })));
const StockCard = lazy(() => import('@/modules/warehouse').then(m => ({ default: m.StockCard })));
const TransactionHistory = lazy(() => import('@/modules/warehouse').then(m => ({ default: m.TransactionHistory })));
const WarehouseReport = lazy(() => import('@/modules/warehouse').then(m => ({ default: m.WarehouseReport })));

// Manufacturing
const ProductionPlan = lazy(() => import('@/modules/manufacturing').then(m => ({ default: m.ProductionPlan })));
const ProgressTracking = lazy(() => import('@/modules/manufacturing').then(m => ({ default: m.ProgressTracking })));

// Reports
const ProductionSummary = lazy(() => import('@/modules/reports/machining').then(m => ({ default: m.ProductionSummary })));
const ToolsUsage = lazy(() => import('@/modules/reports/machining').then(m => ({ default: m.ToolsUsage })));
const ToolsDamage = lazy(() => import('@/modules/reports/machining').then(m => ({ default: m.ToolsDamage })));
const CostBreakdown = lazy(() => import('@/modules/reports/machining').then(m => ({ default: m.CostBreakdown })));
const DashboardSummary = lazy(() => import('@/modules/reports').then(m => ({ default: m.DashboardSummary })));
const InventoryPage = lazy(() => import('@/modules/reports').then(m => ({ default: m.InventoryPage })));
const ProductionReportPage = lazy(() => import('@/modules/reports').then(m => ({ default: m.ProductionReportPage })));
const MaintenanceReport = lazy(() => import('@/modules/reports').then(m => ({ default: m.MaintenanceReport })));
const QcReportPage = lazy(() => import('@/modules/reports').then(m => ({ default: m.QcReportPage })));
const MachinePerformancePage = lazy(() => import('@/modules/reports').then(m => ({ default: m.MachinePerformancePage })));
const PendingApprovalList = lazy(() => import('@/modules/reports').then(m => ({ default: m.PendingApprovalList })));
const QCReport = lazy(() => import('@/modules/reports').then(m => ({ default: m.QCReport })));

// Master Data
const CategoriesPage = lazy(() => import('@/modules/master-data').then(m => ({ default: m.CategoriesPage })));
const WarehousesPage = lazy(() => import('@/modules/master-data').then(m => ({ default: m.WarehousesPage })));
const MachinesPage = lazy(() => import('@/modules/master-data').then(m => ({ default: m.MachinesPage })));
const ProjectsPage = lazy(() => import('@/modules/master-data').then(m => ({ default: m.ProjectsPage })));

// System
const Roles = lazy(() => import('@/modules/system/pages/Roles'));
const BackupRestore = lazy(() => import('@/modules/system/pages/BackupRestore'));
const AuditLog = lazy(() => import('@/modules/system/pages/AuditLog'));
const SystemSettings = lazy(() => import('@/modules/system/pages/SystemSettings'));

// Account
const Profile = lazy(() => import('@/modules/account/pages/Profile'));
const ChangePassword = lazy(() => import('@/modules/account/pages/ChangePassword'));

// Placeholder
const PlaceholderPage = lazy(() => import('@/modules/erp/PlaceholderPage'));

// ============================================================
// 2. QUERY CLIENT CONFIG
// ============================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ============================================================
// 3. APP COMPONENT
// ============================================================
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster 
            richColors 
            position="top-right" 
            expand={true}
            closeButton
            toastOptions={{
              style: {
                borderRadius: '12px',
                padding: '16px',
              },
              duration: 4000,
            }}
          />
          <AuthProvider>
            <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-gray-900 dark:text-gray-100">
              <ErpBootstrap />
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<LoadingSpinner fullScreen />}>
                  <Routes>
                    {/* Authentication */}
                    <Route path={ERP_ROUTE.login} element={<LoginPage />} />
                    <Route path="/login" element={<Navigate to={ERP_ROUTE.login} replace />} />
                    
                    {/* Protected Routes with Layout */}
                    <Route path="/" element={<Layout />}>
                      {/* Dashboard */}
                      <Route
                        path={ERP_ROUTE.dashboard}
                        element={
                          <ProtectedRoute>
                            <Index />
                          </ProtectedRoute>
                        }
                      />
                      
                      {/* User Management */}
                      <Route
                        path={ERP_ROUTE.system.users}
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <UserManagement />
                          </ProtectedRoute>
                        }
                      />

                      {/* Master Data */}
                      <Route
                        path={ERP_ROUTE.masterData.categories}
                        element={
                          <ProtectedRoute requiredModule="chung_loai">
                            <CategoriesPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.masterData.locations}
                        element={
                          <ProtectedRoute requiredModule="kho">
                            <WarehousesPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.masterData.machines}
                        element={
                          <ProtectedRoute requiredModule="may_moc">
                            <MachinesPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.masterData.projects}
                        element={
                          <ProtectedRoute requiredModule="du_an">
                            <ProjectsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Warehouse */}
                      <Route
                        path={ERP_ROUTE.warehouse.import}
                        element={
                          <ProtectedRoute requiredModule="nhap_kho">
                            <NhapKho />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.warehouse.export}
                        element={
                          <ProtectedRoute requiredModule="xuat_kho">
                            <XuatKho />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.warehouse.transfer}
                        element={
                          <ProtectedRoute requiredModule="chuyen_kho">
                            <ChuyenKho />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.warehouse.oil}
                        element={
                          <ProtectedRoute requiredModule="xuat_dau">
                            <XuatDau />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.warehouse.inventoryCount}
                        element={
                          <ProtectedRoute requiredModule="kiem_ke_kho">
                            <InventoryCount />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.warehouse.stockCard}
                        element={
                          <ProtectedRoute requiredModule="the_kho">
                            <StockCard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.warehouse.transactionHistory}
                        element={
                          <ProtectedRoute requiredModule="lich_su_giao_dich">
                            <TransactionHistory />
                          </ProtectedRoute>
                        }
                      />

                      {/* Manufacturing */}
                      <Route
                        path={ERP_ROUTE.manufacturing.machiningLog}
                        element={
                          <ProtectedRoute requiredModule="nhat_ky_gia_cong">
                            <ProductionReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.manufacturing.qcLog}
                        element={
                          <ProtectedRoute requiredModule="nhat_ky_qc">
                            <QcReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.manufacturing.maintenanceLog}
                        element={
                          <ProtectedRoute requiredModule="nhat_ky_bao_tri">
                            <MaintenanceReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.manufacturing.plan}
                        element={
                          <ProtectedRoute requiredModule="ke_hoach_san_xuat">
                            <ProductionPlan />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.manufacturing.progress}
                        element={
                          <ProtectedRoute requiredModule="theo_doi_tien_do">
                            <ProgressTracking />
                          </ProtectedRoute>
                        }
                      />

                      {/* Reports */}
                      <Route
                        path={ERP_ROUTE.reports.summary}
                        element={
                          <ProtectedRoute requiredModule="dashboard_tong_hop">
                            <DashboardSummary />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.inventory}
                        element={
                          <ProtectedRoute requiredModule="ton_kho">
                            <InventoryPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.warehouse}
                        element={
                          <ProtectedRoute requiredModule="bao_cao_kho">
                            <WarehouseReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.machining.production}
                        element={
                          <ProtectedRoute requiredModule="bao_cao_gia_cong">
                            <ProductionSummary />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.machining.tools}
                        element={
                          <ProtectedRoute requiredModule="bao_cao_gia_cong">
                            <ToolsUsage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.machining.damage}
                        element={
                          <ProtectedRoute requiredModule="bao_cao_gia_cong">
                            <ToolsDamage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.machining.cost}
                        element={
                          <ProtectedRoute requiredModule="bao_cao_gia_cong">
                            <CostBreakdown />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.qc}
                        element={
                          <ProtectedRoute requiredModule="bao_cao_qc">
                            <QCReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.maintenance}
                        element={
                          <ProtectedRoute requiredModule="bao_cao_bao_tri">
                            <PlaceholderPage
                              title="Báo cáo bảo trì"
                              description="Thống kê bảo trì, MTBF và chi phí phụ tùng (tổng hợp từ nhật ký bảo trì)."
                            />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.machinePerformance}
                        element={
                          <ProtectedRoute requiredModule="hieu_suat_may">
                            <MachinePerformancePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.reports.pendingApproval}
                        element={
                          <ProtectedRoute requiredModule="cho_duyet">
                            <PendingApprovalList />
                          </ProtectedRoute>
                        }
                      />

                      {/* System */}
                      <Route
                        path={ERP_ROUTE.system.roles}
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <Roles />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.system.auditLog}
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AuditLog />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.system.backupRestore}
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <BackupRestore />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.system.settings}
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <SystemSettings />
                          </ProtectedRoute>
                        }
                      />

                      {/* Account */}
                      <Route
                        path={ERP_ROUTE.account.profile}
                        element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path={ERP_ROUTE.account.changePassword}
                        element={
                          <ProtectedRoute>
                            <ChangePassword />
                          </ProtectedRoute>
                        }
                      />

                      {/* Redirects */}
                      <Route path="/pending-approval" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                      <Route path="/pending" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                      <Route path="/reports/pending" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                      <Route path="/reports/pending-approval" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                      <Route path="/reports/pendingApproval" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                      <Route path="/cho-duyet" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                      <Route path="/reports/cho-duyet" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />

                      {/* 404 */}
                      <Route path="*" element={<Navigate to={ERP_ROUTE.dashboard} replace />} />
                    </Route>
                  </Routes>
                </Suspense>
              </Router>
            </div>
          </AuthProvider>
        </TooltipProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;