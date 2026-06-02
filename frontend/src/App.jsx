import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import NotificationStack from "./components/NotificationStack";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import CreateDonationPage from "./pages/CreateDonationPage";
import DashboardPage from "./pages/DashboardPage";
import DonationDetailsPage from "./pages/DonationDetailsPage";
import LandingPage from "./pages/LandingPage";
import MapBrowsePage from "./pages/MapBrowsePage";

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <NotificationStack />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/map" element={<MapBrowsePage />} />
        <Route path="/donations/:id" element={<DonationDetailsPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donate/new"
          element={
            <ProtectedRoute role="DONOR">
              <CreateDonationPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

