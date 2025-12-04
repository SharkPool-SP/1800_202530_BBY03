import {
  db,
  auth,
  checkSignedIn,
  getDocument,
  setDocument,
  onAuthStateChanged,
  collection,
  getDocs,
} from "./FireStoreUtil.js";

/* Firebase Events */
checkSignedIn();

// if we are loaded in an iframe, this means we should simplify the layout
// this is really only used for the meetup form page since I dont want to make
// an entirely new page for similar code
let isNormal = true;
if (new URLSearchParams(window.location.search).get("inframe") === "true") {
  isNormal = false;

  // clean up the dom
  document.querySelector("clustr-navbar").remove();
  document.querySelector("profile-nav").remove();

  const updateLocBtn = document.querySelector(
    `div[class="map-controls"] div[class="update-location"]`
  );
  updateLocBtn.style.marginTop = "90vh";
  updateLocBtn.firstElementChild.textContent = "Set Meetup Location";
}

let thisUser, myPin;

onAuthStateChanged(auth, (user) => {
  thisUser = user;
  if (isNormal) unloadPins();
  Events.emit("AUTH_STATE_CHANGE", user);
});

function getLocalStore() {
  const stored = localStorage.getItem("clustr-store");
  const defaultStore = {
    map: {
      zoom: 3,
      hasPinnedBefore: false,
    },
  };

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      console.warn("Failed to parse local storage!");
      return defaultStore;
    }
  } else {
    return defaultStore;
  }
}

function updateLocalStore() {
  localStorage.setItem("clustr-store", JSON.stringify(storage));
}

const storage = getLocalStore();

/* unpack local storage items */
document.body.style.setProperty("--map-zoom", `scale(${storage.map.zoom})`);

/* Utility functions */
function getZoom() {
  const root = document.body;
  const zoom = getComputedStyle(root).getPropertyValue("--map-zoom");
  return parseFloat(zoom.slice(6, zoom.length - 1));
}

function getMapPosition(mapDiv) {
  const x = parseFloat(mapDiv.style.left);
  const y = parseFloat(mapDiv.style.top);
  return [isNaN(x) ? 0 : x, isNaN(y) ? 0 : y];
}

function getMapBounds(mapDiv) {
  const rect = mapDiv.getBoundingClientRect();
  const zoom = getZoom();
  const padding = (7 - zoom) * 50;
  return {
    left: (rect.width - padding * zoom) * -1,
    right: padding,
    top: (rect.height - padding * zoom) * -1,
    bottom: padding,
  };
}

