import React, { useEffect, useState } from "react";
import { loadData } from "../../utils/Storage";

export default function RecentActivity() {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    setActivity(loadData("recentActivity") || []);
  }, []);

  return (
    <div className="recent-container">
      <h2>Recent Activity</h2>
      {activity.map((item, index) => (
        <div key={index} className="activity-item">
          <h4>{item.name}</h4>
          <p>
            {item.status} at {item.time}
          </p>
          <p className="activity-day">{item.day}</p>
        </div>
      ))}
    </div>
  );
}
