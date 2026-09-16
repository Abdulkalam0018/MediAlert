import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_APP_API_URL 
    ? import.meta.env.VITE_APP_API_URL.replace('/api/v1', '') 
    : 'http://localhost:8000';

export const socket = io(SOCKET_URL, {
    autoConnect: false,
});
