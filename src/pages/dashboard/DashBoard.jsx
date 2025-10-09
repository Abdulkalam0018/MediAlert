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
    <>
      <Login />
      <div className="dashboard">
        <DashboardHeader />
        <AdherenceStats/>
        <TodaySchedule />
        <RecentActivity />
        <AIHealthAssistant />
      </div>
    </>
  );
}
