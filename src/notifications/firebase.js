import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const generateFirebaseToken = async () => {
  try {
    const token = await Notification.requestPermission().then(
      async (permission) => {
        if (permission === "granted") {
          const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          });
          if (!currentToken) {
            console.log(
              "No registration token available. Request permission to generate one."
            );
            return null;
          }
          return currentToken;
        } else {
          console.error("Notification permission not granted.");
          return null;
        }
      }
    );
    return token;
  } catch (error) {
    console.error("Error generating Firebase token:", error);
    return null;
  }
}