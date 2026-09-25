import crypto from "crypto";

// Signed, expiring OAuth `state` values.
//
// Previously the state was plain base64 JSON, so anyone could forge one with
// another user's Clerk ID and link their own Google account to that user
// (the victim's medication schedule would then sync into the attacker's
// calendar). Now the state is HMAC-signed and expires after 10 minutes.

const STATE_TTL_MS = 10 * 60 * 1000;
let warnedAboutFallback = false;

const getSecret = () => {
    const secret = process.env.OAUTH_STATE_SECRET;
    if (secret) return secret;

    if (!warnedAboutFallback) {
        console.warn("⚠️ OAUTH_STATE_SECRET is not set; falling back to GOOGLE_CLIENT_SECRET for signing OAuth state.");
        warnedAboutFallback = true;
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error("No secret available to sign OAuth state");
    }
    return process.env.GOOGLE_CLIENT_SECRET;
};

const sign = (payloadB64) =>
    crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");

export const createOAuthState = ({ clerkId, redirectOrigin }) => {
    const payload = {
        uid: clerkId,
        r: redirectOrigin,
        n: crypto.randomBytes(12).toString("base64url"),
        exp: Date.now() + STATE_TTL_MS,
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${payloadB64}.${sign(payloadB64)}`;
};

/**
 * Returns { clerkId, redirectOrigin } for a valid state, or null if the state
 * is missing, tampered with, or expired.
 */
export const verifyOAuthState = (state) => {
    if (typeof state !== "string") return null;

    const [payloadB64, signature] = state.split(".");
    if (!payloadB64 || !signature) return null;

    const expected = Buffer.from(sign(payloadB64));
    const provided = Buffer.from(signature);
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
        if (!payload?.uid || typeof payload.exp !== "number" || payload.exp < Date.now()) {
            return null;
        }
        return { clerkId: payload.uid, redirectOrigin: payload.r };
    } catch {
        return null;
    }
};
