// src/components/admin/RequireAdmin.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminSession } from "@/hooks/useAdminSession";
import Loading from "@/components/utils/Loading";

const ALLOWED = ["super_admin", "admin", "moderator"] as const;

type AdminRole = typeof ALLOWED[number];

function isAllowedRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ALLOWED as readonly string[]).includes(value);
}

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { loading, isSignedIn, role } = useAdminSession();
  const location = useLocation();

  const liveAllowed = isSignedIn && isAllowedRole(role);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loading />
      </div>
    );
  }

  if (!liveAllowed) {
    return <Navigate to="/unauthorized" state={{ from: location.pathname }} replace />;
  }

  return children;
}
