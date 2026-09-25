import { Server } from "socket.io";
import { verifyToken } from "@clerk/express";
import { User } from "./models/user.model.js";
import { isAllowedOrigin } from "./config/origins.js";

let io;

/**
 * Handshake auth: the client sends its Clerk session token in
 * `socket.handshake.auth.token`. We verify it and derive the user's rooms on
 * the server. Clients can no longer choose which room they join, so nobody
 * can subscribe to another user's dose updates by guessing an ID.
 */
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error("unauthorized"));
        }

        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });

        const clerkId = payload?.sub;
        if (!clerkId) {
            return next(new Error("unauthorized"));
        }

        const user = await User.findOne({ clerkId }).select("_id").lean();

        socket.data.clerkId = String(clerkId);
        // May be null for a brand-new account whose /users/sync hasn't run yet;
        // notifyRealtimeUser() always emits to the Clerk room too, so that's fine.
        socket.data.mongoUserId = user?._id ? String(user._id) : null;

        return next();
    } catch (error) {
        return next(new Error("unauthorized"));
    }
};

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                callback(null, !origin || isAllowedOrigin(origin));
            },
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.use(authenticateSocket);

    io.on("connection", (socket) => {
        const { clerkId, mongoUserId } = socket.data;

        socket.join(clerkId);
        if (mongoUserId) socket.join(mongoUserId);

        console.log(`🔌 Client connected: ${socket.id} (user ${clerkId})`);

        // Older clients still emit "join". Rooms are assigned server-side now,
        // so the requested room is ignored on purpose.
        socket.on("join", () => {});

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
