// checks if the meetup lists are empty , shows the meeagse
function updateEmptyStates() {
  const createdList = document.getElementById("meetups-created");
  const joinedList = document.getElementById("meetups-joined");
  const emptyCreated = document.getElementById("empty-created");
  const emptyJoined = document.getElementById("empty-joined");
  // shows message if the sections are empty
  emptyCreated.style.display =
    createdList.children.length === 0 ? "block" : "none";
  emptyJoined.style.display =
    joinedList.children.length === 0 ? "block" : "none";
}

//removes the meetup list when clicking delete or leave
function removeMeetupItem(event) {
  const btn = event.target;
  const item = btn.closest(".meetup-item");

  if (!item) return;

  const parent = item.parentElement;

  if (btn.classList.contains("delete-btn")) {
    if (confirm("Delete this meetup?")) {
      parent.removeChild(item);
    }
  }

  if (btn.classList.contains("leave-btn")) {
    if (confirm("Leave this meetup?")) {
      parent.removeChild(item);
    }
  }

  updateEmptyStates();
}

//set upp all the buttons to wokr when running
function initMeetupButtons() {
  document
    .querySelectorAll(".leave-btn")
    .forEach((btn) => btn.addEventListener("click", removeMeetupItem));

  document
    .querySelectorAll(".delete-btn")
    .forEach((btn) => btn.addEventListener("click", removeMeetupItem));
}

function initAll() {
  initMeetupButtons();
  updateEmptyStates();
}

document.addEventListener("DOMContentLoaded", initAll);
