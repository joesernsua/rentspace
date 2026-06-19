import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/User";

const dashboardByRole: Record<UserRole, string> = {
  tenant: "/dashboard.html",
  owner: "/owner-dashboard",
  admin: "/admin-dashboard",
};

export function getDashboardPath(role: UserRole) {
  return dashboardByRole[role];
}

export default function ProtectedRoute({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="grid min-h-[calc(100vh-145px)] place-items-center text-slate-600">Checking your account...</main>;
  }

  if (!currentUser || !userProfile) {
    return <Navigate to="/login.html" replace state={{ from: location.pathname }} />;
  }

  const roles = userProfile.roles ?? [userProfile.role];

  if (!roles.includes(role)) {
    return <Navigate to={getDashboardPath(userProfile.role)} replace />;
  }

  return children;
}
