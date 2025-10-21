import admin from "./index.js";

const sendNotification = async (token, title, body, data = {}) => {
  const message = {
    token, // can also be an array of tokens
    notification: {
      title,
      body,
    },
    data, // optional custom payload
  };

  try {
    const response = await admin.messaging().send(message);
  } catch (error) {
    console.error("❌ Error sending notification:", error);
  }
};

export { sendNotification };