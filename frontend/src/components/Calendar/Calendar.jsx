import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "../../api/axiosInstance.js";
import useCalendarStatus from "../../hooks/useCalendarStatus.js";
import "./Calendar.css";


export default function CalendarSync() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();
  const {
    isCalendarConnected,
    lastCalendarSync,
    refreshCalendarStatus,
  } = useCalendarStatus();

  const formatLastSync = (value) => {
    if (!value) return "Connected and waiting for the next sync.";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Connected and waiting for the next sync.";
    }

    return `Last synced ${date.toLocaleString()}`;
  };

  const handleDisconnect = async () => {
    try {
      await axiosInstance.post("/google/disconnect");
      await refreshCalendarStatus();
      window.dispatchEvent(new CustomEvent("medialert:calendar-status"));
    } catch (error) {
      console.error("Error fetching user data:", error);  
    }
    
    toast.info("Disconnected from Google Calendar");
  };

  const handleConnect = () => {
    if (!userId) {
      toast.error("Your account is still loading. Please try again.");
      return;
    }

    setIsLoading(true);
    window.location.href = `${import.meta.env.VITE_CALENDAR_AUTH_REDIRECT}/${userId}`;
  };

  return (
    <Card className="calendar-card">
      <div className="calendar-topbar">
        <button
          type="button"
          className="calendar-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft />
          Back to Dashboard
        </button>
      </div>

      <div className="calendar-header">
        <div className="calendar-icon">
          <Calendar className="calendar-icon-inner" />
        </div>
        <div className="calendar-header-text">
          <h3>Google Calendar Integration</h3>
          <p>
            Automatically sync your medications to Google Calendar for
            reminders.
          </p>
        </div>
      </div>

      {!isCalendarConnected ? (
        <>
          <div className="calendar-info-box">
            <div className="calendar-info-header">
              <Info className="info-icon" />
              <div>
                <p className="info-title">What you'll get:</p>
                <ul className="info-list">
                  <li>• Automatic calendar events for each medication dose</li>
                  <li>• Reminders 15 minutes before each dose</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            className="connect-btn"
            onClick={handleConnect}
            disabled={isLoading}
          >
            {isLoading ? "Connecting..." : "Connect & Sync Calendar"}
          </button>
        </>
      ) : (
        <div className="calendar-connected">
          <div className="calendar-success">
            <CheckCircle2 className="success-icon" />
            <div>
              <p className="success-title">Connected Successfully!</p>
              <p>Syncing with your Google Calendar</p>
              <p className="calendar-sync-meta">{formatLastSync(lastCalendarSync)}</p>
            </div>
          </div>

          <div className="calendar-actions">
            <button
              onClick={() =>
                window.open("https://calendar.google.com", "_blank")
              }
              className="btn-icon"
            >
              <ExternalLink/>
              View Calendar
            </button>
            <button onClick={handleDisconnect} className="btn-icon">Disconnect</button>
          </div>
        </div>
      )}
    </Card>
  );
}
