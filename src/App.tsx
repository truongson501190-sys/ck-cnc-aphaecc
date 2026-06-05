import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './supabase';
import { ProductionSummary, ToolsUsage, ToolsDamage, CostBreakdown } from '@/modules/reports/machining';
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
  WarehousesPage,
  MachinesPage,
  ProjectsPage,
} from '@/modules/master-data';
import { PlaceholderPage } from '@/modules/erp/PlaceholderPage';
import Roles from '@/modules/system/pages/Roles';
import BackupRestore from '@/modules/system/pages/BackupRestore';
import AuditLog from '@/modules/system/pages/AuditLog';
import SystemSettings from '@/modules/system/pages/SystemSettings';
import Profile from '@/modules/account/pages/Profile';
import ChangePassword from '@/modules/account/pages/ChangePassword';
import { ErpBootstrap } from '@/shared/layout/ErpBootstrap';
import { ERP_ROUTE } from '@/modules/erp/routes';

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


                {/* Warehouse Management System (WMS) */}
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

                {/* Manufacturing — Daily Operational Logs */}
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

                {/* Reports — Analytics & Dashboards Only */}
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
                
                {/* 1. ĐỊNH TUYẾN GỐC CHO NÚT "CHỜ DUYỆT" */}
                <Route
                  path={ERP_ROUTE.reports.pendingApproval}
                  element={
                    <ProtectedRoute requiredModule="cho_duyet">
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
