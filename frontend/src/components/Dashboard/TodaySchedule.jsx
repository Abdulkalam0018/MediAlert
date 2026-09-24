import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Pill, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import axiosInstance from "../../api/axiosInstance.js";
import { socket } from "../../socket.js";
import { toast } from "sonner";

export default function TodaySchedule() {
  const [medications, setMedications] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const fetchMedications = async () => {
      try {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;
        const response = await axiosInstance.get(
          `/tracks/date/${formattedDate}`
        );

        setMedications(response.data.medications);
      } catch (error) {
        console.error("Error fetching medications:", error);
      }
    };

    fetchMedications();

    const refreshFromAssistant = () => {
      void fetchMedications();
    };

    window.addEventListener("medialert:assistant-action", refreshFromAssistant);

    const handleTrackUpdated = (data) => {
      console.log("Real-time update received in TodaySchedule:", data);
      void fetchMedications();
    };

    socket.on("trackUpdated", handleTrackUpdated);

    return () => {
      window.removeEventListener(
        "medialert:assistant-action",
        refreshFromAssistant
      );
      socket.off("trackUpdated", handleTrackUpdated);
    };
  }, [selectedDate]);

  const markAsTaken = async (id, time, status) => {
    try {
      await axiosInstance.patch(`/tracks/${id}`, {
        status: status,
        time: time,
      });

      if (status === "taken") {
        toast("Dose recorded as Taken! 💊", {
          style: {
            background: "#be185d",
            color: "#ffffff",
            borderRadius: "14px",
            fontWeight: "700",
            border: "none",
            boxShadow: "0 8px 24px rgba(190, 24, 93, 0.35)",
          },
        });
      } else if (status === "delayed") {
        toast("Dose marked as Delayed ⏰", {
          style: {
            background: "#d97706",
            color: "#ffffff",
            borderRadius: "14px",
            fontWeight: "700",
            border: "none",
          },
        });
      } else if (status === "missed") {
        toast("Dose marked as Missed", {
          style: {
            background: "#e11d48",
            color: "#ffffff",
            borderRadius: "14px",
            fontWeight: "700",
            border: "none",
          },
        });
      }
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
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div className="schedule-title-row">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <CalendarIcon size={20} color="#8b5cf6" />
            <h2>Medication Schedule</h2>
          </div>
        </div>

        <div className="date-navigation">
          <button onClick={goToPreviousDay} className="nav-btn" type="button">
            <ChevronLeft size={18} />
            <span>Previous</span>
          </button>

          <div className="current-date">
            <p>{formatDate(selectedDate)}</p>
            {!isToday() && (
              <button onClick={goToToday} className="today-btn" type="button">
                Jump to Today
              </button>
            )}
          </div>

          <button
            onClick={goToNextDay}
            className="nav-btn"
            disabled={isToday()}
            type="button"
          >
            <span>Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="schedule-doses-list">
        {medications && medications.length > 0 ? (
          medications.map((m) => (
            <div
              key={m._id}
              className={`dose-card ${m.status ? m.status.toLowerCase() : "pending"}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#f5f3ff",
                    color: "#8b5cf6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Pill size={18} />
                </div>
                <div>
                  <h4>{m.name}</h4>
                  <p>{m.dosage}</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Clock size={16} color="#6366f1" />
                <span className="dose-time">
                  {new Date(m.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div>
                {m.status && m.status !== "pending" ? (
                  <span className="status-tag">
                    {m.status === "taken" && (
                      <CheckCircle2
                        size={13}
                        style={{ marginRight: 4, color: "#be185d" }}
                      />
                    )}
                    {m.status}
                  </span>
                ) : (
                  <select
                    className="status-select"
                    onChange={(e) =>
                      markAsTaken(m.trackId, m.time, e.target.value)
                    }
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Action (Pending)
                    </option>
                    <option value="taken">Mark Taken</option>
                    <option value="delayed">Mark Delayed</option>
                    <option value="missed">Mark Missed</option>
                  </select>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-medications">
            <p style={{ margin: 0 }}>No medications scheduled for this date.</p>
          </div>
        )}
      </div>
    </div>
  );
}
