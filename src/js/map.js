import {
  auth,
  checkSignedIn,
  getDocument,
  setDocument,
  onAuthStateChanged,
} from "./FireStoreUtil.js";

/* Firebase Events */
checkSignedIn();

let userId, myPin;

onAuthStateChanged(auth, (user) => {
  userId = user.uid;
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

    myPin.style.left = `${localX}px`;
    myPin.style.top = `${localY}px`;
  });
}

function handleUpdatePin() {
  Events.off("MAP_CLICK");

  setDocument("users", userId, {
    location: [parseFloat(myPin.style.left), parseFloat(myPin.style.top)],
  });
}

function unloadPins() {
  Events.once("PROFILE_PIC_FOUND", (userData) => {
    const pfp = userData.get("pfp");
    if (pfp && !pfp.endsWith(".svg")) {
      myPin.querySelector("img").src = "data:image/png;base64," + pfp;
    }

    const position = userData.get("location");
    myPin.style.left = `${position[0]}px`;
    myPin.style.top = `${position[1]}px`;
    myPin.style.display = "";
  });

  // TODO load all pins of meetups and people
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

  myPin = createPin("../images/default-avatar.svg", mapDiv);
  myPin.id = "me";
  myPin.style.display = "none";
}

document.addEventListener("DOMContentLoaded", initAll);
