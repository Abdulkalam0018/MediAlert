import { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance.js";
import { socket } from "../../socket.js";
import { TrendingUp, CheckCircle2, Pill, Flame } from "lucide-react";

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
    totalDoses: 0,
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

    const refreshFromAssistant = () => {
      void fetchAdherence();
    };

    window.addEventListener("medialert:assistant-action", refreshFromAssistant);

    const handleTrackUpdated = (eventData) => {
      console.log("Real-time update received for Adherence:", eventData);
      void fetchAdherence();
    };

    socket.on("trackUpdated", handleTrackUpdated);

    return () => {
      window.removeEventListener(
        "medialert:assistant-action",
        refreshFromAssistant
      );
      socket.off("trackUpdated", handleTrackUpdated);
    };
  }, []);

  return (
    <div className="stats-container">
      {/* 1. Adherence Rate */}
      <div className="stat-card adherence">
        <div className="stat-card-header">
          <h3>Adherence Rate</h3>
          <div className="stat-icon-pill">
            <TrendingUp size={18} />
          </div>
        </div>
        <div>
          <p className="stat-value">{data.adherenceRate}%</p>
          <p className="stat-label">Overall consistency</p>
        </div>
      </div>

      {/* 2. Today's Doses */}
      <div className="stat-card doses">
        <div className="stat-card-header">
          <h3>Today's Doses</h3>
          <div className="stat-icon-pill">
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div>
          <p className="stat-value">
            {data.todaysTakenDoses + data.todaysDelayedDoses}
            <span style={{ fontSize: "1.4rem", color: "#94a3b8", fontWeight: 500 }}>
              /{data.todaysTotalDoses}
            </span>
          </p>
          <p className="stat-label">Doses completed today</p>
        </div>
      </div>

      {/* 3. Active Medications */}
      <div className="stat-card active">
        <div className="stat-card-header">
          <h3>Active Prescriptions</h3>
          <div className="stat-icon-pill">
            <Pill size={18} />
          </div>
        </div>
        <div>
          <p className="stat-value">{data.activeMedications}</p>
          <p className="stat-label">Ongoing treatments</p>
        </div>
      </div>

      {/* 4. Streak */}
      <div className="stat-card streak">
        <div className="stat-card-header">
          <h3>Perfect Streak</h3>
          <div className="stat-icon-pill">
            <Flame size={18} />
          </div>
        </div>
        <div>
          <p className="stat-value">{data.streak} <span style={{ fontSize: "1.2rem", fontWeight: 600 }}>days</span></p>
          <p className="stat-label">Unbroken daily adherence</p>
        </div>
      </div>
    </div>
  );
}
