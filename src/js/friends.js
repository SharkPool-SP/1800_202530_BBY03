import {
  auth,
  db,
  checkSignedIn,
  getDocument,
  setDocument,
  onAuthStateChanged,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "./FireStoreUtil.js";

/* Firebase Events */
checkSignedIn();

let currentUser = null;
let currentUserData = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  initFriendsPage();
  Events.emit("AUTH_STATE_CHANGE", user);
});

/* Tab Management */
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");

      // Update active states
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`${tabName}-tab`).classList.add("active");

      // Load content based on tab
      if (tabName === "friends") {
        loadFriends();
      } else if (tabName === "requests") {
        loadRequests();
      }
    });
  });
}

/* Initialize Friends Page */
async function initFriendsPage() {
  initTabs();
  initSearch();
  await loadUserData();
  loadFriends();
  loadRequests();
}

/* Load Current User Data */
async function loadUserData() {
  return new Promise((resolve) => {
    getDocument("users", currentUser.uid, async (snapshot) => {
      if (snapshot.exists()) {
        currentUserData = snapshot.data();

        // Initialize friends array if it doesn't exist
        if (!currentUserData.friends) {
          await setDocument("users", currentUser.uid, { friends: [] });
          currentUserData.friends = [];
        }
      }
      resolve();
    });
  });
}

/* Load Friends List */
async function loadFriends() {
  const friendsList = document.querySelector(".friends-list");
  const emptyState = document.querySelector("#friends-tab .empty-state");
  const friendCount = document.querySelector(".friend-count");

  friendsList.innerHTML = '<div class="loading">Loading friends...</div>';
  emptyState.style.display = "none";

  try {
    await loadUserData();

    if (!currentUserData.friends || currentUserData.friends.length === 0) {
      friendsList.innerHTML = "";
      emptyState.style.display = "block";
      friendCount.textContent = "0";
      friendCount.setAttribute("empty", "true");
      return;
    }

    friendsList.innerHTML = "";
    friendCount.textContent = currentUserData.friends.length;
    friendCount.setAttribute("empty", currentUserData.friends.length === 0);

    // Load each friend's data
    for (const friendId of currentUserData.friends) {
      const friendDoc = await getDoc(doc(db, "users", friendId));
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        const friendCard = createFriendCard(friendId, friendData);
        friendsList.appendChild(friendCard);
      }
    }
  } catch (error) {
    console.error("Error loading friends:", error);
    friendsList.innerHTML =
      '<div class="loading">Error loading friends. Please refresh.</div>';
  }
}

/* Create Friend Card */
function createFriendCard(friendId, friendData) {
  const card = document.createElement("div");
  card.className = "friend-card";

  const avatar = document.createElement("img");
  avatar.className = "friend-avatar";
  avatar.src = friendData.pfp.endsWith(".svg")
    ? friendData.pfp
    : "data:image/png;base64," + friendData.pfp;
  avatar.alt = friendData.userName || "Friend";

  const info = document.createElement("div");
  info.className = "friend-info";

  const name = document.createElement("h3");
  name.className = "friend-name";
  name.textContent = friendData.userName || "Unknown User";

  const program = document.createElement("p");
  program.className = "friend-program";
  program.textContent = friendData.program
    ? `${friendData.program[0]} - ${friendData.program[1]}`
    : "No program set";

  info.appendChild(name);
  info.appendChild(program);

  const actions = document.createElement("div");
  actions.className = "friend-actions";

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn btn-danger";
  removeBtn.textContent = "Remove";
  removeBtn.onclick = () => removeFriend(friendId);

  actions.appendChild(removeBtn);

  card.appendChild(avatar);
  card.appendChild(info);
  card.appendChild(actions);

  return card;
}

