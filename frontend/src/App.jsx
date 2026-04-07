import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoutes";
import CalendarSync from "./components/Calendar/Calendar";
import DashBoard from "./pages/dashboard/DashBoard";
import { useAuth } from "@clerk/clerk-react";
import { setClerkTokenGetter } from "./api/axiosInstance.js";
// import DashBoard from "./pages/dashboard";

import Landing from "./pages/landing/Landing";
import Medications from "./pages/Medication/Medications";
function App() {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkTokenGetter(getToken);
  }, [getToken]);
  
  return (
    <Router>
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
