import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
  setClerkTokenGetter(getToken);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashBoard />} />
          <Route path="/calendar-sync" element={<CalendarSync />} />
          <Route path="/medication" element={<Medications />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
