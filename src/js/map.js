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

let thisUser, myPin;

onAuthStateChanged(auth, (user) => {
  thisUser = user;
  unloadPins();
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

function handleSetPin(mapDiv) {
  if (!storage.map.hasPinnedBefore) {
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

  Events.on("MAP_CLICK", (e) => {
    const rect = mapDiv.getBoundingClientRect();
    const zoom = getZoom();

    const localX = (e.clientX - rect.left) / zoom;
    const localY = (e.clientY - rect.top) / zoom;

    myPin.dataset.px = localX / rect.width;
    myPin.dataset.py = localY / rect.height;
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
  const pinDiv = document.querySelector(`div[class="pins"]`);
  const mapDiv = document.querySelector(".map-display").firstElementChild;
  const rect = mapDiv.getBoundingClientRect();

  Events.once("PROFILE_PIC_FOUND", (userData) => {
    const pfp = userData.get("pfp");
    if (pfp && !pfp.endsWith(".svg")) {
      myPin.querySelector("img").src = "data:image/png;base64," + pfp;
    }

    const position = userData.get("location");
    myPin.style.left = `${position[0] * rect.width}px`;
    myPin.style.top = `${position[1] * rect.height}px`;
    myPin.style.display = "";
  });

  // unload users
  const usersSnapshot = await getDocs(collection(db, "users"));
  getDocument("users", thisUser.uid, (data) => {
    if (!data) return;
    const programMatters = (prog) => prog !== "Other...";
    const myProgram = data.get("program")[0];
    const myProgramMatters = programMatters(myProgram);

    const users = usersSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((user) => {
        // only show initialized profiles of the same program
        const programMatches =
          myProgramMatters && programMatters(user.program[0])
            ? myProgram === user.program[0]
            : true;
        return (
          user.id !== thisUser.uid && user.hasInitProfile && programMatches
        );
      });

    for (const user of users) {
      const pfp = user.pfp.endsWith(".svg")
        ? user.pfp
        : "data:image/png;base64," + user.pfp;
      const pin = createPin(pfp, user.userName, false, pinDiv);

      const position = user.location;
      pin.style.left = `${position[0] * rect.width}px`;
      pin.style.top = `${position[1] * rect.height}px`;
      pinDiv.parentNode.appendChild(pin);
    }
  });

  // unload meetups
  return;
  const meetsSnapshot = await getDocs(collection(db, "meetups"));
  const meets = meetsSnapshot.docs.map((doc) => ({
    ...doc.data(),
  }));

  for (const meet of meets) {
    console.log(meet);
    const pin = createPin("", meet.userName, true, pinDiv);

    const position = meet.location;
    pin.style.left = `${position[0] * rect.width}px`;
    pin.style.top = `${position[1] * rect.height}px`;
    pinDiv.parentNode.appendChild(pin);
  }
}

/* Main Initialization */
function initAll() {
  const mapDiv = document.querySelector(".map-display").firstElementChild;
  const mapDragger = document.querySelector(".map-dragger");

  /* 🖱️ Map Dragger */
  mapDragger.addEventListener("mousedown", (e) => {
    e.stopPropagation();

    const downTime = Date.now();
    const startX = e.clientX;
    const startY = e.clientY;
    const mapPos = getMapPosition(mapDiv);
    const bounds = getMapBounds(mapDiv);

    const mouseMoveEvent = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      mapDiv.style.left =
        clamp(bounds.left, bounds.right, mapPos[0] + dx) + "px";
      mapDiv.style.top =
        clamp(bounds.top, bounds.bottom, mapPos[1] + dy) + "px";
    };

    const mouseUpEvent = (e) => {
      e.stopPropagation();
      mapDragger.removeEventListener("mouseup", mouseUpEvent);
      mapDragger.removeEventListener("mousemove", mouseMoveEvent);

      if (Date.now() - downTime < 200) {
        // likely a click event instead of drag
        Events.emit("MAP_CLICK", e);
      }
    };

    mapDragger.addEventListener("mouseup", mouseUpEvent);
    mapDragger.addEventListener("mousemove", mouseMoveEvent);
  });

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
    storage.map.zoom = newZoom;
    updateLocalStore();
  });

  /* 📍 Location Updater */
  const updateLocBtn = document.querySelector(".update-location button");
  updateLocBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.id === "update") {
      e.target.textContent = "Save My Location";
      e.target.id = "set";
      handleSetPin(mapDiv);
    } else {
      e.target.textContent = "Update My Location";
      e.target.id = "update";
      handleUpdatePin();
    }
  });

  myPin = createPin("../images/default-avatar.svg", "You", false, mapDiv);
  myPin.id = "me";
  myPin.style.display = "none";
}

document.addEventListener("DOMContentLoaded", initAll);
