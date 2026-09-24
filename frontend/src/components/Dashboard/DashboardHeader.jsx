import { useNavigate } from "react-router-dom";
import { generateFirebaseToken } from "../../notifications/firebase.js";
import { useEffect } from "react";
import axiosInstance from "../../api/axiosInstance.js";
import useCalendarStatus from "../../hooks/useCalendarStatus.js";
import { Calendar, Plus, CheckCircle2, Clock } from "lucide-react";
import Login from "../Login.jsx";

export default function DashboardHeader() {
  const navigate = useNavigate();
  const { isCalendarConnected, loading } = useCalendarStatus();

  useEffect(() => {
    const fetchToken = async () => {
      const token = await generateFirebaseToken();
      if (token) {
        axiosInstance.post("/users/fcm-token", { fcmToken: token });
      }
    };

    fetchToken();
  }, []);

  const handleAddMedication = () => {
    navigate("/medication");
  };

  const handleCalendar = () => {
    navigate("/calendar-sync");
  };

  const getCalendarLabel = () => {
    if (loading) {
      return "Checking calendar...";
    }
    return isCalendarConnected ? "Calendar synced" : "Calendar not synced";
  };

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-copy">
        <div className="dashboard-header-brand-row">
          <div className="dashboard-brand-orb" />
          <h1>MediAlert</h1>
        </div>
        <p>Your Intelligent Health & Adherence Companion</p>
        <div className="calendar-status-row">
          <span
            className={`calendar-status-pill ${
              isCalendarConnected ? "connected" : "disconnected"
            }`}
          >
            {isCalendarConnected ? (
              <CheckCircle2 size={13} />
            ) : (
              <Clock size={13} />
            )}
            {getCalendarLabel()}
          </span>
        </div>
      </div>

      <div className="dashboard-header-actions">
        <button
          type="button"
          className={`dashboard-calendar-btn ${
            isCalendarConnected ? "connected" : ""
          }`}
          onClick={handleCalendar}
        >
          <Calendar size={17} />
          <span>{isCalendarConnected ? "Manage Calendar" : "Sync Calendar"}</span>
        </button>

        <button
          type="button"
          className="dashboard-add-btn"
          onClick={handleAddMedication}
        >
          <Plus size={18} />
          <span>Add Medication</span>
        </button>

        <div className="dashboard-user-wrapper">
          <Login />
        </div>
      </div>
    </header>
  );
}
