import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                // Dynamically allow client origin to prevent CORS failures across localhost ports
                callback(null, true);
            },
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        socket.on("join", (userId) => {
            if (!userId) return;
            const rooms = Array.isArray(userId) ? userId : [userId];
            rooms.forEach(room => {
                socket.join(String(room));
                console.log(`👤 Socket ${socket.id} joined room: ${room}`);
            });
        });

        socket.on("disconnect", (reason) => {
            console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

export const getSocketIO = getIO;
