// ─────────────────────────────────────────────────────────────────────────────
// timezone.js — MUST be imported before any module that creates Dates.
//
// All day-boundary logic in this codebase (setHours(0,0,0,0), getHours(),
// "HH:mm" timing strings, node-cron schedules) runs in the process's local
// timezone. Hosts like Render run in UTC, which shifted "today" to start at
// 05:30 IST and stored "08:00" doses at 08:00 UTC (13:30 IST).
//
// Pinning the process timezone makes every one of those calculations match
// the users' wall clock. Override with APP_TIMEZONE if you deploy elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIMEZONE = "Asia/Kolkata";

process.env.TZ = process.env.APP_TIMEZONE || process.env.TZ || DEFAULT_TIMEZONE;

export const APP_TIMEZONE = process.env.TZ;
