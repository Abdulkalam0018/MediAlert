import amqp from "amqplib";
import { deliverNotification, isInvalidTokenError } from "../firebase/firebase.service.js";
import { User } from "../models/user.model.js";

let channel = null;

const NOTIFICATION_QUEUE = "notifications";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

const clearDeadFcmToken = async ({ userId, fcmToken }) => {
    if (!userId || !fcmToken) return;
    try {
        // Only clear it if it is still the same token (the user may have re-registered).
        await User.updateOne({ _id: userId, fcmToken }, { $unset: { fcmToken: 1 } });
        console.log(`🧹 Removed dead FCM token for user ${userId}`);
    } catch (err) {
        console.error("Failed to clear dead FCM token:", err.message);
    }
};

const handleNotificationMessage = async (msg) => {
    if (msg === null) return;

    let data;
    try {
        data = JSON.parse(msg.content.toString());
    } catch (err) {
        // Malformed message: retrying would never help, so drop it.
        console.error("🐰 Dropping malformed notification message:", err.message);
        channel?.ack(msg);
        return;
    }

    try {
        await deliverNotification(data.fcmToken, data.title, data.body, data.data);
        console.log("🐰 [RabbitMQ Consumer] Delivered notification for user:", data.userId);
        channel?.ack(msg);
    } catch (err) {
        if (isInvalidTokenError(err)) {
            await clearDeadFcmToken(data);
            channel?.ack(msg);
            return;
        }

        const attempts = Number(msg.properties.headers?.["x-attempts"] || 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
            console.error(`🐰 Giving up on notification for user ${data.userId} after ${attempts} attempts:`, err?.code || err?.message);
            channel?.ack(msg);
            return;
        }

        // Plain nack(msg) requeues immediately and forever, which hot-loops on
        // persistent failures. Instead, republish with an attempt counter after
        // a delay. The original stays unacked until then, so a crash mid-delay
        // just means RabbitMQ redelivers it.
        setTimeout(() => {
            const republished = publishEvent(NOTIFICATION_QUEUE, data, { "x-attempts": attempts });
            if (republished) {
                channel?.ack(msg);
            } else {
                channel?.nack(msg, false, true);
            }
        }, RETRY_DELAY_MS * attempts);
    }
};

export const initRabbitMQ = async () => {
    const rabbitUrl = process.env.RABBITMQ_URL;
    
    if (!rabbitUrl) {
        console.log("⚠️ RABBITMQ_URL not provided. RabbitMQ messaging is disabled.");
        return null;
    }

    try {
        const connection = await amqp.connect(rabbitUrl);

        connection.on("error", (err) => {
            console.error("❌ RabbitMQ connection error:", err.message);
        });
        connection.on("close", () => {
            // publishEvent() returns false while channel is null, so callers
            // fall back to sending pushes directly.
            console.warn("⚠️ RabbitMQ connection closed; falling back to direct push delivery.");
            channel = null;
        });

        channel = await connection.createChannel();
        await channel.prefetch(10);
        console.log("✅ Connected to RabbitMQ");

        await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
        await channel.assertQueue("calendar_sync", { durable: true });

        await channel.consume(NOTIFICATION_QUEUE, (msg) => {
            void handleNotificationMessage(msg);
        });

    } catch (error) {
        console.error("❌ Failed to connect to RabbitMQ, falling back to direct execution:", error.message);
        channel = null; // graceful fallback
    }

    return channel;
};

export const publishEvent = (queue, data, headers = {}) => {
    if (!channel) return false;
    
    try {
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true, headers });
        console.log(`🐰 [RabbitMQ Publisher] Event sent to queue: ${queue}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to publish to RabbitMQ queue ${queue}:`, error);
        return false;
    }
};
