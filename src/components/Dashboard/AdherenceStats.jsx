import React, { useEffect, useState } from "react";
import { loadData } from "../../utils/Storage.js";

export default function AdherenceStats() {
  const [data, setData] = useState({});

  useEffect(() => {
    const adherence = loadData("adherence") || {
      rate: 0,
      completed: "0/0",
      activeMeds: 0,
      streak: 0,
    };
    setData(adherence);
  }, []);

  return (
    <div className="stats-container">
      <div className="stat-card">
        <h3>Adherence Rate</h3>
        <p className="stat-value">{data.rate}%</p>
      </div>
      <div className="stat-card">
        <h3>Today's Doses</h3>
        <p className="stat-value">{data.completed}</p>
        <p className="stat-label">Doses completed</p>
      </div>
      <div className="stat-card">
        <h3>Active Medications</h3>
        <p className="stat-value">{data.activeMeds}</p>
      </div>
      <div className="stat-card">
        <h3>7-Day Streak</h3>
        <p className="stat-value">{data.streak}</p>
        <p className="stat-label">Days perfect adherence</p>
      </div>
    </div>
  );
}
