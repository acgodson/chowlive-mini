import { FirebaseApp, getApp, initializeApp } from "firebase/app";
import { Firestore, getFirestore } from "firebase/firestore";
import { Auth, getAuth } from "firebase/auth"; // Add this import

////////////////////////////////////
/* Firebase Client App Config */
///////////////////////////////////

export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_APIKEY,
  authDomain: "chowlive-africa.vercel.app",
  databaseURL: "https://chow-live-default-rtdb.firebaseio.com",
  projectId: "chow-live",
  storageBucket: "chow-live.appspot.com",
  messagingSenderId: "1011180450496",
  appId: "1:1011180450496:web:30535474d7f7b69822f325",
  measurementId: "G-GWCYMV0MZ5",
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth; // Add this variable

export const initializeFirebase = (): FirebaseApp => {
  try {
    app = getApp();
  } catch {
    app = initializeApp(FIREBASE_CONFIG);
  }
  db = getFirestore(app);
  auth = getAuth(app); // Initialize auth
  return app;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    initializeFirebase();
  }
  return app;
};

export const getFirestoreDB = (): Firestore => {
  if (!db) {
    initializeFirebase();
  }
  return db;
};

export const getFirebaseAuth = (): Auth => {
  // Add this getter
  if (!auth) {
    initializeFirebase();
  }
  return auth;
};
