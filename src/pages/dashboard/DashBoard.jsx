import React from "react";
import Login from "../../components/Login.jsx"
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import AdherenceStats from "../../components/dashboard/AdherenceStats";
import TodaySchedule from "../../components/Dashboard/TodaySchedule";
import RecentActivity from "../../components/Dashboard/RecentActivity";
import AIHealthAssistant from "../../components/Dashboard/AIHealthAssistant";
import "../../components/Dashboard/Dashboard.css";

export default function Dashboard() {
  return (
    <div style={{ display: 'flex', position: 'relative' }}>
      <div style={{ position: 'fixed', right: '1rem', top: '1rem', zIndex: 1000, transform: 'scale(1.8)', transformOrigin: 'top right' }}>
        <Login />
      </div>
      
      <div className="dashboard" style={{ width: '100%' }}>
        <DashboardHeader />
        <AdherenceStats/>
        <TodaySchedule />
        <RecentActivity />
        <AIHealthAssistant />
      </div>
    </div>
  );
}
