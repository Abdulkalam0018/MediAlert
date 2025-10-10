import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "../../api/axiosInstance.js";
import "./Calendar.css";


export default function CalendarSync() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axiosInstance.get("/users/me");        
        setIsConnected(response.data?.user?.allowCalendarSync || false);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUser();
  }, []);

  const handleDisconnect = async () => {
    try {
      const response = await axiosInstance.get("/google/disconnect");
      setIsConnected(response.data?.allowCalendarSync || false);
    } catch (error) {
      console.error("Error fetching user data:", error);  
    }
    
    toast.info("Disconnected from Google Calendar");
  };

  return (
    <Card className="calendar-card">
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

      {!isConnected ? (
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
            onClick={() => window.location.href = 'http://localhost:8000/api/v1/google/auth'}
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
