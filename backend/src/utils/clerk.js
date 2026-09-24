import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { getAuth } from "@clerk/express";
import { getIO } from "../socket.js";

const getUserFromClerk = async (req) => {
    let clerkUserId = null;
    if (req) {
        try {
            const auth = getAuth(req);
            clerkUserId = auth?.userId;
        } catch (_) {}

        if (!clerkUserId && typeof req.auth === 'function') {
            try {
                clerkUserId = req.auth()?.userId;
            } catch (_) {}
        } else if (!clerkUserId && req.auth?.userId) {
            clerkUserId = req.auth.userId;
        }
    }

    if (!clerkUserId) {
        return null;
    }

    const user = await User.findOne({ clerkId: clerkUserId });
    return user;
};

const getUserId = async (req) => {
    try {
        let _id = null;
        try {
            _id = req?.auth?.()?.sessionClaims?.mongoUserId;
        } catch (_) {}

        if (!_id && req?.auth?.sessionClaims?.mongoUserId) {
            _id = req.auth.sessionClaims.mongoUserId;
        }

        if (!_id) {
            const user = await getUserFromClerk(req);
            if (!user) {
                return null;
            }
            _id = user._id;
        }

        return _id;
    } catch (error) {
        console.error("Error getting user ID:", error);
        return null;
    }
};

const getAuthUserIds = async (req) => {
    try {
        let clerkUserId = null;
        if (req) {
            try {
                const auth = getAuth(req);
                clerkUserId = auth?.userId;
            } catch (_) {}

            if (!clerkUserId && typeof req.auth === 'function') {
                try {
                    clerkUserId = req.auth()?.userId;
                } catch (_) {}
            } else if (!clerkUserId && req.auth?.userId) {
                clerkUserId = req.auth.userId;
            }
        }

        let mongoUserId = null;
        if (clerkUserId) {
            const user = await User.findOne({ clerkId: clerkUserId });
            mongoUserId = user?._id;
        }

        return {
            clerkUserId: clerkUserId ? String(clerkUserId) : null,
            mongoUserId: mongoUserId ? String(mongoUserId) : null,
        };
    } catch (error) {
        return { clerkUserId: null, mongoUserId: null };
    }
};

const notifyRealtimeUser = async (req, fallbackUserId, event = "trackUpdated", payload = {}) => {
    try {
        let clerkUserId = null;
        let mongoUserId = null;

        if (req) {
            try {
                const auth = getAuth(req);
                clerkUserId = auth?.userId;
            } catch (_) {}

            if (!clerkUserId && typeof req.auth === 'function') {
                try {
                    clerkUserId = req.auth()?.userId;
                } catch (_) {}
            } else if (!clerkUserId && req.auth?.userId) {
                clerkUserId = req.auth.userId;
            }
        }

        if (fallbackUserId) {
            const idStr = String(fallbackUserId);
            if (idStr.startsWith("user_")) {
                if (!clerkUserId) clerkUserId = idStr;
            } else if (mongoose.Types.ObjectId.isValid(idStr)) {
                if (!mongoUserId) mongoUserId = idStr;
            }
        }

        // Cross-resolve if one ID is missing
        if (!mongoUserId && clerkUserId) {
            try {
                const user = await User.findOne({ clerkId: clerkUserId });
                if (user) mongoUserId = String(user._id);
            } catch (_) {}
        }

        if (!clerkUserId && mongoUserId && mongoose.Types.ObjectId.isValid(mongoUserId)) {
            try {
                const user = await User.findById(mongoUserId);
                if (user) clerkUserId = String(user.clerkId);
            } catch (_) {}
        }

        const rooms = new Set();
        if (clerkUserId) rooms.add(String(clerkUserId));
        if (mongoUserId) rooms.add(String(mongoUserId));
        if (fallbackUserId) rooms.add(String(fallbackUserId));

        if (rooms.size === 0) {
            console.warn(`⚠️ notifyRealtimeUser: No user rooms resolved for event '${event}'`);
            return;
        }

        const io = getIO();
        for (const room of rooms) {
            io.to(room).emit(event, payload);
            console.log(`📡 Emitted '${event}' via WebSockets to room: ${room}`);
        }
    } catch (err) {
        console.error("⚠️ notifyRealtimeUser error:", err.message);
    }
};

export { getUserFromClerk, getUserId, getAuthUserIds, notifyRealtimeUser };