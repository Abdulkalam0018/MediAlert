import admin from "firebase-admin";
import { readFileSync, existsSync  } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localPath = join(__dirname, "firebase-secret.json");
const deployedPath = "/etc/secrets/firebase-secret.json";

// Use deployed secret if available, else fallback to local
const serviceAccountPath = existsSync(deployedPath)
  ? deployedPath
  : localPath;

let firebaseAdmin = null;

if (existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin initialized successfully");
  } catch (err) {
    console.error("⚠️ Failed to parse or initialize Firebase Admin SDK:", err.message);
  }
} else {
  console.log("⚠️ firebase-secret.json not found. Push notifications will be disabled locally.");
}

export default firebaseAdmin;
