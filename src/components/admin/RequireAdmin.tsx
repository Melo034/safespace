import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminSession } from "@/hooks/useAdminSession";
import Loading from "@/components/utils/Loading";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { loading, role } = useAdminSession();
  const location = useLocation();

  const allowed = ["super_admin", "admin", "moderator"] as const;
  const isAllowed = role && (allowed as readonly string[]).includes(String(role));

  // If a cached/admin role is present, allow rendering even while loading
  if (!isAllowed && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loading />
      </div>
    );
  }

  if (!isAllowed) {
    return <Navigate to="/unauthorized" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
