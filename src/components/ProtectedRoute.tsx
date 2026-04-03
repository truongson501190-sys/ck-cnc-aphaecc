import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserPermissions } from '@/types/user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'user';
  requiredModule?: keyof UserPermissions;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredModule,
}) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check:', {
    isAuthenticated,
    user: user ? { msnv: user.msnv, role: user.role } : null,
    requiredRole,
    requiredModule,
    path: location.pathname,
  });

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirement via hierarchy
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

  // Check module-based view permission
  if (requiredModule) {
    const canView = !!user.permissions?.[requiredModule]?.view;
    if (!canView) {
      console.log('❌ No module view permission:', {
        requiredModule,
        user: user.msnv,
      });
      return <Navigate to="/" replace />;
    }
  }

  console.log('✅ Access granted');
  return <>{children}</>;
};

// Helper function to check role permissions
function checkRolePermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    admin: ['admin', 'manager', 'user'],
    manager: ['manager', 'user'],
    user: ['user'],
  };

  const allowedRoles = roleHierarchy[userRole as keyof typeof roleHierarchy] || [];
  return allowedRoles.includes(requiredRole);
}

export default ProtectedRoute;