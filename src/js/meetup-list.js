import {
  auth,
  db,
  checkSignedIn,
  onAuthStateChanged,
  getDocument,
} from "./FireStoreUtil.js";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayRemove,
} from "firebase/firestore";

let currentUser = null;

// Initialize authentication
checkSignedIn();

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  Events.emit("AUTH_STATE_CHANGE", user);
  loadUserMeetups();
});

// Load all meetups for the current user
function loadUserMeetups() {
  if (!currentUser) return;

  try {
    getDocument("users", currentUser.uid, async (userDoc) => {
      if (!userDoc || !userDoc.exists()) return;

      const userData = userDoc.data();
      const myMeets = userData.mymeets || [];
      const joinedMeets = userData.joinedmeets || [];

      // Load created meetups
      await loadMeetups(myMeets, "meetups-created", true);

      // Load joined meetups (excluding ones the user created)
      const joinedOnly = joinedMeets.filter((id) => !myMeets.includes(id));
      await loadMeetups(joinedOnly, "meetups-joined", false);
    });
  } catch (error) {
    console.error("Error loading meetups:", error);
  }
}

// Load meetups into specified container
async function loadMeetups(meetupIds, containerId, isCreator) {
  const container = document.getElementById(containerId);
  container.innerHTML = ""; // Clear existing content

  for (const meetupId of meetupIds) {
    try {
      getDocument("meetups", meetupId, async (meetupDoc) => {
        if (meetupDoc && meetupDoc.exists()) {
          const meetupData = meetupDoc.data();
          const meetupElement = createMeetupElement(
            meetupId,
            meetupData,
            isCreator
          );
          container.appendChild(meetupElement);
          updateEmptyStates();
        }
      });
    } catch (error) {
      console.error(`Error loading meetup ${meetupId}:`, error);
    }
  }
}

// Create a meetup item element
function createMeetupElement(meetupId, data, isCreator) {
  const div = document.createElement("div");
  div.className = "meetup-item";
  div.dataset.meetupId = meetupId;

  const dateTime = new Date(data.start);
  const formattedDate = formatDateTime(dateTime);

  // Calculate max attendees (if not set, show just current members)
  const maxAttendeesDisplay = data.maxAttendees ? `/${data.maxAttendees}` : "";

  div.innerHTML = `
    <div class="meetup-info">
      <h3>${escapeHtml(data.title)}</h3>
      <p><strong>Location:</strong> ${escapeHtml(data.location)}</p>
      <p><strong>Time:</strong> ${formattedDate}</p>
      <p><strong>Attendees:</strong> ${data.members}${maxAttendeesDisplay}</p>
      ${
        data.details
          ? `<p><strong>Description:</strong> ${escapeHtml(data.details)}</p>`
          : ""
      }
      ${
        data.owner
          ? `<p><strong>Organizer:</strong> ${escapeHtml(data.owner)}</p>`
          : ""
      }
    </div>
    <div class="meetup-actions">
      ${
        isCreator
          ? `<button class="btn btn-secondary delete-btn">Delete</button>`
          : `<button class="btn btn-secondary leave-btn">Leave</button>`
      }
    </div>
  `;

  // Add event listeners
  if (isCreator) {
    const deleteBtn = div.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => handleDeleteMeetup(meetupId));
  } else {
    const leaveBtn = div.querySelector(".leave-btn");
    leaveBtn.addEventListener("click", () => handleLeaveMeetup(meetupId, data));
  }

  return div;
}

// Handle leaving a meetup
async function handleLeaveMeetup(meetupId, meetupData) {
  if (
    !(await showClustrModal(
      "Hold On!",
      "<p>Are you sure you want to leave this meetup?</p>",
      true
    ))
  ) {
    return;
  }

  try {
    const meetupRef = doc(db, "meetups", meetupId);
    const userRef = doc(db, "users", currentUser.uid);

    // Get current user data to check if they're the creator
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    const isCreator = userData.mymeets && userData.mymeets.includes(meetupId);

    if (isCreator) {
      // If creator leaves, check if there are other members
      if (meetupData.members > 1) {
        showClustrModal(
          "You Cant Leave!",
          "<p>You cannot leave a meetup you created while others are still joined.<br>Please delete it instead or wait for others to leave.</p>"
        );
        return;
      }
      // If no other members, allow leaving (which effectively deletes it)
      await deleteDoc(meetupRef);
      await updateDoc(userRef, {
        mymeets: arrayRemove(meetupId),
        joinedmeets: arrayRemove(meetupId),
      });
    } else {
      // Regular member leaving
      const newMemberCount = Math.max(0, meetupData.members - 1);

      await updateDoc(meetupRef, {
        attendees: arrayRemove(currentUser.uid),
        members: newMemberCount,
      });

      await updateDoc(userRef, {
        joinedmeets: arrayRemove(meetupId),
      });
    }

    // Reload meetups
    await loadUserMeetups();
  } catch (error) {
    console.error("Error leaving meetup:", error);
    showClustrModal(
      "You Cant Leave!",
      "<p>Failed to leave meetup. Please try again.</p>"
    );
  }
}

// Handle deleting a meetup
async function handleDeleteMeetup(meetupId) {
  if (
    !(await showClustrModal(
      "Hold On!",
      "<p>Are you sure you want to delete this meetup? This action cannot be undone.</p>",
      true
    ))
  ) {
    return;
  }

  try {
    const meetupRef = doc(db, "meetups", meetupId);
    const meetupDoc = await getDoc(meetupRef);

    if (!meetupDoc.exists()) {
      showClustrModal("Not Found", "<p>Requested Meetup does not exist!</p>");
      return;
    }

    const meetupData = meetupDoc.data();

    // Remove meetup from all attendees' joinedmeets
    if (meetupData.attendees && Array.isArray(meetupData.attendees)) {
      for (const attendeeId of meetupData.attendees) {
        try {
          const attendeeRef = doc(db, "users", attendeeId);
          const attendeeDoc = await getDoc(attendeeRef);

          if (attendeeDoc.exists()) {
            await updateDoc(attendeeRef, {
              joinedmeets: arrayRemove(meetupId),
            });

            // Remove from mymeets if they're the creator
            if (attendeeId === currentUser.uid) {
              await updateDoc(attendeeRef, {
                mymeets: arrayRemove(meetupId),
              });
            }
          }
        } catch (error) {
          console.error(`Error updating user ${attendeeId}:`, error);
        }
      }
    }

    // Delete the meetup document
    await deleteDoc(meetupRef);

    // Reload meetups
    await loadUserMeetups();
  } catch (error) {
    console.error("Error deleting meetup:", error);
    showClustrModal(
      "Deletion Failed",
      "<p>Failed to delete meetup. Please try again.</p>"
    );
  }
}

// Check if meetup lists are empty and show appropriate messages
function updateEmptyStates() {
  const createdList = document.getElementById("meetups-created");
  const joinedList = document.getElementById("meetups-joined");
  const emptyCreated = document.getElementById("empty-created");
  const emptyJoined = document.getElementById("empty-joined");

  emptyCreated.style.display =
    createdList.children.length === 0 ? "block" : "none";
  emptyJoined.style.display =
    joinedList.children.length === 0 ? "block" : "none";
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
    return `Today, ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow, ${timeStr}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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

// Back button functionality
const backBtn = document.querySelector(".back-btn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "map.html";
  });
}
