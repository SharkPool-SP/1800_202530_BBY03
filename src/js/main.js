// main.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics"; 

const firebaseConfig = {
  apiKey: "AIzaSyD1MW9ABZAt3EVnDh-IQ7TmgcwRHf_uzjw",
  authDomain: "clustr-166e3.firebaseapp.com",
  projectId: "clustr-166e3",
  storageBucket: "clustr-166e3.firebasestorage.app",
  messagingSenderId: "198786290333",
  appId: "1:198786290333:web:d519ced81926998b87ba74",
  measurementId: "G-086X40BMGQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize optional services
const auth = getAuth(app);
const db = getFirestore(app);

// Optional (works only in HTTPS / production)
let analytics;
try {
  analytics = getAnalytics(app);
} catch (err) {
  console.warn("Analytics not supported in this environment");
}

console.log("✅ Firebase initialized successfully");
export { auth, db };
