import { Navigate } from "react-router-dom";
import { useHasRole, AppRole } from "@/hooks/useAdmin";
import { Loader2 } from "lucide-react";
import { useUserRoles } from "@/hooks/useAdmin";

interface RoleGuardProps {
  allowed: AppRole[];
  children: React.ReactNode;
  fallback?: string;
}

export function RoleGuard({ allowed, children, fallback = "/" }: RoleGuardProps) {
  const { data: roles, isLoading } = useUserRoles();
  const hasAccess = useHasRole(...allowed);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roles || !hasAccess) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
