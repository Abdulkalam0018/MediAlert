import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { socket } from "../../socket.js";
import DashboardHeader from "../../components/Dashboard/DashboardHeader";
import AdherenceStats from "../../components/Dashboard/AdherenceStats";
import TodaySchedule from "../../components/Dashboard/TodaySchedule";
import AIHealthAssistant from "../../components/Dashboard/AIHealthAssistant";
import "../../components/Dashboard/Dashboard.css";
import { toast } from "sonner";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("calendar") !== "connected") {
      return;
    }

    toast.success("Google Calendar connected successfully.");

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("calendar");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const { user } = useUser();

  useEffect(() => {
    if (user && user.id) {
      socket.connect();
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit("join", user.id);

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

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
