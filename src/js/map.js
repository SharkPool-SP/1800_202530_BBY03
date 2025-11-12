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

/* Main Initialization */
function initAll() {
  const mapDiv = document.querySelector(".map-display").firstElementChild;
  const mapDragger = document.querySelector(".map-dragger");

  /* 🖱️ Map Dragger */
  mapDragger.addEventListener("mousedown", (e) => {
    e.stopPropagation();

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
  });

  /* 📍 Location Updater */
  // const db = getFirestore();
  // const auth = getAuth();
  const updateLocBtn = document.querySelector(".update-location button");

  updateLocBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log("📍 User GPS location:", latitude, longitude);

        // Define campus GPS boundaries (recalibrated)
        const campusBounds = {
          latMin: 49.249, // South edge
          latMax: 49.253, // North edge
          lonMin: -123.0135, // West edge (NW1)
          lonMax: -123.1005, // East edge (SE40 area)
        };

        // Convert GPS to map %
        const xPercent =
          ((longitude - campusBounds.lonMin) /
            (campusBounds.lonMax - campusBounds.lonMin)) *
          100;
        const yPercent =
          (1 -
            (latitude - campusBounds.latMin) /
              (campusBounds.latMax - campusBounds.latMin)) *
          100;

        console.log("📊 Calculated percentages (before clamp):");
        console.log("  X:", xPercent.toFixed(2) + "%");
        console.log("  Y:", yPercent.toFixed(2) + "%");

        // Check if within bounds
        const isInBounds =
          latitude >= campusBounds.latMin &&
          latitude <= campusBounds.latMax &&
          longitude >= campusBounds.lonMin &&
          longitude <= campusBounds.lonMax;

        console.log("✅ Within BCIT campus bounds:", isInBounds);

        if (!isInBounds) {
          console.warn("⚠️ You are not currently at BCIT campus!");
          console.log("Distance from campus center:");
          const centerLat = (campusBounds.latMin + campusBounds.latMax) / 2;
          const centerLon = (campusBounds.lonMin + campusBounds.lonMax) / 2;
          const latDiff = Math.abs(latitude - centerLat);
          const lonDiff = Math.abs(longitude - centerLon);
          console.log(`  Lat diff: ${(latDiff * 111).toFixed(2)} km`);
          console.log(`  Lon diff: ${(lonDiff * 85).toFixed(2)} km`);
        }

        const clampPercent = (val) => Math.min(100, Math.max(0, val));

        // Get or create user marker
        let marker = document.getElementById("user-marker");
        if (!marker) {
          marker = document.createElement("div");
          marker.id = "user-marker";
          mapDiv.appendChild(marker);
        }

        // Apply consistent styling with higher z-index and pointer-events
        Object.assign(marker.style, {
          position: "absolute",
          width: "20px",
          height: "20px",
          background: "red",
          border: "2px solid white",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)",
          zIndex: "9999",
          display: "block",
          pointerEvents: "none",
          left: `${clampPercent(xPercent)}%`,
          top: `${clampPercent(yPercent)}%`,
        });

        console.log(
          "✨ Marker placed at:",
          clampPercent(xPercent).toFixed(2) +
            "%, " +
            clampPercent(yPercent).toFixed(2) +
            "%"
        );

        // TODO: Save location to Firestore
        /*
        const user = auth.currentUser;
        if (user) {
          await setDoc(doc(db, "userLocations", user.uid), {
            latitude,
            longitude,
            updatedAt: new Date(),
          });
        }
        */
      },
      (err) => {
        alert("Unable to get your location: " + err.message);
      }
    );
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAll();
});
