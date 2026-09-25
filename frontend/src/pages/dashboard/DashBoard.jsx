import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardHeader from "../../components/Dashboard/DashboardHeader";
import AdherenceStats from "../../components/Dashboard/AdherenceStats";
import TodaySchedule from "../../components/Dashboard/TodaySchedule";
import AIHealthAssistant from "../../components/Dashboard/AIHealthAssistant";
import "../../components/Dashboard/Dashboard.css";
import { toast } from "sonner";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Result of the Google Calendar OAuth callback redirect.
  useEffect(() => {
    const result = searchParams.get("calendar");
    if (!result) return;

    const messages = {
      connected: ["success", "Google Calendar connected."],
      invalid_state: ["error", "Google Calendar link expired or was invalid. Connect again from Calendar sync."],
      no_code: ["error", "Google didn't finish connecting. Connect again from Calendar sync."],
      user_not_found: ["error", "Your account isn't set up yet. Reload the page, then connect Google Calendar again."],
      error: ["error", "Couldn't connect Google Calendar. Try again from Calendar sync."],
    };
    const [kind, message] = messages[result] || messages.error;
    toast[kind](message);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("calendar");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="dashboard-page-wrapper">
      <div className="dashboard">
        <DashboardHeader />
        <AdherenceStats />

        {/* 2-Column Responsive Layout: Schedule on Left, AI Assistant Sidebar on Right */}
        <div className="dashboard-grid-layout">
          <div className="dashboard-schedule-col">
            <TodaySchedule />
          </div>

          <aside className="dashboard-sidebar-col">
            <AIHealthAssistant />
          </aside>
        </div>
      </div>
    </div>
  );
}
