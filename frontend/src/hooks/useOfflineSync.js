import { useEffect } from "react";
import { toast } from "sonner";
import { flushOfflineQueue } from "../utils/offlineQueue.js";

const RETRY_INTERVAL_MS = 60 * 1000;

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Replays doses logged offline, using the current Clerk session:
 *  - once on sign-in / app load (covers "closed the tab while offline"),
 *  - whenever the browser comes back online,
 *  - when the Service Worker's Background Sync nudges the tab,
 *  - every minute while online, in case a previous attempt hit a server error.
 */
export default function useOfflineSync({ isSignedIn, userId }) {
  useEffect(() => {
    if (!isSignedIn || !userId) return undefined;

    let cancelled = false;

    const run = async () => {
      const result = await flushOfflineQueue({ userId });
      if (cancelled || !result || result.skipped) return;

      if (result.synced > 0) {
        toast.success(`Synced ${plural(result.synced, "dose update")} you logged offline.`);
      }
      if (result.dropped.length > 0) {
        toast.error(
          `${plural(result.dropped.length, "offline update")} couldn't be saved because the dose was changed or removed. Check the schedule and log it again.`
        );
      }
    };

    void run();

    const handleOnline = () => void run();
    const handleSWMessage = (event) => {
      if (event.data?.type === "FLUSH_OFFLINE_QUEUE") void run();
    };
    const interval = setInterval(() => {
      if (navigator.onLine) void run();
    }, RETRY_INTERVAL_MS);

    window.addEventListener("online", handleOnline);
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, [isSignedIn, userId]);
}
