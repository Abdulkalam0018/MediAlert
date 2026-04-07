import { useNavigate } from "react-router-dom";
import { generateFirebaseToken } from "../../notifications/firebase.js";
import { useEffect } from "react";  
import axiosInstance from "../../api/axiosInstance.js"
import useCalendarStatus from "../../hooks/useCalendarStatus.js";

export default function DashboardHeader() {
  const navigate = useNavigate();
  const { isCalendarConnected, loading } = useCalendarStatus();

  useEffect(() => {
    const fetchToken = async () => {
      const token = await generateFirebaseToken();
      if (token) {
        axiosInstance.post('/users/fcm-token', { fcmToken: token })
      }
    };

    fetchToken();
  }, []);

  const handleAddMedication = () => {
    navigate("/medication"); // Navigate to the Medications page
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
        <h1>MediAlert</h1>
        <p>Your Health Companion</p>
        <div className="calendar-status-row">
          <span
            className={`calendar-status-pill ${
              isCalendarConnected ? "connected" : "disconnected"
            }`}
          >
            {getCalendarLabel()}
          </span>
        </div>
      </div>

      <div className="dashboard-header-actions">
        <button
          className={`dashboard-calendar-btn ${
            isCalendarConnected ? "connected" : ""
          }`}
          onClick={handleCalendar}
        >
          {isCalendarConnected ? "Manage Calendar" : "Sync Calendar"}
        </button>
        <button className="dashboard-add-btn" onClick={handleAddMedication}>
          + Add Medication
        </button>
      </div>
    </header>
  );
}
