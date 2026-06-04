import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
