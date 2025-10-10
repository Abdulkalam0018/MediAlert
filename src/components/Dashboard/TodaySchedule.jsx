import React, { useEffect, useState } from "react";
import { loadData, saveData } from "../../utils/Storage";
import CalendarSync from "../Calendar/Calendar";
import { Calendar } from "lucide-react";
import axiosInstance from "../../api/axiosInstance.js"
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
    const fetchMedications = async () => {
      try {
        const response = await axiosInstance.get("/tracks/today");
        
        setMedications(response.data.medications);
      } catch (error) {
        console.error("Error fetching medications:", error);
      }
    };

    fetchMedications();
  }, []);

  const markAsTaken = async (id, time, status) => {

    try {
      const response = await axiosInstance.patch(`/tracks/${id}`, {
        status: status,
        time: time
      });
    } catch (error) {
      console.error("Error marking medication as taken:", error);
    }

    const updated = medications.map((m) =>
      m.trackId === id && m.time === time ? { ...m, status: status } : m
    );
    setMedications(updated);
    // saveData("medications", updated);
  };

  return (
    <div>
      <button onClick={() => window.open("/calendar-sync", "_blank")} className="calendar-btn">
        Sync Calendar
      </button>
    <div className="schedule-container">
      <h2>Today's Schedule</h2>


      {showCalendar && <CalendarSync />}

      {medications && medications.length > 0 && medications.map((m) => (
        <div key={m._id} className={`dose-card ${m.status.toLowerCase()}`}>
          <div>
            <h4>{m.name}</h4>
            <p>{m.dosage}</p>
          </div>
          <p>{m.time}</p>
          {m.status !== "pending" ? (
            <span className="status-tag">{m.status}</span>
          ) : (
            // <button onClick={() => markAsTaken(m.trackId, m.time)}>Mark as Taken</button>
            <select 
              onChange={(e) => markAsTaken(m.trackId, m.time, e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Select Status</option>
              <option value="taken">Taken</option>
              <option value="delayed">Delayed</option>
              <option value="missed">Missed</option>
            </select>
          )}
        </div>
      ))}
    </div>
    </div>
  );
}
