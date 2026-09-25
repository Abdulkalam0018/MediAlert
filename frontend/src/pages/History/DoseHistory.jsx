import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock, CheckCircle2, XCircle, History } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "../../api/axiosInstance.js";

const DoseHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axiosInstance.get("/tracks/all");
        let meds = response.data.medications || [];
        
        // Filter only those that have a takenAt or status is taken/missed/delayed
        // Actually, let's show all past ones (or just ones with a logged status)
        meds = meds.filter(m => m.status !== "pending");

        // Sort descending by actual taken time or scheduled time
        meds.sort((a, b) => {
          const timeA = a.takenAt ? new Date(a.takenAt) : new Date(a.time);
          const timeB = b.takenAt ? new Date(b.takenAt) : new Date(b.time);
          return timeB - timeA;
        });

        setHistory(meds);
      } catch (error) {
        console.error("Error fetching dose history:", error);
        toast.error("Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem", gap: "1rem" }}>
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <History className="w-6 h-6" /> Dose History
        </h1>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#64748b" }}>Loading history...</p>
      ) : history.length === 0 ? (
        <Card style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          <History className="w-12 h-12" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <h3>No doses logged yet</h3>
          <p>Once you take or miss a medication, it will appear here.</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {history.map((dose, idx) => {
            const scheduled = new Date(dose.time);
            const taken = dose.takenAt ? new Date(dose.takenAt) : null;
            return (
              <Card key={idx} style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>
                    {dose.elixir?.name || "Unknown Medication"}
                  </h3>
                  <div style={{ display: "flex", gap: "1rem", color: "#64748b", fontSize: "0.9rem" }}>
                    <span>
                      <Clock className="w-3 h-3 inline mr-1" />
                      Scheduled: {scheduled.toLocaleDateString()} {scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {taken && (
                      <span>
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        Logged: {taken.toLocaleDateString()} {taken.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    backgroundColor: dose.status === "taken" ? "#dcfce7" : dose.status === "missed" ? "#fee2e2" : "#fef9c3",
                    color: dose.status === "taken" ? "#166534" : dose.status === "missed" ? "#991b1b" : "#854d0e"
                  }}>
                    {dose.status}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DoseHistory;
