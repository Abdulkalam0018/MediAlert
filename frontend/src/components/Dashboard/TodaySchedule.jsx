import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { ChevronLeft, ChevronRight, Clock, Pill, Calendar as CalendarIcon, CheckCircle2, WifiOff, CloudUpload } from "lucide-react";
import axiosInstance from "../../api/axiosInstance.js";
import { socket } from "../../socket.js";
import { toast } from "sonner";
import {
  enqueueOfflineDose,
  getQueuedDoses,
  applyQueuedStatuses,
  requestBackgroundSync,
  isNetworkError,
  flushOfflineQueue,
  OFFLINE_SYNC_EVENT,
  QUEUE_CHANGED_EVENT,
} from "../../utils/offlineQueue.js";

const REFETCH_DEBOUNCE_MS = 300;

const toDateParam = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSameDose = (m, trackId, time) => m.trackId === trackId && m.time === time;

export default function TodaySchedule() {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [medications, setMedications] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  // loading | ready | offline-unavailable | error
  const [loadState, setLoadState] = useState("loading");

  const latestRequestRef = useRef(0);
  const refetchTimerRef = useRef(null);

  // ── Queue count badge ─────────────────────────────────────────────────────
  const refreshQueueCount = useCallback(async () => {
    try {
      const queue = await getQueuedDoses(userId);
      setPendingCount(queue.length);
    } catch (error) {
      console.error("Failed to read offline queue:", error);
    }
  }, [userId]);

  // ── Load the schedule for the selected day ────────────────────────────────
  const fetchMedications = useCallback(async () => {
    const requestId = ++latestRequestRef.current;

    try {
      const [response, queue] = await Promise.all([
        axiosInstance.get(`/tracks/date/${toDateParam(selectedDate)}`),
        getQueuedDoses(userId).catch(() => []),
      ]);

      // A newer request (e.g. the user switched days) already won.
      if (requestId !== latestRequestRef.current) return;

      const list = response.data?.medications ?? [];

      // The Service Worker answers with { offline: true } when it has no
      // cached copy of this day.
      if (response.data?.offline && list.length === 0) {
        setMedications([]);
        setLoadState("offline-unavailable");
        return;
      }

      // Overlay doses logged offline that haven't synced yet, so they don't
      // flip back to "pending" when the (possibly cached) schedule reloads.
      setMedications(applyQueuedStatuses(list, queue));
      setLoadState("ready");
    } catch (error) {
      if (requestId !== latestRequestRef.current) return;
      console.error("Error fetching medications:", error);
      // Never leave the previous day's doses on screen under the new date.
      setMedications([]);
      setLoadState(isNetworkError(error) ? "offline-unavailable" : "error");
    }
  }, [selectedDate, userId]);

  // Several events can arrive at once (e.g. one socket event per synced dose).
  const scheduleRefetch = useCallback(() => {
    clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      void fetchMedications();
    }, REFETCH_DEBOUNCE_MS);
  }, [fetchMedications]);

  useEffect(() => {
    setMedications([]);
    setLoadState("loading");
    void fetchMedications();
  }, [fetchMedications]);

  useEffect(() => {
    void refreshQueueCount();
  }, [refreshQueueCount]);

  useEffect(() => () => clearTimeout(refetchTimerRef.current), []);

  // ── Live updates, connectivity, and offline sync results ──────────────────
  useEffect(() => {
    const handleTrackUpdated = () => scheduleRefetch();

    const handleOnline = () => {
      setIsOnline(true);
      // useOfflineSync (in App) flushes the queue and fires OFFLINE_SYNC_EVENT
      // when done. Refetching now is still safe because queued doses are
      // overlaid on whatever the server returns.
      toast("✅ Back online", {
        style: { background: "#16a34a", color: "#fff", borderRadius: "14px", fontWeight: "700" },
      });
      scheduleRefetch();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast("📴 You're offline — doses you log will sync when you reconnect", {
        style: { background: "#7c3aed", color: "#fff", borderRadius: "14px", fontWeight: "700" },
        duration: 5000,
      });
    };

    const handleSyncFinished = () => {
      scheduleRefetch();
      void refreshQueueCount();
    };
    const handleQueueChanged = () => void refreshQueueCount();

    window.addEventListener("medialert:assistant-action", scheduleRefetch);
    socket.on("trackUpdated", handleTrackUpdated);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_SYNC_EVENT, handleSyncFinished);
    window.addEventListener(QUEUE_CHANGED_EVENT, handleQueueChanged);

    return () => {
      window.removeEventListener("medialert:assistant-action", scheduleRefetch);
      socket.off("trackUpdated", handleTrackUpdated);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_SYNC_EVENT, handleSyncFinished);
      window.removeEventListener(QUEUE_CHANGED_EVENT, handleQueueChanged);
    };
  }, [scheduleRefetch, refreshQueueCount]);

  // ── Mark a dose ───────────────────────────────────────────────────────────
  const markAsTaken = async (id, time, status) => {
    const previousStatus = medications.find((m) => isSameDose(m, id, time))?.status || "pending";

    const setDose = (changes) =>
      setMedications((current) =>
        current.map((m) => (isSameDose(m, id, time) ? { ...m, ...changes } : m))
      );

    const revert = () => setDose({ status: previousStatus, pendingSync: false });

    const saveOffline = async () => {
      await enqueueOfflineDose({ trackId: id, time, status, userId });
      setDose({ pendingSync: true });
      await refreshQueueCount();
      await requestBackgroundSync();
      toast("📴 Saved on this device — it will sync when you're back online", {
        style: { background: "#7c3aed", color: "#fff", borderRadius: "14px", fontWeight: "700" },
        duration: 4000,
      });
    };

    // Optimistic update first (works online AND offline)
    setDose({ status });

    // ── Known offline: queue it ─────────────────────────────────────────────
    if (!navigator.onLine) {
      try {
        await saveOffline();
      } catch (err) {
        console.error("Failed to queue offline dose:", err);
        revert();
        toast.error("Couldn't save this dose on your device. Try again.");
      }
      return;
    }

    // ── Online: send it, falling back to the queue if the network drops ─────
    // navigator.onLine is often true on flaky connections, so a network
    // failure here used to be logged and lost while the UI showed "taken".
    try {
      await axiosInstance.patch(`/tracks/${id}`, { status, time });

      if (status === "taken") {
        toast("Dose recorded as Taken! 💊", {
          style: {
            background: "#be185d", color: "#ffffff", borderRadius: "14px",
            fontWeight: "700", border: "none", boxShadow: "0 8px 24px rgba(190, 24, 93, 0.35)",
          },
        });
      } else if (status === "delayed") {
        toast("Dose marked as Delayed ⏰", {
          style: { background: "#d97706", color: "#ffffff", borderRadius: "14px", fontWeight: "700", border: "none" },
        });
      } else if (status === "missed") {
        toast("Dose marked as Missed", {
          style: { background: "#e11d48", color: "#ffffff", borderRadius: "14px", fontWeight: "700", border: "none" },
        });
      }
    } catch (error) {
      if (isNetworkError(error)) {
        try {
          await saveOffline();
        } catch (queueError) {
          console.error("Failed to queue dose after network error:", queueError);
          revert();
          toast.error("Couldn't save this dose. Check your connection and try again.");
        }
        return;
      }

      console.error("Error marking medication:", error);
      revert();
      toast.error(error.response?.data?.message || "Couldn't update this dose. Try again.");
    }
  };

  const syncNow = async () => {
    await flushOfflineQueue({ userId });
    void refreshQueueCount();
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

  const emptyMessage = {
    loading: "Loading schedule…",
    "offline-unavailable": "This day isn't saved on your device. Reconnect to load it.",
    error: "Couldn't load this day's schedule. Try again in a moment.",
    ready: "No medications scheduled for this date.",
  }[loadState];

  return (
    <div className="schedule-container">
      {/* ── Offline / pending-sync banner ───────────────────────────────── */}
      {(!isOnline || pendingCount > 0) && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          background: isOnline ? "#0ea5e9" : "#7c3aed", color: "#fff", borderRadius: "10px",
          padding: "0.5rem 1rem", marginBottom: "0.75rem",
          fontSize: "0.82rem", fontWeight: "600",
        }}>
          {isOnline ? <CloudUpload size={15} /> : <WifiOff size={15} />}
          <span>
            {isOnline
              ? `${pendingCount} dose update${pendingCount === 1 ? "" : "s"} waiting to sync`
              : "Offline mode — doses are saved on this device"}
          </span>
          {isOnline ? (
            <button
              type="button"
              onClick={syncNow}
              style={{
                marginLeft: "auto", background: "#fff", color: "#0369a1", border: "none",
                borderRadius: "999px", padding: "2px 10px", fontWeight: "700", fontSize: "0.78rem", cursor: "pointer",
              }}
            >
              Sync now
            </button>
          ) : pendingCount > 0 && (
            <span style={{
              marginLeft: "auto", background: "#fff", color: "#7c3aed",
              borderRadius: "999px", padding: "1px 8px", fontWeight: "700", fontSize: "0.78rem",
            }}>
              {pendingCount} pending
            </span>
          )}
        </div>
      )}

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
                  <span className="status-tag" title={m.pendingSync ? "Saved on this device, not synced yet" : undefined}>
                    {m.status === "taken" && (
                      <CheckCircle2
                        size={13}
                        style={{ marginRight: 4, color: "#be185d" }}
                      />
                    )}
                    {m.status}
                    {m.pendingSync && (
                      <CloudUpload size={13} style={{ marginLeft: 6, opacity: 0.7 }} aria-label="Waiting to sync" />
                    )}
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
            <p style={{ margin: 0 }}>{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
