import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TodaySchedule from "./components/Dashboard/TodaySchedule";
import CalendarSync from "./components/Calendar/Calendar";
import DashBoard from "./pages/dashboard/DashBoard";
// import DashBoard from "./pages/dashboard";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashBoard />} />
        <Route path="/calendar-sync" element={<CalendarSync />} />
      </Routes>
    </Router>
  );
}

export default App;
