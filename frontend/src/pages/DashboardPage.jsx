import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DonorDashboard from "./DonorDashboard";
import ReceiverDashboard from "./ReceiverDashboard";
import AdminDashboard from "./AdminDashboard";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4"><div className="skeleton mx-auto h-40 max-w-4xl" /></div>;
  if (!user) return <Navigate to="/auth" />;

  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "DONOR") return <DonorDashboard />;
  return <ReceiverDashboard />;
}
