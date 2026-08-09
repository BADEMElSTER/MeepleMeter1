import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseAdminEmails = String(import.meta.env.VITE_ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const firebaseConfigStatus = {
  apiKeyPrefix: firebaseConfig.apiKey ? firebaseConfig.apiKey.slice(0, 12) : "",
  apiKeyLength: firebaseConfig.apiKey?.length ?? 0,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
};

const app = isFirebaseConfigured
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = app ? getAuth(app) : null;
export const firestoreDb = app ? getFirestore(app) : null;
