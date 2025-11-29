import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'master' | 'financeiro' | 'vendedor';
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole,
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { role, loading } = useUserRole();
  
  if (loading) {
    return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  }
  
  if (requireAuth && !role) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/inicio" replace />;
  }
  
  return <>{children}</>;
};