function clamp(min, max, value) {
  return Math.min(max, Math.max(min, value));
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function handleSetPin(mapDiv) {
  if (!storage.map.hasPinnedBefore && isNormal) {
    showClustrModal(
      "How to Update Your Location",
      `<p>
          Click any point on the map and click 'Save My Location'.<br>Your friends will now be able to see you in your new spot.
          <br><br>
          <span class="label-update inner-p">
            <input type="checkbox"><span>Dont show again</span>
          </span>
        </p>`
    );

    const modalLabel = document.querySelector(
      `div[class="clustr-modal"] span[class^="label-update"]`
    );
    modalLabel.addEventListener("click", (event) => {
      event.stopPropagation();

      const spanLabel = event.target.closest(`span[class^="label-update"]`);
      const checkbox = spanLabel.children[0];
      if (event.target !== checkbox) checkbox.checked = !checkbox.checked;
      storage.map.hasPinnedBefore = checkbox.checked;
      updateLocalStore();
    });
  }

  Events.on("MAP_CLICK", (pos) => {
    const rect = mapDiv.getBoundingClientRect();
    const zoom = getZoom();

    const unscaledWidth = rect.width / zoom;
    const unscaledHeight = rect.height / zoom;

    const localX = (pos[0] - rect.left) / zoom;
    const localY = (pos[1] - rect.top) / zoom;

    myPin.dataset.px = localX / unscaledWidth;
    myPin.dataset.py = localY / unscaledHeight;
    myPin.style.left = `${localX}px`;
    myPin.style.top = `${localY}px`;
  });
}

function handleUpdatePin() {
  Events.off("MAP_CLICK");

  setDocument("users", thisUser.uid, {
    location: [parseFloat(myPin.dataset.px), parseFloat(myPin.dataset.py)],
  });
}

async function unloadPins() {
  const pinDiv = document.querySelector(".pin-display").firstElementChild;
  const mapDiv = document.querySelector(".map-display").firstElementChild;
  const rect = mapDiv.getBoundingClientRect();

  Events.once("PROFILE_PIC_FOUND", (userData) => {
    const pfp = userData.get("pfp");
    if (pfp && !pfp.endsWith(".svg")) {
      myPin.querySelector("img").src = "data:image/png;base64," + pfp;
    }

    const position = userData.get("location");
    const zoom = getZoom();
    const unscaledWidth = rect.width / zoom;
    const unscaledHeight = rect.height / zoom;
    myPin.style.left = `${position[0] * unscaledWidth}px`;
    myPin.style.top = `${position[1] * unscaledHeight}px`;
    myPin.style.display = "";
  });

  // unload users
  const zoom = getZoom();
  const usersSnapshot = await getDocs(collection(db, "users"));
  getDocument("users", thisUser.uid, (data) => {
    if (!data) return;
    const programMatters = (prog) => prog !== "Other...";
    const myProgram = data.get("program")[0];
    const myProgramMatters = programMatters(myProgram);
    const myFriends = data.get("friends");

    const users = usersSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((user) => {
        // only show initialized profiles of the same program
        // or friends
        const programMatches =
          myProgramMatters && programMatters(user.program[0])
            ? myProgram === user.program[0]
            : true;
        const isFriend = myFriends.includes(user.id);
        return (
          user.id !== thisUser.uid &&
          user.hasInitProfile &&
          (programMatches || isFriend)
        );
      });

    for (const user of users) {
      const pfp = user.pfp.endsWith(".svg")
        ? user.pfp
        : "data:image/png;base64," + user.pfp;
      const pin = createPin(pfp, user.userName, false, mapDiv);

      const position = user.location;
      const unscaledWidth = rect.width / zoom;
      const unscaledHeight = rect.height / zoom;
      pin.style.left = `${position[0] * unscaledWidth}px`;
      pin.style.top = `${position[1] * unscaledHeight}px`;
    }
  });

  // unload meetups
  const meetsSnapshot = await getDocs(collection(db, "meetups"));
  const meets = meetsSnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((m) => m.start !== "");

  for (const meet of meets) {
    const pin = createPin("...", meet.title, true, pinDiv);

    const position = meet.location;
    const unscaledWidth = rect.width / zoom;
    const unscaledHeight = rect.height / zoom;
    pin.style.left = `${position[0] * unscaledWidth}px`;
    pin.style.top = `${position[1] * unscaledHeight}px`;
    attachMeetupListener(pin, meet);
  }
}

function attachMeetupListener(pin, data) {
  pin.addEventListener("click", (e) => {
    // Show modal for meetup details
    e.stopPropagation();
    const dateTime = new Date(data.start);
    const formattedDate = `${dateTime.toDateString()}, ${
      dateTime.getHours() % 12
    }:${dateTime.getMinutes()}${dateTime.getHours() > 12 ? "PM" : "AM"}`;
    const maxDisplay = data.maxAttendees > -1 ? `/${data.maxAttendees}` : "";

    showClustrModal(
      "Meetup Details",
      `<p>
        <strong style="font-size: 1.5em; border-bottom: solid 4px var(--theme-value-light);">
          ${escapeHtml(data.title)}
        </strong>
        <br/><br/>
        ${
          data.owner
            ? `<span><b>Organizer:</b> ${escapeHtml(data.owner)}</span>`
            : ""
        }
        <br/>
        <span><b>Attendees:</b> ${data.members}${maxDisplay}</span>
        <br/><br/>
        <span><b>Location:</b> ${escapeHtml(data.locationText)}</span>
        <br/>
        <span><b>Time:</b> ${formattedDate}</span>
        <br/><br/>
        ${
          data.details
            ? `<span><b>Description:</b><br/>${escapeHtml(data.details)}</span>`
            : ""
        }
        <br/><br/>
        <button id="join" class="btn">Join Meetup</button>
        <button id="leave" class="btn">Leave Meetup</button>
      </p>`
    );

    // Make quick-join/leave buttons functional
    const joinBtn = document.querySelector(
      `.clustr-modal button.btn[id="join"]`
    );
    const leaveBtn = document.querySelector(
      `.clustr-modal button.btn[id="leave"]`
    );

    const updateState = (isInit) => {
      // button state
      if (data.attendees.includes(thisUser.uid)) {
        joinBtn.setAttribute("blocked", "true");
        leaveBtn.removeAttribute("blocked");
      } else {
        leaveBtn.setAttribute("blocked", "true");
        joinBtn.removeAttribute("blocked");
      }

      // push changes to firebase
      if (isInit) return;
      setDocument("meetups", data.id, {
        attendees: data.attendees,
      });
    };
    updateState(true);

    joinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      data.attendees.push(thisUser.uid);
      updateState(false);
    });
    leaveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = data.attendees.indexOf(thisUser.uid);
      if (index === 0) {
        // the creator is leaving their own meetup, dont allow
        alert(
          "You are the creator of this meetup! Go to the 'My Meetups' page to delete this Meetup."
        );
        return;
      }
      data.attendees.splice(index, 1);
      updateState(false);
    });
  });
}

