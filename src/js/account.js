import {
  auth,
  logoutUser,
  checkSignedIn,
  getDocument,
  setDocument,
  onAuthStateChanged,
} from "./FireStoreUtil.js";
import { applyTheme } from "./ThemeUnpack.js";
import { getThemes } from "./Themes.js";
import { getProgramsBCIT } from "./Programs.js";
import { showModal } from "./Modal.js";

let userId,
  dirty = false;
const changedData = {
  name: null,
  desc: null,
  theme: null,
  program: null,
  campus: null,
  pfp: null,
};

function dataChanged(key, newValue) {
  // normalize
  if (key === "name") {
    newValue = newValue.trim().substring(0, 31); // 30 is a reasonable name length
  } else if (key === "desc") {
    newValue = newValue.trim().substring(0, 201); // 200 is a reasonable description length
  }

  const oldValue = changedData[key];
  if (oldValue !== newValue) {
    changedData[key] = newValue;
    if (!dirty) {
      dirty = true;
      document.getElementById("save-changes").setAttribute("blocked", false);
    }
  }
}

function saveChanges() {
  if (!userId) {
    alert("Internal Error: No Account ID!");
    return;
  }

  document.getElementById("save-changes").setAttribute("blocked", true);
  dirty = false;
  setDocument("users", userId, {
    userName: changedData.name,
    aboutMe: changedData.desc,
    themeID: changedData.theme,
    program: [changedData.program, changedData.campus],
    pfp: changedData.pfp,
    hasInitProfile: true,
  });

  showModal("Success!", "Your profile has been updated.");
}

function compressPFP(arrayBuffer, callback) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const blob = new Blob([arrayBuffer]);
  const img = new Image();

  img.onload = function () {
    const maxSize = 512;
    let { width, height } = img;

    if (width > height) {
      if (width > maxSize) {
        height *= maxSize / width;
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width *= maxSize / height;
        height = maxSize;
      }
    }

    canvas.width = width / 5;
    canvas.height = width / 5;
    ctx.drawImage(img, 0, 0, width / 5, width / 5);
    callback(canvas.toDataURL("image/png"));
  };

  img.onerror = function (err) {
    console.error("Image load error:", err);
    callback(null);
  };

  // Convert blob to an object URL for the Image source
  img.src = URL.createObjectURL(blob);
}

function initAll() {
  /* Profile Picture */
  const profileImg = document.querySelector(`div[class="profile-pic"] img`);
  const uploadImgBtn = document.querySelector(
    `div[class="profile-pic"] button`
  );
  const fileInput = document.querySelector(`div[class="profile-pic"] input`);

  uploadImgBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image")) {
      alert("Invalid Image -- Only PNG & JPEG are permitted!");
      return;
    }

    const buffer = await file.arrayBuffer();
    compressPFP(buffer, (base64) => {
      if (!base64) return;
      profileImg.src = base64;
      dataChanged("pfp", base64.split(",")[1]);
    });
  });

  /* Editable Fields */
  const fields = document.querySelectorAll("button.edit");
  Array.from(fields).forEach((field) => {
    field.addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.target.closest("button");
      btn.nextElementSibling.focus();
    });
  });

  const userNameInput = document.querySelector(
    `div[class="editable-field"][id="name"] input`
  );
  userNameInput.addEventListener("change", (e) => {
    dataChanged("name", e.target.value);
  });

  const aboutMeInput = document.querySelector(
    `div[class="editable-field"][id="desc"] textarea`
  );
  aboutMeInput.addEventListener("change", (e) => {
    dataChanged("desc", e.target.value);
  });

  /* Campus Program */
  const programDiv = document.querySelector("datalist.program-select");
  const programAppendables = [];
  for (const program of getProgramsBCIT()) {
    const option = document.createElement("option");
    option.text = program;
    option.value = program;
    programAppendables.push(option);
  }
  programDiv.append(...programAppendables);

  const programSelect = document.querySelector(`input[class="program-select"]`);
  programSelect.addEventListener("change", (e) => {
    dataChanged("program", e.target.value);
  });
  const campusSelect = document.querySelector(`select[class="campus-select"]`);
  campusSelect.addEventListener("change", (e) => {
    dataChanged("campus", e.target.value);
  });

  /* Themes */
  const templateTheme = document.querySelector(".content-holder .theme-btn");
  const themes = getThemes();

  const themeApppendables = [];
  for (const theme of themes) {
    const button = templateTheme.cloneNode(true);
    button.id = theme.id;
    button.style.background = theme.displayColor ?? theme.color;
    button.style.color = theme.text;
    button.textContent = "Aa";
    themeApppendables.push(button);
  }

  const themeDiv = templateTheme.parentElement;
  templateTheme.remove();
  themeDiv.append(...themeApppendables);
  themeDiv.addEventListener("click", (e) => {
    e.stopPropagation();

    const btn = e.target.closest("button");
    if (!btn) return;

    const theme = themes.find((t) => t.id === btn.id);
    dataChanged("theme", theme.id);

    for (const child of themeApppendables) child.removeAttribute("selected");
    btn.setAttribute("selected", "true");
    applyTheme(theme);
  });

  const saveChangeBtn = document.getElementById("save-changes");
  saveChangeBtn.addEventListener("click", saveChanges);

  const logOutBtn = document.getElementById("sign-out");
  logOutBtn.addEventListener("click", logoutUser);

  checkSignedIn();

  // decode user preferences
  onAuthStateChanged(auth, (user) => {
    userId = user.uid;
    getDocument("users", userId, (data) => {
      changedData.pfp = data.get("pfp");
      if (changedData.pfp && !changedData.pfp.endsWith(".svg")) {
        profileImg.src = "data:image/png;base64," + changedData.pfp;
      }

      userNameInput.value = data.get("userName") ?? "";
      changedData.name = userNameInput.value;

      aboutMeInput.value = data.get("aboutMe") ?? "";
      changedData.desc = aboutMeInput.value;

      programSelect.value = data.get("program")[0] ?? "";
      changedData.program = programSelect.value;
      campusSelect.value = data.get("program")[1] ?? "";
      changedData.campus = campusSelect.value;

      const themeId = data.get("themeID");
      const themeBtn = themeDiv.querySelector(`button[id="${themeId}"]`);
      if (themeBtn) {
        changedData.theme = themeId;
        themeBtn.click();
      }
    });
  });

  // notify the user of unsaved changes
  window.addEventListener("beforeunload", function (e) {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
      var confirmationMsg =
        "It looks like you have been editing something. " +
        "If you leave before saving, your changes will be lost.";
      return confirmationMsg;
    } else {
      return undefined;
    }
  });
}

document.addEventListener("DOMContentLoaded", initAll);
