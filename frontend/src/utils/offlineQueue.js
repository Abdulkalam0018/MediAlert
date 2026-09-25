/**
 * offlineQueue.js
 * ───────────────
 * IndexedDB helper for the MediAlert offline-first dose update queue.
 *
 * When the user marks a dose as taken/missed/delayed while offline,
 * the action is saved here. The Service Worker's Background Sync event
 * picks it up and replays it to the Node.js backend when connectivity returns.
 */

const DB_NAME = "medialert-offline";
const DB_VERSION = 1;
const STORE_NAME = "dose-queue";

// ── Open (or create) the IndexedDB database ─────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Auto-incrementing id so every queued action gets a unique key
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Add a pending dose update to the offline queue.
 * @param {{ trackId: string, time: string, status: string }} action
 */
export async function enqueueOfflineDose(action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add({
      ...action,
      queuedAt: new Date().toISOString(),
    });
    req.onsuccess = () => resolve(req.result); // returns the new id
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Get all pending dose updates from the queue.
 * @returns {Promise<Array>}
 */
export async function getAllQueuedDoses() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Remove a successfully synced dose update from the queue.
 * @param {number} id - The IndexedDB auto-increment key
 */
export async function dequeueOfflineDose(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Returns how many actions are currently queued (for UI badge).
 * @returns {Promise<number>}
 */
export async function getQueueCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}
