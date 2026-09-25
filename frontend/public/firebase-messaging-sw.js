/* eslint-env serviceworker */
/* global importScripts, firebase */

// ─────────────────────────────────────────────────────────────────────────────
// firebase-messaging-sw.js
// MediAlert Service Worker
//
// Responsibilities:
//  1. FCM background push notifications
//  2. Offline app shell (index.html + hashed /assets) so the app opens offline
//  3. Cache each day's schedule response so it loads offline
//  4. Background Sync — wake open tabs so they replay doses logged offline
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

messaging.onBackgroundMessage((payload) => {
  // Messages with a `notification` block (everything the backend sends) are
  // already displayed by the FCM SDK. Showing them here as well made every
  // reminder appear twice. Only data-only messages need manual display.
  if (payload.notification) return;

  const title = payload.data?.title;
  if (!title) return;

  self.registration.showNotification(title, {
    body: payload.data?.body,
    icon: '/vite.svg',
    data: payload.data,
  });
});

// ── Cache setup ──────────────────────────────────────────────────────────────
const SHELL_CACHE = "medialert-shell-v1";
// v2: the v1 schedule cache was never cleared between users; the app now
// clears "medialert-schedule*" caches on sign-out / account switch.
const SCHEDULE_CACHE = "medialert-schedule-v2";
const CURRENT_CACHES = [SHELL_CACHE, SCHEDULE_CACHE];
const SHELL_URL = "/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(["/", SHELL_URL]))
      .catch(() => {
        // Offline during install: the shell gets cached on the next online visit.
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("medialert-") && !CURRENT_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );
      // Take control of open tabs right away so offline caching works
      // without a second reload.
      await self.clients.claim();
    })()
  );
});

// ── 2 & 3. Fetch handling ────────────────────────────────────────────────────
const cacheResponse = (cacheName, key, response) => {
  if (!response || !(response.ok || response.type === "opaque")) return;
  const copy = response.clone();
  caches.open(cacheName).then((cache) => cache.put(key, copy)).catch(() => {});
};

// Page loads: network first, fall back to the cached SPA shell.
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    // Every SPA route returns the same index.html, so store it under one key.
    if (response.ok && !response.redirected) cacheResponse(SHELL_CACHE, SHELL_URL, response);
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const cached = (await cache.match(SHELL_URL)) || (await cache.match("/"));
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>MediAlert</title><body style='font-family:system-ui;text-align:center;padding:20vh 1.5rem'><h2>You're offline</h2><p>Open MediAlert once while online so it can work offline next time.</p></body>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

// Vite's /assets/* files have content hashes in their names, so they never change.
async function handleImmutableAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cacheResponse(SHELL_CACHE, request, response);
  return response;
}

// Clerk's browser SDK (loaded from Clerk's CDN): serve the cached copy
// immediately and refresh it in the background.
async function handleStaleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => {
      cacheResponse(SHELL_CACHE, request, response);
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

// Schedule API: network first, cached copy when offline.
async function handleSchedule(request) {
  try {
    const response = await fetch(request);
    cacheResponse(SCHEDULE_CACHE, request, response);
    return response;
  } catch {
    const cache = await caches.open(SCHEDULE_CACHE);
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    // No cached copy of this day. The app shows "not saved on this device".
    return new Response(JSON.stringify({ medications: [], offline: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === "navigate" && sameOrigin) {
    event.respondWith(handleNavigation(request));
  } else if (sameOrigin && url.pathname.startsWith("/assets/")) {
    event.respondWith(handleImmutableAsset(request));
  } else if (url.pathname.includes("/api/v1/tracks/date/")) {
    event.respondWith(handleSchedule(request));
  } else if (!sameOrigin && url.pathname.includes("/npm/@clerk/")) {
    event.respondWith(handleStaleWhileRevalidate(request));
  }
});

// ── 4. Background Sync ───────────────────────────────────────────────────────
// The SW does NOT replay dose updates itself anymore. The API needs a Clerk
// session token, which expires within about a minute and can't be refreshed
// from here, so SW replays always failed with 401. Instead we wake any open
// MediAlert tab, and the page flushes the queue with a fresh token. With no
// tab open, the queue is flushed the next time the app is opened.
const SYNC_TAG = "medialert-dose-sync";

self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        windows.forEach((client) => client.postMessage({ type: "FLUSH_OFFLINE_QUEUE" }));
      })
  );
});
