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

// Register Service Worker for background notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}

export const generateFirebaseToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      console.error("Notification permission not granted.");
      return null;
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker is ready:', registration);

      // Get FCM token with service worker registration
      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!currentToken) {
        console.log(
          "No registration token available. Request permission to generate one."
        );
        return null;
      }

      console.log("FCM Token generated successfully");
      return currentToken;
    } else {
      console.error("Service Worker not supported in this browser");
      return null;
    }
  } catch (error) {
    console.error("Error generating Firebase token:", error);
    console.error("Error details:", error.message);
    return null;
  }
}