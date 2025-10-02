import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requireManager?: boolean;
}

export function ProtectedRoute({ children, requireManager = false }: ProtectedRouteProps) {
  // For now, always allow access - in a real app, you would check authentication and roles
  const isAuthenticated = true;
  const userRole = 'manager'; // This would come from your auth store

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireManager && userRole !== 'manager') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}