/* Main Initialization */
function initAll() {
  const pinDiv = document.querySelector(".pin-display").firstElementChild;
  const mapDiv = document.querySelector(".map-display").firstElementChild;
  const mapDragger = document.querySelector(".map-dragger");

  /* 🖱️ Map Dragger */
  // Mobile Development SUCKS
  // Is it that hard to use the same event names?
  function dragStart(e) {
    e.preventDefault();
    e.stopPropagation();

    const isTouch = e.type === "touchstart";
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    const downTime = Date.now();

    const mapPos = getMapPosition(mapDiv);
    const bounds = getMapBounds(mapDiv);

    const moveEvent = (e) => {
      const x = isTouch ? e.touches[0].clientX : e.clientX;
      const y = isTouch ? e.touches[0].clientY : e.clientY;
      const dx = x - startX;
      const dy = y - startY;
      mapDiv.style.left =
        clamp(bounds.left, bounds.right, mapPos[0] + dx) + "px";
      mapDiv.style.top =
        clamp(bounds.top, bounds.bottom, mapPos[1] + dy) + "px";
      pinDiv.style.left = mapDiv.style.left;
      pinDiv.style.top = mapDiv.style.top;
    };

    const dragEnd = (e) => {
      e.stopPropagation();
      mapDragger.removeEventListener(isTouch ? "touchend" : "mouseup", dragEnd);
      mapDragger.removeEventListener(
        isTouch ? "touchmove" : "mousemove",
        moveEvent
      );

      if (Date.now() - downTime < 200) {
        // likely a click event instead of drag
        Events.emit("MAP_CLICK", [startX, startY]);
      }
    };

    mapDragger.addEventListener(isTouch ? "touchend" : "mouseup", dragEnd);
    mapDragger.addEventListener(
      isTouch ? "touchmove" : "mousemove",
      moveEvent,
      {
        passive: false,
      }
    );
  }
  mapDragger.addEventListener("touchstart", dragStart, { passive: false });
  mapDragger.addEventListener("mousedown", dragStart);

  /* 🔍 Zoom Controls */
  const zoomDiv = document.querySelector(".zoom-controls");
  zoomDiv.addEventListener("click", (e) => {
    e.stopPropagation();

    const button = e.target.closest("button");
    if (!button) return;

    const mapPos = getMapPosition(mapDiv);
    let currentZoom = getZoom();
    let newZoom = currentZoom;

    switch (button.id) {
      case "plus":
        newZoom = Math.min(7, currentZoom + 0.5);
        break;
      case "minus":
        newZoom = Math.max(1, currentZoom - 0.5);
        break;
      case "reset":
        mapPos[0] = 0;
        mapPos[1] = 0;
        newZoom = 3;
        break;
    }

    document.body.style.setProperty("--map-zoom", `scale(${newZoom})`);
    mapDiv.style.left = mapPos[0] * (newZoom / currentZoom) + "px";
    mapDiv.style.top = mapPos[1] * (newZoom / currentZoom) + "px";
    pinDiv.style.left = mapDiv.style.left;
    pinDiv.style.top = mapDiv.style.top;
    storage.map.zoom = newZoom;
    updateLocalStore();
  });

  /* 📍 Location Updater */
  const updateLocBtn = document.querySelector(".update-location button");
  updateLocBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isNormal) {
      if (e.target.id === "update") {
        e.target.textContent = "Save My Location";
        e.target.id = "set";
        handleSetPin(mapDiv);
      } else {
        e.target.textContent = "Update My Location";
        e.target.id = "update";
        handleUpdatePin();
      }
    } else {
      // callback to the iframe of our pins location
      window.parent.postMessage(
        { type: "LOCATION", text: myPin.dataset.px + "||" + myPin.dataset.py },
        window.location.origin
      );
    }
  });

  myPin = isNormal
    ? createPin("../images/default-avatar.svg", "You", false, mapDiv)
    : createPin("...", "", true, mapDiv);
  myPin.id = "me";
  myPin.style.display = isNormal ? "none" : "";
  if (!isNormal) {
    myPin.style.left = "25%";
    myPin.style.top = "50%";
    handleSetPin(mapDiv);
  }
}

document.addEventListener("DOMContentLoaded", initAll);
