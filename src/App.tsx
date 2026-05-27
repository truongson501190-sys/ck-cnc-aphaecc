import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './supabase';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from '@/shared/layout/ProtectedRoute';
import Layout from '@/components/Layout';
import LoginPage from './pages/LoginPage';
import Index from './pages/Index';
import { UserManagement } from './pages/UserManagement';
import { NhapKho, XuatKho, ChuyenKho, XuatDau, InventoryCount, StockCard, TransactionHistory } from '@/modules/warehouse';
import {
  InventoryPage,
  ProductionReportPage,
  MaintenanceReport,
  QcReportPage,
  MachiningReportsPage,
  MachinePerformancePage,
  PendingApprovalList,
  QCReport,
  WarehouseReport,
  DashboardSummary,
} from '@/modules/reports';
import { ProductionPlan, ProgressTracking } from '@/modules/manufacturing';
import {
  CategoriesPage,
  MaterialsPage,
  WarehousesPage,
  MachinesPage,
  ProjectsPage,
  EmployeesPage,
} from '@/modules/master-data';
import { PlaceholderPage } from '@/modules/erp/PlaceholderPage';
import Roles from '@/modules/system/pages/Roles';
import BackupRestore from '@/modules/system/pages/BackupRestore';
import AuditLog from '@/modules/system/pages/AuditLog';
import SystemSettings from '@/modules/system/pages/SystemSettings';
import Profile from '@/modules/account/pages/Profile';
import ChangePassword from '@/modules/account/pages/ChangePassword';
import { ErpBootstrap } from '@/shared/layout/ErpBootstrap';
import { ERP_ROUTE, ERP_LEGACY_REDIRECTS } from '@/modules/erp/routes';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
          <ErpBootstrap />
          <Router>
            <Routes>
              {/* Authentication — không cần Layout */}
              <Route path={ERP_ROUTE.login} element={<LoginPage />} />
              <Route path="/login" element={<Navigate to={ERP_ROUTE.login} replace />} />
              <Route path={ERP_ROUTE.system.base} element={<Navigate to={ERP_ROUTE.login} replace />} />
              <Route path={`${ERP_ROUTE.system.base}/*`} element={<Navigate to={ERP_ROUTE.login} replace />} />
              
              {/* Tất cả route khác — có Layout và Sidebar */}
              <Route path="/" element={<Layout />}>
                {/* Dashboard chính */}
                <Route
                  path={ERP_ROUTE.dashboard}
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.system.users}
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Master Data — Independent Entities */}
                <Route
                  path={ERP_ROUTE.masterData.categories}
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <CategoriesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.masterData.materials}
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <MaterialsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.masterData.locations}
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <WarehousesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.masterData.machines}
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <MachinesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.masterData.projects}
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <ProjectsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.masterData.employees}
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <EmployeesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Warehouse Management System (WMS) */}
                <Route
                  path={ERP_ROUTE.warehouse.import}
                  element={
                    <ProtectedRoute requiredModule="kho-tong">
                      <NhapKho />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.warehouse.export}
                  element={
                    <ProtectedRoute requiredModule="kho-tong">
                      <XuatKho />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.warehouse.transfer}
                  element={
                    <ProtectedRoute requiredModule="kho-tong">
                      <ChuyenKho />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.warehouse.oil}
                  element={
                    <ProtectedRoute requiredModule="kho-dau">
                      <XuatDau />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.warehouse.inventoryCount}
                  element={
                    <ProtectedRoute>
                      <InventoryCount />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.warehouse.stockCard}
                  element={
                    <ProtectedRoute>
                      <StockCard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.warehouse.transactionHistory}
                  element={
                    <ProtectedRoute>
                      <TransactionHistory />
                    </ProtectedRoute>
                  }
                />

                {/* Manufacturing — Daily Operational Logs */}
                <Route
                  path={ERP_ROUTE.manufacturing.machiningLog}
                  element={
                    <ProtectedRoute>
                      <ProductionReportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.manufacturing.qcLog}
                  element={
                    <ProtectedRoute>
                      <QcReportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.manufacturing.maintenanceLog}
                  element={
                    <ProtectedRoute>
                      <MaintenanceReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.manufacturing.plan}
                  element={
                    <ProtectedRoute>
                      <ProductionPlan />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.manufacturing.progress}
                  element={
                    <ProtectedRoute>
                      <ProgressTracking />
                    </ProtectedRoute>
                  }
                />

                {/* Reports — Analytics & Dashboards Only */}
                <Route
                  path={ERP_ROUTE.reports.summary}
                  element={
                    <ProtectedRoute requiredModule="bao-cao-tong-hop">
                      <DashboardSummary />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.reports.inventory}
                  element={
                    <ProtectedRoute requiredModule="bao-cao-tong-hop">
                      <InventoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.reports.warehouse}
                  element={
                    <ProtectedRoute requiredModule="bao-cao-tong-hop">
                      <WarehouseReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.reports.machining}
                  element={
                    <ProtectedRoute requiredModule="bao-cao-tong-hop">
                      <MachiningReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.reports.qc}
                  element={
                    <ProtectedRoute requiredModule="bao-cao-tong-hop">
                      <QCReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.reports.maintenance}
                  element={
                    <ProtectedRoute requiredModule="bao-cao-tong-hop">
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
                    <ProtectedRoute requiredModule="bao-cao-tong-hop">
                      <MachinePerformancePage />
                    </ProtectedRoute>
                  }
                />
                
                {/* 1. ĐỊNH TUYẾN GỐC CHO NÚT "CHỜ DUYỆT" */}
                <Route
                  path={ERP_ROUTE.reports.pendingApproval}
                  element={
                    <ProtectedRoute>
                      <PendingApprovalList />
                    </ProtectedRoute>
                  }
                />

                {/* ⚡ BẪY TẤT CẢ ĐƯỜNG DẪN SAI CỦA NÚT MÀU TÍM TRÊN MÀN HÌNH DASHBOARD ĐỂ ĐẨY VỀ ĐÚNG TRANG TRÊN */}
                <Route path="/pending-approval" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                <Route path="/pending" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                <Route path="/reports/pending" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                <Route path="/reports/pending-approval" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                <Route path="/reports/pendingApproval" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                <Route path="/cho-duyet" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />
                <Route path="/reports/cho-duyet" element={<Navigate to={ERP_ROUTE.reports.pendingApproval} replace />} />

                <Route
                  path={ERP_ROUTE.reports.costing}
                  element={
                    <ProtectedRoute requiredModule="bao-cao-tong-hop">
                      <PlaceholderPage title="Costing" description="Trang quản lý chi phí, giá thành và phân bổ đơn giá." />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ERP_ROUTE.reports.productionKpi}
                  element={
                    <ProtectedRoute requiredModule="bao-cao-tong-hop">
                      <PlaceholderPage title="KPI sản xuất" description="Trang KPI sản xuất và hiệu suất đội nhóm." />
                    </ProtectedRoute>
                  }
                />

                {/* System & Account Security */}
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

                {/* Điều hướng dự phòng Link cũ */}
                {ERP_LEGACY_REDIRECTS.map((redirect) => (
                  <Route key={redirect.from} path={redirect.from} element={<Navigate to={redirect.to} replace />} />
                ))}
                <Route path="*" element={<Navigate to={ERP_ROUTE.dashboard} replace />} />
              </Route>
            </Routes>
          </Router>
        </div>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
