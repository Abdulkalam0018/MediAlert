import { io } from "socket.io-client";
import { getAuthToken } from "./api/axiosInstance.js";

const rawUrl =
  import.meta.env.VITE_APP_SOCKET_URL ||
  import.meta.env.VITE_APP_API_URL ||
  "http://localhost:8000";

const SOCKET_URL = rawUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  // Called on every (re)connect, so the server always gets a fresh Clerk
  // token. The server derives the user's rooms from it; clients no longer
  // emit "join" with an ID of their choosing.
  auth: (cb) => {
    getAuthToken()
      .then((token) => cb({ token }))
      .catch(() => cb({}));
  },
});
