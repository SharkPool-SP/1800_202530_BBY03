import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize optional services
const auth = getAuth(app);
const db = getFirestore(app);

const logoutUser = function () {
  signOut(auth);
  window.location.href = "index.html";
};

// redirect to index.html if not signed in
const checkSignedIn = function () {
  onAuthStateChanged(auth, (user) => {
    if (!window.location.pathname.endsWith("index.html")) {
      if (!user) window.location.href = "index.html";
    }
  });
};

/**
 * Gets FireStore document
 *
 * @param {String} repo database name
 * @param {String} id subcollection id
 * @param {Function} callback function that is called when document is fetched, first param is the doc data
 */
const getDocument = function (repo, id, callback) {
  const sub = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // reference to the user document
        const userRef = doc(db, repo, id);
        const userSnap = await getDoc(userRef);

        // unsubscribe
        sub();
        callback(userSnap);
      } catch (error) {
        // unsubscribe
        sub();
        callback();
      }
    }
  });
};

/**
 * Sets the data of a FireStore document
 *
 * @param {String} repo database name
 * @param {String} id subcollection id
 * @param {Object} newData Object with the new data for the document
 */
const setDocument = async function (repo, id, newData) {
  try {
    const userRef = doc(db, repo, id);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      await updateDoc(userRef, newData);
    } else {
      await setDoc(userRef, newData);
    }
  } catch (error) {
    console.error("Error updating user document:", error);
  }
};

export {
  auth,
  db,
  logoutUser,
  checkSignedIn,
  getDocument,
  setDocument,
  onAuthStateChanged,
  // Export additional Firestore functions for meetup functionality
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  query,
  where,
  serverTimestamp,
};
