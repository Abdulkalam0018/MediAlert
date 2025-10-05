import React, { useEffect, useState } from "react";
import { loadData, saveData } from "../../utils/Storage";

export default function TodaySchedule() {
  const [medications, setMedications] = useState([]);

  useEffect(() => {
    setMedications(loadData("medications") || []);
  }, []);

  const markAsTaken = (id) => {
    const updated = medications.map((m) =>
      m.id === id ? { ...m, status: "Taken" } : m
    );
    setMedications(updated);
    saveData("medications", updated);
  };

  return (
    <div className="schedule-container">
      <h2>Today's Schedule</h2>
      {medications.map((m) => (
        <div key={m.id} className={`dose-card ${m.status.toLowerCase()}`}>
          <div>
            <h4>{m.name}</h4>
            <p>{m.dosage}</p>
          </div>
          <p>{m.time}</p>
          {m.status === "Taken" ? (
            <span className="status-tag">Taken</span>
          ) : (
            <button onClick={() => markAsTaken(m.id)}>Mark as Taken</button>
          )}
        </div>
      ))}
    </div>
  );
}
