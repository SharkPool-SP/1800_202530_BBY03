import {
  auth,
  db,
  checkSignedIn,
  getDocument,
  setDocument,
  onAuthStateChanged,
} from "./FireStoreUtil.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  query,
  getDocs,
  where,
} from "firebase/firestore";
import { applyTheme } from "./ThemeUnpack.js";
import { getThemes } from "./Themes.js";

let currentUser = null;
const themes = getThemes();

// Initialize authentication
checkSignedIn();

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadUserTheme(user.uid);
    loadAvailableMeetups();
  }
});

// Load and apply user's theme
function loadUserTheme(userId) {
  getDocument("users", userId, (data) => {
    const themeID = data.get("themeID") || "purple";
    const theme = themes.find((t) => t.id === themeID);
    if (theme) {
      applyTheme(theme);
    }
  });
}

// Load available meetups created by other users
async function loadAvailableMeetups() {
  if (!currentUser) return;

  try {
    const meetupsRef = collection(db, "meetups");
    const meetupsSnapshot = await getDocs(meetupsRef);
    
    const availableContainer = document.getElementById("available-meetups");
    const emptyState = document.getElementById("empty-browse");
    availableContainer.innerHTML = "";

    // Get current user's joined meetups
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDoc.data();
    const joinedMeets = userData.joinedmeets || [];

    let hasAvailableMeetups = false;

    meetupsSnapshot.forEach((meetupDoc) => {
      const meetupData = meetupDoc.data();
      const meetupId = meetupDoc.id;
      
      // Check if meetup is:
      // 1. Not created by current user
      // 2. Not already joined by current user
      // 3. Still has space available (if max attendees is set)
      // 4. Is in the future
      const isNotCreator = !meetupData.attendees || meetupData.attendees[0] !== currentUser.uid;
      const notJoined = !joinedMeets.includes(meetupId);
      const hasSpace = !meetupData.maxAttendees || meetupData.members < meetupData.maxAttendees;
      const isFuture = new Date(meetupData.start) > new Date();
      
      if (isNotCreator && notJoined && hasSpace && isFuture) {
        hasAvailableMeetups = true;
        const meetupCard = createMeetupCard(meetupId, meetupData);
        availableContainer.appendChild(meetupCard);
      }
    });

    emptyState.style.display = hasAvailableMeetups ? "none" : "block";
  } catch (error) {
    console.error("Error loading available meetups:", error);
  }
}

// Create a meetup card for browsing
function createMeetupCard(meetupId, data) {
  const card = document.createElement("div");
  card.className = "join-card";
  card.dataset.meetupId = meetupId;

  const dateTime = new Date(data.start);
  const formattedDate = formatDateTime(dateTime);

  const maxAttendeesDisplay = data.maxAttendees ? `${data.members}/${data.maxAttendees}` : `${data.members}`;

  card.innerHTML = `
    <div class="join-info">
      <h3>${escapeHtml(data.title)}</h3>
      <p><img src="images/location-pin.svg" class="icon" /> ${escapeHtml(data.location)}</p>
      <p><img src="images/clock.svg" class="icon" /> ${formattedDate}</p>
      <p><img src="images/people.svg" class="icon" /> ${maxAttendeesDisplay} participants</p>
      ${data.details ? `<p style="margin-top: 8px; opacity: 0.9;">${escapeHtml(data.details)}</p>` : ""}
      ${data.owner ? `<p style="font-size: 0.85em; opacity: 0.8; margin-top: 5px;">Organized by ${escapeHtml(data.owner)}</p>` : ""}
    </div>
    <button class="join-btn" data-meetup-id="${meetupId}">Join</button>
  `;

  const joinBtn = card.querySelector(".join-btn");
  joinBtn.addEventListener("click", () => handleJoinMeetup(meetupId, data));

  return card;
}

// Handle joining a meetup
async function handleJoinMeetup(meetupId, meetupData) {
  if (!currentUser) {
    alert("You must be logged in to join a meetup!");
    return;
  }

  try {
    // Check if meetup is full
    if (meetupData.maxAttendees && meetupData.members >= meetupData.maxAttendees) {
      alert("Sorry, this meetup is full!");
      return;
    }

    const meetupRef = doc(db, "meetups", meetupId);
    const userRef = doc(db, "users", currentUser.uid);

    // Add user to meetup
    await updateDoc(meetupRef, {
      attendees: arrayUnion(currentUser.uid),
      members: meetupData.members + 1,
    });

    // Add meetup to user's joined meetups
    await updateDoc(userRef, {
      joinedmeets: arrayUnion(meetupId),
    });

    alert("Successfully joined the meetup!");
    
    // Reload available meetups
    await loadAvailableMeetups();
  } catch (error) {
    console.error("Error joining meetup:", error);
    alert("Failed to join meetup. Please try again.");
  }
}

// Format date time for display
function formatDateTime(date) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Handle form submission for creating a meetup
const createMeetupForm = document.getElementById("create-meetup-form");
createMeetupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    alert("You must be logged in to create a meetup!");
    return;
  }

  // Get form values
  const title = document.getElementById("meetup-name").value.trim();
  const location = document.getElementById("meetup-location").value.trim();
  const dateTime = document.getElementById("meetup-date").value;
  const details = document.getElementById("meetup-description").value.trim();
  const maxAttendees = parseInt(
    document.getElementById("meetup-max-attendees").value
  );

  // Validate inputs
  if (!title || !location || !dateTime) {
    alert("Please fill in all required fields!");
    return;
  }

  // Check if date is in the future
  const selectedDate = new Date(dateTime);
  if (selectedDate <= new Date()) {
    alert("Please select a future date and time!");
    return;
  }

  try {
    // Get current user's name
    let ownerName = "Anonymous";
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      ownerName = userDoc.data().userName || "Anonymous";
    }

    // Create meetup document in Firebase matching your schema
    const meetupData = {
      title: title,
      location: location,
      start: dateTime,
      end: "", // You can add an end time field if needed
      details: details || "",
      members: 0, // Start at 0, will be incremented when creator joins
      owner: ownerName,
      attendees: [currentUser.uid],
    };

    // Add meetup to 'meetups' collection
    const meetupRef = await addDoc(collection(db, "meetups"), meetupData);

    // Update the members count to 1 after creation
    await updateDoc(doc(db, "meetups", meetupRef.id), {
      members: 1,
    });

    // Update user's mymeets array (meetups they created)
    await updateDoc(doc(db, "users", currentUser.uid), {
      mymeets: arrayUnion(meetupRef.id),
      joinedmeets: arrayUnion(meetupRef.id),
    });

    alert("Meetup created successfully!");
    
    // Reset form
    createMeetupForm.reset();
    
    // Redirect to meetup list page
    window.location.href = "meetup-list.html";
  } catch (error) {
    console.error("Error creating meetup:", error);
    alert("Failed to create meetup. Please try again.");
  }
});

// Handle cancel button
const cancelBtn = createMeetupForm.querySelector('button[type="reset"]');
cancelBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (confirm("Are you sure you want to cancel? All entered data will be lost.")) {
    createMeetupForm.reset();
  }
});

// Load a random meetup to join (you can modify this to show specific meetups)
async function loadMeetupToJoin() {
  // This is a placeholder - you'll need to implement proper meetup browsing
  // For now, it just shows the static HTML content
  const joinBtn = document.querySelector(".join-btn");
  
  if (joinBtn) {
    joinBtn.addEventListener("click", async () => {
      alert("Join meetup functionality - implement meetup browsing to enable this feature");
    });
  }
}

// Back button functionality
const backBtn = document.querySelector(".back-btn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "meetup-list.html";
  });
}