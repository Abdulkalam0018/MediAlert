import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { gapi } from "gapi-script";
import { loadData } from "../../utils/Storage"; // helper to read localStorage
import "./Calendar.css";

export default function CalendarSync() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [medications, setMedications] = useState([]);

  // Load medications from localStorage
  useEffect(() => {
    setMedications(loadData("medications") || []);
  }, []);

  // Initialize Google API client
  useEffect(() => {
    function initClient() {
      gapi.client.init({
        apiKey: "AIzaSyBgvx7kY9SMw0OIL818oHgrp0r7psoq7Tc",
        clientId:
          "1051078256203-393e5g4fl1ej1g1ba6c4beln401q8r66.apps.googleusercontent.com",

        discoveryDocs: [
          "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
        ],
        scope: "https://www.googleapis.com/auth/calendar.events",
      });
    }
    gapi.load("client:auth2", initClient);
  }, []);

  // Handle Google sign-in and sync events
  const handleGoogleCalendarAuth = async () => {
    if (medications.length === 0) {
      toast.error("No medications found to sync!");
      return;
    }

    setIsLoading(true);
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      await authInstance.signIn();

      const token = authInstance.currentUser
        .get()
        .getAuthResponse().access_token;
      await createEvents(token);

      setIsConnected(true);
      toast.success("All medications synced to Google Calendar!");
    } catch (error) {
      console.error("Google Calendar auth failed:", error);
      toast.error("Failed to sync with Google Calendar");
    } finally {
      setIsLoading(false);
    }
  };

  // Create events in Google Calendar
  const createEvents = async (accessToken) => {
    for (const med of medications) {
      const startTime = new Date(med.time).toISOString();
      const endTime = new Date(
        new Date(med.time).getTime() + 15 * 60000
      ).toISOString();

      const event = {
        summary: `Take ${med.name} (${med.dosage})`,
        description: "Medication reminder from MediAlert",
        start: { dateTime: startTime, timeZone: "Asia/Kolkata" },
        end: { dateTime: endTime, timeZone: "Asia/Kolkata" },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 15 }],
        },
      };

      await axios.post(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        event,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
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
            onClick={handleGoogleCalendarAuth}
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
            >
              <ExternalLink className="btn-icon" />
              View Calendar
            </button>
            <button onClick={handleDisconnect}>Disconnect</button>
          </div>
        </div>
      )}
    </Card>
  );
}
