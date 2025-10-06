import React from "react";
import { useNavigate } from "react-router-dom";

export default function DashboardHeader() {
  const navigate = useNavigate();

  const handleAddMedication = () => {
    navigate("/medication"); // Navigate to the Medications page
  };

  return (
    <header className="dashboard-header">
      <h1>MediAlert</h1>
      <p>Your Health Companion</p>
      <button className="add-btn" onClick={handleAddMedication}>
        + Add Medication
      </button>
    </header>
  );
}
