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
    // ✅ Kiểm tra user.role có tồn tại không
    if (!user.role) {
      console.log('❌ User has no role assigned');
      return <Navigate to="/" replace />;
    }
    
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
    const canView = !!user.permissions?.[requiredModule];
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
  const roleHierarchy: Record<string, string[]> = {
    admin: ['admin', 'manager', 'user'],
    manager: ['manager', 'user'],
    user: ['user'],
  };

  const allowedRoles = roleHierarchy[userRole] || [];
  return allowedRoles.includes(requiredRole);
}

export default ProtectedRoute;