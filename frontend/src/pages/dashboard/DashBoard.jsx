import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Login from "../../components/Login.jsx"
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

  return (
    <div style={{ display: 'flex', position: 'relative' }}>
      <div style={{ position: 'fixed', right: '1rem', top: '1rem', zIndex: 1000, transform: 'scale(1.8)', transformOrigin: 'top right' }}>
        <Login />
      </div>
      
      <div className="dashboard" style={{ width: '100%' }}>
        <DashboardHeader />
        <AdherenceStats/>
        <TodaySchedule />
        {/* <RecentActivity /> */}
        <AIHealthAssistant />
      </div>
    </div>
  );
}
