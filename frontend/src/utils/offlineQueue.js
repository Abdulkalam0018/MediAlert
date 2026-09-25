/**
 * offlineQueue.js
 * ───────────────
 * IndexedDB queue for dose updates made while offline.
 *
 * Why the page (not the Service Worker) replays the queue:
 * the backend needs a Clerk session token, and Clerk tokens expire after about
 * a minute. The Service Worker can't mint a fresh one, so the old SW replay
 * sent requests with no/expired auth (401) — and in production it sent them to
 * the Vercel origin instead of the API host. Now the SW only nudges open tabs,
 * and the page flushes the queue with a fresh token via axiosInstance.
 */

import axios from "axios";
import axiosInstance from "../api/axiosInstance.js";

const DB_NAME = "medialert-offline";
const DB_VERSION = 1; // same schema as before, so already-queued items are kept
const STORE_NAME = "dose-queue";

export const SYNC_TAG = "medialert-dose-sync";
export const OFFLINE_SYNC_EVENT = "medialert:offline-sync";
export const QUEUE_CHANGED_EVENT = "medialert:offline-queue-changed";

// ── IndexedDB plumbing ──────────────────────────────────────────────────────
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    req.onsuccess = (e) => {
      const db = e.target.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = (e) => {
      dbPromise = null;
      reject(e.target.error);
    };
  });

  return dbPromise;
}

const requestToPromise = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const transactionDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

const doseKey = (trackId, time) => `${trackId}|${new Date(time).toISOString()}`;

const notifyQueueChanged = () => {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
};

const belongsTo = (userId) => (item) =>
  // Items queued before userIds were recorded are attempted for whoever is
  // signed in; the server's ownership check rejects them if they aren't theirs.
  !userId || !item.userId || item.userId === userId;

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Queue a dose update. If the same dose is already queued, the newer status
 * replaces it, so marking "delayed" then "taken" offline syncs only "taken".
 * @param {{ trackId: string, time: string, status: string, userId?: string }} action
 */
export async function enqueueOfflineDose({ trackId, time, status, userId }) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const key = doseKey(trackId, time);

  const existing = await requestToPromise(store.getAll());
  existing
    .filter((item) => doseKey(item.trackId, item.time) === key)
    .forEach((item) => store.delete(item.id));

  store.add({
    trackId,
    time,
    status,
    userId: userId ?? null,
    queuedAt: new Date().toISOString(),
  });

  await transactionDone(tx);
  notifyQueueChanged();
}

/** All queued updates for this user, oldest first. */
export async function getQueuedDoses(userId) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const all = await requestToPromise(tx.objectStore(STORE_NAME).getAll());
  return all.filter(belongsTo(userId)).sort((a, b) => a.id - b.id);
}

export async function getQueueCount(userId) {
  return (await getQueuedDoses(userId)).length;
}

export async function removeQueuedDose(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  await transactionDone(tx);
}

/**
 * Overlay queued statuses onto a schedule from the API (or the SW cache).
 * Without this, refetching before the queue had synced flipped offline doses
 * back to "pending" and invited the user to log them twice.
 */
export function applyQueuedStatuses(medications, queue) {
  if (!queue?.length) return medications;

  const queuedByDose = new Map(queue.map((item) => [doseKey(item.trackId, item.time), item]));

  return medications.map((m) => {
    const queued = queuedByDose.get(doseKey(m.trackId, m.time));
    return queued ? { ...m, status: queued.status, pendingSync: true } : m;
  });
}

/** True when a request failed because the network (not the server) failed. */
export function isNetworkError(error) {
  if (!axios.isAxiosError(error)) return false;
  if (error.code === "ERR_CANCELED") return false;
  return !error.response;
}

/** Ask the Service Worker to wake open tabs when connectivity returns (Chromium only). */
export async function requestBackgroundSync() {
  try {
    // getRegistration() resolves to undefined when there is no SW, unlike
    // serviceWorker.ready, which would hang forever.
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.sync?.register(SYNC_TAG);
  } catch (error) {
    // Not supported (Safari/Firefox) or denied. The page still flushes on the
    // "online" event and on next load, so this is only a bonus.
    console.debug("[Offline] Background Sync unavailable:", error?.message);
  }
}

// ── Flushing ────────────────────────────────────────────────────────────────
let flushInFlight = null;

const runExclusive = (fn) =>
  // Only one tab flushes at a time, so two open tabs don't send the same update twice.
  navigator.locks?.request ? navigator.locks.request("medialert-offline-flush", fn) : fn();

// 4xx other than auth/timeout/rate-limit means the dose no longer exists or the
// update is invalid; retrying won't help. Everything else is retried later.
const isPermanentFailure = (status) =>
  status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status);

async function flushQueue(userId) {
  if (!navigator.onLine) {
    return { synced: 0, dropped: [], remaining: await getQueueCount(userId), skipped: true };
  }

  const queue = await getQueuedDoses(userId);
  if (queue.length === 0) {
    return { synced: 0, dropped: [], remaining: 0, skipped: true };
  }

  let synced = 0;
  const dropped = [];

  for (const item of queue) {
    try {
      await axiosInstance.patch(`/tracks/${item.trackId}`, {
        status: item.status,
        time: item.time,
        // Record when the dose was actually taken, not when it synced.
        ...(item.status === "taken" ? { takenAt: item.queuedAt } : {}),
      });
      await removeQueuedDose(item.id);
      synced++;
    } catch (error) {
      const status = error?.response?.status;

      if (status && isPermanentFailure(status)) {
        console.warn(`[Offline] Dropping update for ${item.trackId}: server returned ${status}`);
        await removeQueuedDose(item.id);
        dropped.push(item);
        continue;
      }

      // Network down again, signed out, or server error: keep the rest for later.
      console.warn("[Offline] Sync paused:", status || error?.message);
      break;
    }
  }

  const remaining = await getQueueCount(userId);
  return { synced, dropped, remaining, skipped: false };
}

/**
 * Replay queued updates with the current Clerk session. Safe to call often:
 * concurrent calls share one run, and an empty queue is a no-op.
 */
export function flushOfflineQueue({ userId } = {}) {
  if (!flushInFlight) {
    flushInFlight = runExclusive(() => flushQueue(userId))
      .then((result) => {
        if (!result.skipped) {
          window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT, { detail: result }));
          notifyQueueChanged();
        }
        return result;
      })
      .catch((error) => {
        console.error("[Offline] Flush failed:", error);
        return { synced: 0, dropped: [], remaining: null, skipped: true };
      })
      .finally(() => {
        flushInFlight = null;
      });
  }
  return flushInFlight;
}

/** Remove cached schedules so the next user on this device can't see them offline. */
export async function clearScheduleCache() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((key) => key.startsWith("medialert-schedule")).map((key) => caches.delete(key))
  );
}
