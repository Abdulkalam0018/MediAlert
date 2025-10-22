import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance.js";

export default function AdherenceStats() {
  const [data, setData] = useState({
    activeMedications: 0,
    adherenceRate: "0.00",
    delayedDoses: 0,
    missedDoses: 0,
    streak: 0,
    takenDoses: 0,
    todaysDelayedDoses: 0,
    todaysMissedDoses: 0,
    todaysTakenDoses: 0, 
    todaysTotalDoses: 0,
    totalDoses: 0
  });

  useEffect(() => {
    const fetchAdherence = async () => {
      try {
        const response = await axiosInstance.get("/tracks/adherence");
        
        setData(response.data.adherenceData);
      } catch (error) {
        console.error("Error fetching adherence data:", error);
      }
      
    };
    fetchAdherence();
        
  }, []);

  return (
    <div className="stats-container">
      <div className="stat-card">
        <h3>Adherence Rate</h3>
        <p className="stat-value">{data.adherenceRate}%</p>
      </div>
      <div className="stat-card">
        <h3>Today's Doses</h3>
        <p className="stat-value">{data.todaysTakenDoses + data.todaysDelayedDoses}/{data.todaysTotalDoses}</p>
        <p className="stat-label">Doses completed</p>
      </div>
      <div className="stat-card">
        <h3>Active Medications</h3>
        <p className="stat-value">{data.activeMedications}</p>
      </div>
      <div className="stat-card">
        <h3>Streak</h3>
        <p className="stat-value">{data.streak}</p>
        <p className="stat-label">Days perfect adherence</p>
      </div>
    </div>
  );
}
