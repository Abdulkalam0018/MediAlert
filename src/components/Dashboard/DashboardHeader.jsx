import React from "react";
import { useNavigate } from "react-router-dom";
import { generateFirebaseToken } from "../../notifications/firebase.js";
import { useEffect } from "react";  
export default function DashboardHeader() {

  useEffect(() => {
    const fetchToken = async () => {
      const token = await generateFirebaseToken();
      if (token) {
        console.log("Firebase Token:", token);
        // You can send this token to your server for further processing if needed
      }
    };

    fetchToken();
  }, []);

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
