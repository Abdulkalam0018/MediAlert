import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoutes";
import CalendarSync from "./components/Calendar/Calendar";
import DashBoard from "./pages/dashboard/DashBoard";
import { useAuth, useUser } from "@clerk/clerk-react";
import { setClerkTokenGetter } from "./api/axiosInstance.js";
import { socket } from "./socket.js";
import useOfflineSync from "./hooks/useOfflineSync.js";
import { clearScheduleCache } from "./utils/offlineQueue.js";

import Landing from "./pages/landing/Landing";
import Medications from "./pages/Medication/Medications";
import DoseHistory from "./pages/History/DoseHistory";
import { Toaster } from "sonner";

const LAST_USER_KEY = "medialert:last-user";
const SOCKET_AUTH_RETRY_MS = 3000;

function App() {
  const { getToken } = useAuth();
  const { user, isSignedIn, isLoaded } = useUser();
  const userId = user?.id ?? null;

  // Must run before the socket and offline-sync effects below, which need a token.
  useEffect(() => {
    setClerkTokenGetter(getToken);
  }, [getToken]);

  // ── Realtime socket ────────────────────────────────────────────────────────
  // The socket authenticates with the Clerk token in its handshake and the
  // server assigns rooms, so there is no "join" emit anymore.
  useEffect(() => {
    if (!isSignedIn || !userId) {
      if (isLoaded && socket.connected) socket.disconnect();
      return undefined;
    }

    let retryTimer = null;

    const handleConnect = () => {
      console.log(`🔌 Socket connected (${socket.id})`);
    };
    const handleDisconnect = (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    };
    // A rejected handshake (e.g. token not ready yet) is not retried by
    // socket.io automatically, so retry it ourselves while signed in.
    const handleConnectError = (error) => {
      if (error?.message !== "unauthorized") return;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        if (!socket.connected) socket.connect();
      }, SOCKET_AUTH_RETRY_MS);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    if (!socket.connected) socket.connect();

    return () => {
      clearTimeout(retryTimer);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      // Reconnect with the next user's token if the account changes.
      socket.disconnect();
    };
  }, [isSignedIn, isLoaded, userId]);

  // ── Offline dose queue ─────────────────────────────────────────────────────
  useOfflineSync({ isSignedIn, userId });

  // ── Don't leak one user's cached schedule to the next user on this device ─
  useEffect(() => {
    if (!isLoaded) return;

    let lastUser = null;
    try {
      lastUser = localStorage.getItem(LAST_USER_KEY);
    } catch {
      /* storage unavailable */
    }

    if (isSignedIn && userId) {
      if (lastUser && lastUser !== userId) void clearScheduleCache();
      try {
        localStorage.setItem(LAST_USER_KEY, userId);
      } catch {
        /* storage unavailable */
      }
    } else if (!isSignedIn && lastUser && navigator.onLine) {
      // Only on a real sign-out; while offline Clerk may just be unable to load.
      void clearScheduleCache();
      try {
        localStorage.removeItem(LAST_USER_KEY);
      } catch {
        /* storage unavailable */
      }
    }
  }, [isLoaded, isSignedIn, userId]);
  
  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar-sync"
          element={
            <ProtectedRoute>
              <CalendarSync />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medication"
          element={
            <ProtectedRoute>
              <Medications />
            </ProtectedRoute>
          }
        />
                <Route
          path="/history"
          element={
            <ProtectedRoute>
              <DoseHistory />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
