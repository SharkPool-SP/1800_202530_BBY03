import {
  auth,
  db,
  checkSignedIn,
  onAuthStateChanged,
} from "./FireStoreUtil.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  getDocs,
} from "firebase/firestore";

let currentUser = null;

// Initialize authentication
checkSignedIn();

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  loadAvailableMeetups();
  Events.emit("AUTH_STATE_CHANGE", user);
});

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
      const isNotCreator =
        !meetupData.attendees || meetupData.attendees[0] !== currentUser.uid;
      const notJoined = !joinedMeets.includes(meetupId);
      const hasSpace =
        meetupData.maxAttendees === -1 ||
        meetupData.members < meetupData.maxAttendees;
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

  const maxAttendeesDisplay = data.maxAttendees
    ? `${data.members} / ${
        data.maxAttendees === -1 ? "Unlimited" : data.maxAttendees
      }`
    : `${data.members}`;

  card.innerHTML = `
    <div class="join-info">
      <h3>${escapeHtml(data.title)}</h3>
      <p><img src="images/location-pin.svg" class="icon" /> ${escapeHtml(
        data.location
      )}</p>
      <p><img src="images/clock.svg" class="icon" /> ${formattedDate}</p>
      <p><img src="images/icon-friends.svg" class="icon" /> ${maxAttendeesDisplay} participant${
    Number(data.members) > 1 ? "s" : ""
  }</p>
      ${
        data.details
          ? `<p style="margin-top: 8px; opacity: 0.9;">${escapeHtml(
              data.details
            )}</p>`
          : ""
      }
      ${
        data.owner
          ? `<p style="font-size: 0.85em; opacity: 0.8; margin-top: 5px;">Organized by ${escapeHtml(
              data.owner
            )}</p>`
          : ""
      }
    </div>
    <button class="join-btn" data-meetup-id="${meetupId}">Join</button>
  `;

  const joinBtn = card.querySelector(".join-btn");
  joinBtn.addEventListener("click", () => handleJoinMeetup(meetupId, data));

  return card;
}

// Handle joining a meetup
async function handleJoinMeetup(meetupId, meetupData) {
  try {
    // Check if meetup is full
    if (
      meetupData.maxAttendees !== -1 &&
      meetupData.members >= meetupData.maxAttendees
    ) {
      showClustrModal("Meetup Full", "<p>Sorry, this meetup is full!</p>");
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

    showClustrModal("Meetup Joined", "<p>Successfully joined the meetup!</p>");

    // Reload available meetups
    await loadAvailableMeetups();
  } catch (error) {
    console.error("Error joining meetup:", error);
    showClustrModal(
      "Join Failed",
      "<p>Failed to join meetup. Please try again.</p>"
    );
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
    showClustrModal("Warning", "<p>Please fill in all required* fields!</p>");
    return;
  }

  // Check if date is in the future
  const selectedDate = new Date(dateTime);
  if (selectedDate <= new Date()) {
    showClustrModal("Warning", "<p>Please select a future date and time!</p>");
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
      title: title.substring(0, 31), // 30 is a reasonable title length
      location: location,
      start: dateTime,
      maxAttendees: isNaN(maxAttendees)
        ? -1
        : Math.min(Math.max(maxAttendees, 1), 50), // 1-50 is a reasonable attendee list
      end: "", // You can add an end time field if needed
      details: details.substring(0, 201) || "", // 200 is a reasonable detail length
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

    // Reset form
    createMeetupForm.reset();

    // Redirect to meetup list page
    window.location.href = "meetup-list.html";
  } catch (error) {
    console.error("Error creating meetup:", error);
    showClustrModal(
      "Fatal Error!",
      "<p>Failed to create meetup. Please try again.</p>"
    );
  }
});

// Handle cancel button
const cancelBtn = createMeetupForm.querySelector('button[type="reset"]');
cancelBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  if (
    await showClustrModal(
      "Hold On!",
      "<p>Are you sure you want to reset the form? All entered data will be lost!</p>",
      true
    )
  ) {
    createMeetupForm.reset();
  }
});

// Back button functionality
const backBtn = document.querySelector(".back-btn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "meetup-list.html";
  });
}
