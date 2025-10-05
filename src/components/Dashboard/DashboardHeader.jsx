import React from "react";

export default function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <h1>MediAlert</h1>
      <p>Your Health Companion</p>
      <button className="add-btn">+ Add Medication</button>
    </header>
  );
}
