// src/components/AdminRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="page">
        <p className="muted">Loading...</p>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin" && user.role !== "staff")
    return <Navigate to="/" replace />;
  return <Outlet />;
}
