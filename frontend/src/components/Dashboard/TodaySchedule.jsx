import React, { useEffect, useState } from "react";
import { loadData, saveData } from "../../utils/Storage";
import CalendarSync from "../Calendar/Calendar";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import axiosInstance from "../../api/axiosInstance.js";

export default function TodaySchedule() {
  const [medications, setMedications] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const fetchMedications = async () => {
      try {
        const formattedDate = selectedDate.toISOString().split("T")[0];
        const response = await axiosInstance.get(
          `/tracks/date/${formattedDate}`
        );

        setMedications(response.data.medications);
      } catch (error) {
        console.error("Error fetching medications:", error);
      }
    };

    fetchMedications();
  }, [selectedDate]);

  const markAsTaken = async (id, time, status) => {
    try {
      const response = await axiosInstance.patch(`/tracks/${id}`, {
        status: status,
        time: time,
      });
    } catch (error) {
      console.error("Error marking medication as taken:", error);
    }

    const updated = medications.map((m) =>
      m.trackId === id && m.time === time ? { ...m, status: status } : m
    );
    setMedications(updated);
  };

  const goToPreviousDay = () => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    setSelectedDate(prevDate);
  };

  const goToNextDay = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setSelectedDate(nextDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div>
      <button
        onClick={() => window.open("/calendar-sync", "_blank")}
        className="calendar-btn"
      >
        Sync Calendar
      </button>

      <div className="schedule-container">
        <div className="schedule-header">
          <h2>Medication Schedule</h2>

          <div className="date-navigation">
            <button onClick={goToPreviousDay} className="nav-btn">
              <ChevronLeft size={20} />
              Previous
            </button>

            <div className="current-date">
              <p>{formatDate(selectedDate)}</p>
              {!isToday() && (
                <button onClick={goToToday} className="today-btn">
                  Go to Today
                </button>
              )}
            </div>

            <button
              onClick={goToNextDay}
              className="nav-btn"
              disabled={isToday()}
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {showCalendar && <CalendarSync />}

        {medications && medications.length > 0 ? (
          medications.map((m) => (
            <div key={m._id} className={`dose-card ${m.status.toLowerCase()}`}>
              <div>
                <h4>{m.name}</h4>
                <p>{m.dosage}</p>
              </div>

              <p
                style={{
                  color: "#2b6ef2",
                  fontWeight: "bold",
                  margin: "0 0 0.3rem 0",
                }}
              >
                {m.time}
              </p>

              {m.status !== "pending" ? (
                <span className="status-tag">{m.status}</span>
              ) : (
                <select
                  onChange={(e) =>
                    markAsTaken(m.trackId, m.time, e.target.value)
                  }
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select Status
                  </option>
                  <option value="taken">Taken</option>
                  <option value="delayed">Delayed</option>
                  <option value="missed">Missed</option>
                </select>
              )}
            </div>
          ))
        ) : (
          <p className="no-medications">
            No medications scheduled for this day
          </p>
        )}
      </div>
    </div>
  );
}
