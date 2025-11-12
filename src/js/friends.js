import {
  auth,
  checkSignedIn,
  getDocument,
  setDocument,
  onAuthStateChanged,
} from "./FireStoreUtil.js";

/* Firebase Events */
checkSignedIn();

onAuthStateChanged(auth, (user) => {
  Events.emit("AUTH_STATE_CHANGE", user);
});

function initAll() {}

document.addEventListener("DOMContentLoaded", initAll);
