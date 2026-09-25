// Shared allow-list used by Express CORS, Socket.IO CORS and the Google
// OAuth redirect check, so all three agree on which frontends are trusted.

const normalize = (origin) => String(origin || "").trim().replace(/\/+$/, "");

export const getAllowedOrigins = () => {
    const raw = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : ["http://localhost:5173"];
    return raw.map(normalize).filter(Boolean);
};

export const isAllowedOrigin = (origin) => {
    const allowed = getAllowedOrigins();
    if (allowed.includes("*")) return true;
    return allowed.includes(normalize(origin));
};

// Fallback frontend URL used when a redirect target is missing or untrusted.
export const getDefaultFrontendUrl = () =>
    normalize(process.env.FRONTEND_URL) || getAllowedOrigins().find((o) => o !== "*") || "http://localhost:5173";