/* Remove Friend */
async function removeFriend(friendId) {
  if (
    !(await showClustrModal(
      "Hold On!",
      "<p>Are you sure you want to remove this friend?</p>",
      true
    ))
  ) {
    return;
  }

  try {
    // Remove from current user's friends
    await updateDoc(doc(db, "users", currentUser.uid), {
      friends: arrayRemove(friendId),
    });

    // Remove from friend's friends list
    await updateDoc(doc(db, "users", friendId), {
      friends: arrayRemove(currentUser.uid),
    });

    loadFriends();
    showClustrModal("Success!", "<p>Friend removed successfully!</p>");
  } catch (error) {
    console.error("Error removing friend:", error);
    showClustrModal(
      "Errpr!",
      "<p>Failed to remove friend. Please try again.</p>"
    );
  }
}

/* Load Friend Requests */
async function loadRequests() {
  const incomingDiv = document.querySelector(".incoming-requests");
  const sentDiv = document.querySelector(".sent-requests");
  const incomingEmpty = document.querySelector(
    ".requests-section:nth-child(1) .empty-state"
  );
  const sentEmpty = document.querySelector(
    ".requests-section:nth-child(2) .empty-state"
  );
  const requestCount = document.querySelector(".request-count");

  incomingDiv.innerHTML = '<div class="loading">Loading requests...</div>';
  sentDiv.innerHTML = '<div class="loading">Loading requests...</div>';

  try {
    // Load incoming requests
    const incomingQuery = query(
      collection(db, "friendRequests"),
      where("to", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    const incomingSnapshot = await getDocs(incomingQuery);

    incomingDiv.innerHTML = "";
    if (incomingSnapshot.empty) {
      incomingEmpty.style.display = "block";
      requestCount.textContent = "0";
      requestCount.setAttribute("empty", "true");
    } else {
      incomingEmpty.style.display = "none";
      requestCount.textContent = incomingSnapshot.size;
      requestCount.setAttribute("empty", incomingSnapshot.size === 0);

      for (const requestDoc of incomingSnapshot.docs) {
        const requestData = requestDoc.data();
        const senderDoc = await getDoc(doc(db, "users", requestData.from));
        if (senderDoc.exists()) {
          const card = createRequestCard(
            requestDoc.id,
            requestData.from,
            senderDoc.data(),
            "incoming"
          );
          incomingDiv.appendChild(card);
        }
      }
    }

    // Load sent requests
    const sentQuery = query(
      collection(db, "friendRequests"),
      where("from", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    const sentSnapshot = await getDocs(sentQuery);

    sentDiv.innerHTML = "";
    if (sentSnapshot.empty) {
      sentEmpty.style.display = "block";
    } else {
      sentEmpty.style.display = "none";

      for (const requestDoc of sentSnapshot.docs) {
        const requestData = requestDoc.data();
        const receiverDoc = await getDoc(doc(db, "users", requestData.to));
        if (receiverDoc.exists()) {
          const card = createRequestCard(
            requestDoc.id,
            requestData.to,
            receiverDoc.data(),
            "sent"
          );
          sentDiv.appendChild(card);
        }
      }
    }
  } catch (error) {
    console.error("Error loading requests:", error);
    incomingDiv.innerHTML =
      '<div class="loading">Error loading requests.</div>';
    sentDiv.innerHTML = '<div class="loading">Error loading requests.</div>';
  }
}

/* Create Request Card */
function createRequestCard(requestId, userId, userData, type) {
  const card = document.createElement("div");
  card.className = "request-card";

  const avatar = document.createElement("img");
  avatar.className = "request-avatar";
  avatar.src = userData.pfp.endsWith(".svg")
    ? userData.pfp
    : "data:image/png;base64," + userData.pfp;
  avatar.alt = userData.userName || "User";

  const info = document.createElement("div");
  info.className = "request-info";

  const name = document.createElement("h3");
  name.className = "request-name";
  name.textContent = userData.userName || "Unknown User";

  const program = document.createElement("p");
  program.className = "request-program";
  program.textContent = userData.program
    ? `${userData.program[0]} - ${userData.program[1]}`
    : "No program set";

  info.appendChild(name);
  info.appendChild(program);

  const actions = document.createElement("div");
  actions.className = "request-actions";

  if (type === "incoming") {
    const acceptBtn = document.createElement("button");
    acceptBtn.className = "btn btn-success";
    acceptBtn.textContent = "Accept";
    acceptBtn.onclick = () => acceptRequest(requestId, userId);

    const declineBtn = document.createElement("button");
    declineBtn.className = "btn btn-danger";
    declineBtn.textContent = "Decline";
    declineBtn.onclick = () => declineRequest(requestId);

    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);
  } else {
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => cancelRequest(requestId);

    actions.appendChild(cancelBtn);
  }

  card.appendChild(avatar);
  card.appendChild(info);
  card.appendChild(actions);

  return card;
}

/* Accept Friend Request */
async function acceptRequest(requestId, senderId) {
  try {
    // Add to both users' friends lists
    await updateDoc(doc(db, "users", currentUser.uid), {
      friends: arrayUnion(senderId),
    });

    await updateDoc(doc(db, "users", senderId), {
      friends: arrayUnion(currentUser.uid),
    });

    // Delete the friend request
    await deleteDoc(doc(db, "friendRequests", requestId));

    loadRequests();
    loadFriends();
  } catch (error) {
    console.error("Error accepting request:", error);
    showClustrModal(
      "Error!",
      "<p>Failed to accept request. Please try again.</p>"
    );
  }
}

/* Decline Friend Request */
async function declineRequest(requestId) {
  try {
    await deleteDoc(doc(db, "friendRequests", requestId));
    loadRequests();
  } catch (error) {
    console.error("Error declining request:", error);
    showClustrModal(
      "Error!",
      "<p>Failed to decline request. Please try again.</p>"
    );
  }
}

/* Cancel Friend Request */
async function cancelRequest(requestId) {
  try {
    await deleteDoc(doc(db, "friendRequests", requestId));
    loadRequests();
    showClustrModal("Success!", "<p>Friend request cancelled.</p>");
  } catch (error) {
    console.error("Error cancelling request:", error);
    showClustrModal(
      "Error!",
      "<p>Failed to cancel request. Please try again.</p>"
    );
  }
}

/* Initialize Search */
function initSearch() {
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");

  const performSearch = () => {
    const query = searchInput.value.trim();
    if (query) {
      searchUsers(query);
    }
  };

  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });
}

/* Search Users */
async function searchUsers(searchQuery) {
  const resultsDiv = document.querySelector(".search-results");
  const emptyState = document.querySelector("#search-tab .empty-state");

  resultsDiv.innerHTML = '<div class="loading">Searching...</div>';
  emptyState.style.display = "none";

  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const results = [];

    usersSnapshot.forEach((doc) => {
      if (doc.id === currentUser.uid) return; // Skip current user

      const userData = doc.data();
      const userName = (userData.userName || "").toLowerCase();
      const email = (userData.email || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      if (userName.includes(query) || email.includes(query)) {
        results.push({ id: doc.id, data: userData });
      }
    });

    resultsDiv.innerHTML = "";

    if (results.length === 0) {
      resultsDiv.innerHTML =
        '<div class="loading">No users found matching your search.</div>';
      return;
    }

    for (const result of results) {
      const card = await createSearchCard(result.id, result.data);
      resultsDiv.appendChild(card);
    }
  } catch (error) {
    console.error("Error searching users:", error);
    resultsDiv.innerHTML =
      '<div class="loading">Error searching. Please try again.</div>';
  }
}

/* Create Search Card */
async function createSearchCard(userId, userData) {
  const card = document.createElement("div");
  card.className = "search-card";

  const avatar = document.createElement("img");
  avatar.className = "search-avatar";
  avatar.src = userData.pfp.endsWith(".svg")
    ? userData.pfp
    : "data:image/png;base64," + userData.pfp;
  avatar.alt = userData.userName || "User";

  const info = document.createElement("div");
  info.className = "search-info";

  const name = document.createElement("h3");
  name.className = "search-name";
  name.textContent = userData.userName || "Unknown User";

  const program = document.createElement("p");
  program.className = "search-program";
  program.textContent = userData.program
    ? `${userData.program[0]} - ${userData.program[1]}`
    : "No program set";

  info.appendChild(name);
  info.appendChild(program);

  const actions = document.createElement("div");
  actions.className = "search-actions";

  // Check relationship status
  const status = await getRelationshipStatus(userId);

  const actionBtn = document.createElement("button");
  actionBtn.className = "btn";

  if (status === "friends") {
    actionBtn.className += " btn-secondary";
    actionBtn.textContent = "Already Friends";
    actionBtn.disabled = true;
  } else if (status === "pending-sent") {
    actionBtn.className += " btn-secondary";
    actionBtn.textContent = "Request Sent";
    actionBtn.disabled = true;
  } else if (status === "pending-received") {
    actionBtn.className += " btn-success";
    actionBtn.textContent = "Accept Request";
    actionBtn.onclick = async () => {
      const requestId = await findRequestId(userId, currentUser.uid);
      if (requestId) {
        await acceptRequest(requestId, userId);
        searchUsers(document.getElementById("search-input").value);
      }
    };
  } else {
    actionBtn.className += " btn-primary";
    actionBtn.textContent = "Add Friend";
    actionBtn.onclick = () => sendFriendRequest(userId, actionBtn);
  }

  actions.appendChild(actionBtn);

  card.appendChild(avatar);
  card.appendChild(info);
  card.appendChild(actions);

  return card;
}

/* Get Relationship Status */
async function getRelationshipStatus(userId) {
  await loadUserData();

  // Check if already friends
  if (currentUserData.friends && currentUserData.friends.includes(userId)) {
    return "friends";
  }

  // Check for pending requests
  const sentQuery = query(
    collection(db, "friendRequests"),
    where("from", "==", currentUser.uid),
    where("to", "==", userId),
    where("status", "==", "pending")
  );
  const sentSnapshot = await getDocs(sentQuery);
  if (!sentSnapshot.empty) {
    return "pending-sent";
  }

  const receivedQuery = query(
    collection(db, "friendRequests"),
    where("from", "==", userId),
    where("to", "==", currentUser.uid),
    where("status", "==", "pending")
  );
  const receivedSnapshot = await getDocs(receivedQuery);
  if (!receivedSnapshot.empty) {
    return "pending-received";
  }

  return "none";
}

/* Find Request ID */
async function findRequestId(fromId, toId) {
  const q = query(
    collection(db, "friendRequests"),
    where("from", "==", fromId),
    where("to", "==", toId),
    where("status", "==", "pending")
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : snapshot.docs[0].id;
}

/* Send Friend Request */
async function sendFriendRequest(toUserId, button) {
  try {
    button.disabled = true;
    button.textContent = "Sending...";

    // Check if request already exists
    const status = await getRelationshipStatus(toUserId);
    if (status !== "none") {
      alert("Friend request already exists or you are already friends!");
      return;
    }

    // Create friend request
    await addDoc(collection(db, "friendRequests"), {
      from: currentUser.uid,
      to: toUserId,
      status: "pending",
      timestamp: serverTimestamp(),
    });

    button.textContent = "Request Sent";
    button.className = "btn btn-secondary";
    showClustrModal("Success!", "<p>Friend request sent!</p>");
  } catch (error) {
    console.error("Error sending friend request:", error);
    button.disabled = false;
    button.textContent = "Add Friend";
    showClustrModal(
      "Error!",
      "<p>Failed to send friend request. Please try again.</p>"
    );
  }
}

/* Initialize on page load */
document.addEventListener("DOMContentLoaded", () => {
  // Page will be initialized when auth state changes
});
