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

// Read the service account file
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
