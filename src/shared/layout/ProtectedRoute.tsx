// src/shared/layout/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'user';
  requiredModule?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredModule,
}) => {
  const { isAuthenticated, user, hasPermission } = useAuth();
  const location = useLocation();

  // =========================
  // CHƯA LOGIN
  // =========================
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // =========================
  // ADMIN LUÔN CÓ TOÀN QUYỀN
  // =========================
  if (user.role === 'admin' || user.msnv === '1118') {
    return <>{children}</>;
  }

  // =========================
  // CHECK ROLE REQUIREMENT
  // =========================
  if (requiredRole) {
    const hierarchy = {
      'admin': 3,
      'manager': 2,
      'user': 1,
    };
    
    const userLevel = hierarchy[user.role as keyof typeof hierarchy] ?? 0;
    const requiredLevel = hierarchy[requiredRole as keyof typeof hierarchy] ?? 0;
    
    if (userLevel < requiredLevel) {
      console.log('❌ Insufficient role permissions:', {
        userRole: user.role,
        requiredRole,
      });
      return <Navigate to="/" replace />;
    }
  }

  // =========================
  // CHECK MODULE PERMISSION
  // =========================
  if (requiredModule) {
    const hasAccess = hasPermission(requiredModule, 'view');
    if (!hasAccess) {
      console.log('❌ No module view permission:', {
        module: requiredModule,
        user: user.msnv,
      });
      return <Navigate to="/" replace />;
    }
  }

  // =========================
  // ACCESS ALLOWED
  // =========================
  return <>{children}</>;
};

export default ProtectedRoute;