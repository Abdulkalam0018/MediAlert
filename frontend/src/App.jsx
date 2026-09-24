import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoutes";
import CalendarSync from "./components/Calendar/Calendar";
import DashBoard from "./pages/dashboard/DashBoard";
import { useAuth, useUser } from "@clerk/clerk-react";
import { setClerkTokenGetter } from "./api/axiosInstance.js";
// import DashBoard from "./pages/dashboard";
import { socket } from "./socket.js";

import Landing from "./pages/landing/Landing";
import Medications from "./pages/Medication/Medications";
import { Toaster } from "sonner";

function App() {
  const { getToken } = useAuth();
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    setClerkTokenGetter(getToken);
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      const handleConnect = () => {
        console.log(`🔌 Socket connected (${socket.id}) for user:`, user.id);
        socket.emit("join", user.id);
      };

      const handleDisconnect = (reason) => {
        console.log("🔌 Socket disconnected:", reason);
      };

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);

      if (socket.connected) {
        socket.emit("join", user.id);
      } else {
        socket.connect();
      }

      return () => {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
      };
    } else if (!isSignedIn) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  }, [isSignedIn, user?.id]);
  
  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar-sync"
          element={
            <ProtectedRoute>
              <CalendarSync />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medication"
          element={
            <ProtectedRoute>
              <Medications />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
