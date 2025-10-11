import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoutes";
import TodaySchedule from "./components/Dashboard/TodaySchedule";
import CalendarSync from "./components/Calendar/Calendar";
import DashBoard from "./pages/dashboard/DashBoard";
// import DashBoard from "./pages/dashboard";

import Landing from "./pages/landing/Landing";
import Medications from "./pages/Medication/Medications";
function App() {
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
