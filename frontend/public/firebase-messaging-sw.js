
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({  
  apiKey: "AIzaSyBzcZCTEoTChsT5Fx1bC20jLZUasF53keA",
  authDomain: "medialert-push-notifications.firebaseapp.com",
  projectId: "medialert-push-notifications",
  storageBucket: "medialert-push-notifications.firebasestorage.app",
  messagingSenderId: "217252043281",
  appId: "1:217252043281:web:546c07c09e1f69a1fc2fb0",
  measurementId: "G-7749Q45NEL"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image || '/vite.svg' // You can customize the icon here
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});