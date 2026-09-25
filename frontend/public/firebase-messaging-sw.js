// ─────────────────────────────────────────────────────────────────────────────
// firebase-messaging-sw.js
// MediAlert Service Worker
//
// Responsibilities:
//  1. FCM background push notifications (existing)
//  2. Cache today's medication schedule (Cache API) so it loads offline
//  3. Background Sync — replay queued dose updates when internet returns
// ─────────────────────────────────────────────────────────────────────────────

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// ── 1. Firebase / FCM setup ──────────────────────────────────────────────────
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
    icon: payload.notification.image || '/vite.svg'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── 2. Cache API — cache today's schedule response ───────────────────────────
const CACHE_NAME = "medialert-schedule-v1";

// Cache the schedule API response when it's fetched online
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only cache GET requests to the tracks/date/* endpoint
  if (
    event.request.method === "GET" &&
    url.pathname.includes("/api/v1/tracks/date/")
  ) {
    event.respondWith(
      fetch(event.request.clone())
        .then((response) => {
          // Save fresh response to cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline — serve from cache
          return caches.match(event.request).then((cached) => {
            if (cached) {
              console.log("[SW] Serving schedule from cache (offline)");
              return cached;
            }
            // No cache either — return empty JSON so UI doesn't crash
            return new Response(
              JSON.stringify({ medications: [], offline: true }),
              { headers: { "Content-Type": "application/json" } }
            );
          });
        })
    );
  }
});

// ── 3. Background Sync — replay queued dose updates ──────────────────────────
const DB_NAME = "medialert-offline";
const STORE_NAME = "dose-queue";
const SYNC_TAG = "medialert-dose-sync";

// Open IndexedDB from inside the Service Worker
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllQueued(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function deleteQueued(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

// Fired by the browser when internet is restored
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    console.log("[SW] Background Sync triggered — replaying offline dose queue");
    event.waitUntil(replayQueue());
  }
});

async function replayQueue() {
  const db = await openDB();
  const queue = await getAllQueued(db);

  if (queue.length === 0) {
    console.log("[SW] Queue is empty — nothing to sync");
    return;
  }

  console.log(`[SW] Replaying ${queue.length} queued dose update(s)...`);

  for (const action of queue) {
    try {
      const apiBase = self.location.origin.includes("localhost")
        ? "http://localhost:8000/api/v1"
        : "/api/v1";

      const response = await fetch(`${apiBase}/tracks/${action.trackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // Auth token stored by the app in localStorage
          ...(action.authToken
            ? { Authorization: `Bearer ${action.authToken}` }
            : {}),
        },
        body: JSON.stringify({
          status: action.status,
          time: action.time,
        }),
      });

      if (response.ok) {
        console.log(`[SW] ✅ Synced dose: ${action.trackId} → ${action.status}`);
        await deleteQueued(db, action.id);

        // Notify the app that sync completed so UI can refresh
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "OFFLINE_SYNC_COMPLETE",
              trackId: action.trackId,
              status: action.status,
            });
          });
        });
      } else {
        console.warn(`[SW] ⚠️ Sync failed for ${action.trackId}: ${response.status}`);
      }
    } catch (err) {
      console.error("[SW] Replay error:", err);
      // Keep in queue — will retry on next sync event
    }
  }
}