import React, { useEffect, useState } from "react";
import { loadData, saveData } from "../../utils/Storage";
import "./DashBoard.css";
export default function Dashboard() {
  const [doseLogs, setDoseLogs] = useState([]);

  useEffect(() => {
    const logs = loadData("doseLogs") || [];
    setDoseLogs(logs);
  }, []);
  useEffect(() => {
    saveData("doseLogs", doseLogs);
  }, [doseLogs]);
  const updateDoseStatus = (id, status) => {
    const updated = doseLogs.map((log) =>
      log.medicationId === id ? { ...log, status } : log
    );
    setDoseLogs(updated);
  };

  const totalDoses = doseLogs.length;
  const takenCount = doseLogs.filter((d) => d.status === "Taken").length;
  const missedCount = doseLogs.filter((d) => d.status === "Missed").length;
  const adherenceRate = totalDoses
    ? Math.round((takenCount / totalDoses) * 100)
    : 0;

  return (
    <div className="dashboard">
      <h2>📊 Dashboard</h2>
      <div className="stats">
        <p>Total Doses: {totalDoses}</p>
        <p>Taken: {takenCount}</p>
        <p>Missed: {missedCount}</p>
        <p>Adherence Rate: {adherenceRate}%</p>
      </div>

      <h3>Upcoming & Recent Doses</h3>
      <ul>
        {doseLogs.length > 0 ? (
          doseLogs.map((dose) => (
            <li key={dose.medicationId} className="dose-item">
              <span>
                {dose.date} @ {dose.time} → {dose.status}
              </span>
              <button
                onClick={() => updateDoseStatus(dose.medicationId, "Taken")}
              >
                ✅ Taken
              </button>
              <button
                onClick={() => updateDoseStatus(dose.medicationId, "Missed")}
              >
                ❌ Missed
              </button>
            </li>
          ))
        ) : (
          <p>No doses logged yet.</p>
        )}
      </ul>
    </div>
  );
}
