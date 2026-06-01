import React from 'react';

import {
  Navigate,
  useLocation,
} from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'user';
  requiredModule?: string;
}

const checkRolePermission = (userRole: string | undefined, requiredRole: string): boolean => {
  const hierarchy = {
    'admin': 3,
    'manager': 2,
    'user': 1,
  };
  
  const userLevel = hierarchy[userRole as keyof typeof hierarchy] ?? 0;
  const requiredLevel = hierarchy[requiredRole as keyof typeof hierarchy] ?? 0;
  
  return userLevel >= requiredLevel;
};

const ProtectedRoute: React.FC<
  ProtectedRouteProps
> = ({
  children,
  requiredRole,
  requiredModule,
}) => {
  const {
    isAuthenticated,
    user,
  } = useAuth();

  const { canView } = usePermission();

  const location =
    useLocation();

  // =========================
  // CHƯA LOGIN
  // =========================

  if (
    !isAuthenticated ||
    !user
  ) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
        }}
        replace
      />
    );
  }

  // =========================
  // CHECK ROLE REQUIREMENT
  // =========================
  if (requiredRole) {
    const hasRequiredRole = checkRolePermission(user.role, requiredRole);
    if (!hasRequiredRole) {
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
    const hasAccess = canView(requiredModule);
    if (!hasAccess) {
      console.log('❌ No module view permission:', {
        module: requiredModule,
      });
      return <Navigate to="/" replace />;
    }
  }

  // =========================
  // ACCESS ALLOWED
  // =========================

  return <>
    {children}
  </>;
};

export default ProtectedRoute;