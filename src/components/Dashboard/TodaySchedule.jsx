import React, { useEffect, useState } from "react";
import { loadData, saveData } from "../../utils/Storage";
import CalendarSync from "../Calendar/Calendar";
import { Calendar } from "lucide-react";
// import fontawesome from "@fortawesome/fontawesome";
// import fontawesome from "@fortawesome/fontawesome";
// import { library } from "@fortawesome/fontawesome-svg-core";
// import { faCalendar } from "@fortawesome/free-solid-svg-icons";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// library.add(faCalendar);
// fontawesome.library.add(faCheckCircle);
export default function TodaySchedule() {
  const [medications, setMedications] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);

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
      <button onClick={() => window.open("/calendar-sync", "_blank")} className="calendar-btn">
        Sync Calendar
      </button>

      {showCalendar && <CalendarSync />}

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
