import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "talent" | "institution" | "company" | "mentor";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, roles, isLoading, isAdmin } = useAuth();
  const location = useLocation();
  const isLocalAdminPreview =
    process.env.NODE_ENV === "development" &&
    requiredRole === "admin" &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    new URLSearchParams(location.search).get("preview") === "ui";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isLocalAdminPreview) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If this is the admin route and user is not admin, redirect to dashboard
  if (requiredRole === "admin" && !isAdmin && !isLocalAdminPreview) {
    return <Navigate to="/dashboard" replace />;
  }

  // For other required roles, check if user has the role
  if (requiredRole && requiredRole !== "admin" && !roles.includes(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
