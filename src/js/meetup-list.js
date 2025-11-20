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
import { applyTheme } from "./ThemeUnpack.js";
import { getThemes } from "./Themes.js";

let currentUser = null;
const themes = getThemes();

// Initialize authentication
checkSignedIn();

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadUserMeetups();
    loadUserTheme(user.uid);
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

// Load all meetups for the current user
async function loadUserMeetups() {
  if (!currentUser) return;

  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const myMeets = userData.mymeets || [];
    const joinedMeets = userData.joinedmeets || [];

    // Load created meetups
    await loadMeetups(myMeets, "meetups-created", true);

    // Load joined meetups (excluding ones the user created)
    const joinedOnly = joinedMeets.filter((id) => !myMeets.includes(id));
    await loadMeetups(joinedOnly, "meetups-joined", false);

    updateEmptyStates();
  } catch (error) {
    console.error("Error loading meetups:", error);
  }
}

// Load meetups into specified container
async function loadMeetups(meetupIds, containerId, isCreator) {
  const container = document.getElementById(containerId);
  container.innerHTML = ""; // Clear existing content

  if (meetupIds.length === 0) {
    updateEmptyStates();
    return;
  }

  for (const meetupId of meetupIds) {
    try {
      const meetupDoc = await getDoc(doc(db, "meetups", meetupId));
      if (meetupDoc.exists()) {
        const meetupData = meetupDoc.data();
        const meetupElement = createMeetupElement(
          meetupId,
          meetupData,
          isCreator
        );
        container.appendChild(meetupElement);
      }
    } catch (error) {
      console.error(`Error loading meetup ${meetupId}:`, error);
    }
  }

  updateEmptyStates();
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
      ${data.details ? `<p><strong>Description:</strong> ${escapeHtml(data.details)}</p>` : ""}
      ${data.owner ? `<p><strong>Organizer:</strong> ${escapeHtml(data.owner)}</p>` : ""}
    </div>
    <div class="meetup-actions">
      <button class="btn btn-secondary leave-btn">Leave</button>
      ${isCreator ? '<button class="btn btn-danger delete-btn">Delete</button>' : ""}
    </div>
  `;

  // Add event listeners
  const leaveBtn = div.querySelector(".leave-btn");
  leaveBtn.addEventListener("click", () => handleLeaveMeetup(meetupId, data));

  if (isCreator) {
    const deleteBtn = div.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => handleDeleteMeetup(meetupId));
  }

  return div;
}

// Handle leaving a meetup
async function handleLeaveMeetup(meetupId, meetupData) {
  if (!confirm("Are you sure you want to leave this meetup?")) return;

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
        alert(
          "You cannot leave a meetup you created while others are still joined. Please delete it instead or wait for others to leave."
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
    alert("Failed to leave meetup. Please try again.");
  }
}

// Handle deleting a meetup
async function handleDeleteMeetup(meetupId) {
  if (
    !confirm(
      "Are you sure you want to delete this meetup? This action cannot be undone."
    )
  )
    return;

  try {
    const meetupRef = doc(db, "meetups", meetupId);
    const meetupDoc = await getDoc(meetupRef);

    if (!meetupDoc.exists()) {
      alert("Meetup not found!");
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
    alert("Failed to delete meetup. Please try again.");
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

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  updateEmptyStates();
});