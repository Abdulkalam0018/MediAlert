import amqp from "amqplib";
import { sendNotification } from "../firebase/firebase.service.js";
let channel = null;

export const initRabbitMQ = async () => {
    const rabbitUrl = process.env.RABBITMQ_URL;
    
    if (!rabbitUrl) {
        console.log("⚠️ RABBITMQ_URL not provided. RabbitMQ messaging is disabled.");
        return null;
    }

    try {
        const connection = await amqp.connect(rabbitUrl);
        channel = await connection.createChannel();
        console.log("✅ Connected to RabbitMQ");

        // Define queues
        await channel.assertQueue("notifications", { durable: true });
        await channel.assertQueue("calendar_sync", { durable: true });

        // Setup Consumer for Notifications
        channel.consume("notifications", async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                console.log("🐰 [RabbitMQ Consumer] Processed notification for user:", data.userId);
                
                // Actual FCM push logic decoupled from main thread
                try {
                    await sendNotification(data.fcmToken, data.title, data.body, data.data);
                    channel.ack(msg);
                } catch (err) {
                    console.error("RabbitMQ FCM Push Error:", err);
                    channel.nack(msg); // re-queue or handle error
                }
            }
        });

    } catch (error) {
        console.error("❌ Failed to connect to RabbitMQ, falling back to direct execution:", error.message);
        channel = null; // graceful fallback
    }

    return channel;
};

export const publishEvent = (queue, data) => {
    if (!channel) return false;
    
    try {
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
        console.log(`🐰 [RabbitMQ Publisher] Event sent to queue: ${queue}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to publish to RabbitMQ queue ${queue}:`, error);
        return false;
    }
};
