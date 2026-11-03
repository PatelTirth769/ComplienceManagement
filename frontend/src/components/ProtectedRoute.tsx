import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: Array<'Admin' | 'Customer' | 'Auditor' | 'Vendor' | string>;
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  // If no in-memory user, check localStorage as emergency fallback before kicking to /
  if (!isAuthenticated || !user) {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (!token && !savedUser) {
      return <Navigate to="/" replace />;
    }
  }

  // Case-insensitive role comparison
  const userRole = (user?.role || '').toLowerCase();
  const isAllowed = allowedRoles.some(r => r.toLowerCase() === userRole);

  if (user && !isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
