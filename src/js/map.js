import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/* utilities for this site */
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

  // let the padding be (3 - zoom) * 50
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

function initAll() {
  /*
    Map Dragger Code
  */
  const mapDiv = document.querySelector(".map-display").firstElementChild;
  const mapDragger = document.querySelector(".map-dragger");
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

      // remove listeners
      mapDragger.removeEventListener("mouseup", mouseUpEvent);
      mapDragger.removeEventListener("mousemove", mouseMoveEvent);
    };

    mapDragger.addEventListener("mouseup", mouseUpEvent);
    mapDragger.addEventListener("mousemove", mouseMoveEvent);
  });

  /*
    Zoom Controls
    TODO save zoom to account or localStorage
  */
  const zoomDiv = document.querySelector(".zoom-controls");
  zoomDiv.addEventListener("click", (e) => {
    e.stopPropagation();

    const button = e.target.closest("button");
    if (!button) return;

    const mapPos = getMapPosition(mapDiv);
    let currentZoom = getZoom();
    let newZoom;

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

  /*
    Location Updater
    TODO
  */

  const db = getFirestore();
  const auth = getAuth();
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
        console.log("User location:", latitude, longitude);

        // --- TODO #1: Define campus GPS boundaries ---
        //Example:
        // const campusBounds = {
        //   latMin: 49.249,
        //   latMax: 49.2525,
        //   lonMin: -123.002,
        //   lonMax: -122.9955,
        // };

        // --- TODO #2: Convert GPS -> map coordinates ---
        const xPercent =
          ((longitude - campusBounds.lonMin) /
            (campusBounds.lonMax - campusBounds.lonMin)) *
          100;
        const yPercent =
          (1 -
            (latitude - campusBounds.latMin) /
              (campusBounds.latMax - campusBounds.latMin)) *
          100;

        // --- TODO #3: Display visible marker on map ---
        let marker = document.getElementById("user-marker");
        if (!marker) {
          marker = document.createElement("div");
          marker.id = "user-marker";
          marker.style.position = "absolute";
          marker.style.width = "20px";
          marker.style.height = "20px";
          marker.style.background = "red";
          marker.style.border = "2px solid white";
          marker.style.borderRadius = "50%";
          marker.style.transform = "translate(-50%, -50%)";
          marker.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
          document.querySelector(".map-display div").appendChild(marker);
        }

        marker.style.left = `${xPercent}%`;
        marker.style.top = `${yPercent}%`;
        marker.style.display = "block";

        // --- TODO #4: Save location to Firestore ---
      },

      (err) => {
        alert("Unable to get your location: " + err.message);
      }
    );
  });

  const updateLocBtn = document.querySelector(".update-location button");
  updateLocBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // TODO
  });
}

document.addEventListener("DOMContentLoaded", initAll);
