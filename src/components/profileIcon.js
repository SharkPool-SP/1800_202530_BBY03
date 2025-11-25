import { getDocument } from "../js/FireStoreUtil.js";
import { applyTheme } from "../js/ThemeUnpack.js";
import { getThemes } from "../js/Themes.js";

const themes = getThemes();

class ProfileNav extends HTMLElement {
  connectedCallback() {
    const hasNav = this.getAttribute("hasNav") === "true";
    this.innerHTML = `
      <style>
        .my-profile {
          margin: ${hasNav ? "12px 0 0px 80px" : "8px 0 0 8px"};
          padding: 2px;
          border-radius: 100%;
          width: 50px;
          height: 51px;
          position: absolute;
          background: var(--theme-value);
          box-shadow: 0 0 0 2px var(--theme-glow);
          top: 0px;
          cursor: pointer;
          transform-origin: left top;
          transition: filter 100ms ease-in-out;
          z-index: 999;
        }
        .my-profile:hover {
          filter: brightness(1.2);
        }
        .my-profile img {
          border-radius: 100%;
          width: 50px;
          height: 50px;
        }
      </style>
      <a class="my-profile" href="#account.html" title="My Profile">
        <img src="images/default-avatar.svg" draggable="false" alt="pfp" />
      </a>
    `;

    const profileDiv = document.querySelector(`a[class="my-profile"]`);
    profileDiv.addEventListener("click", (e) => {
      e.stopPropagation();

      if (window.location.href !== "account.html") {
        window.location.href = "account.html";
      }
    });

    Events.on("AUTH_STATE_CHANGE", (user) => {
      getDocument("users", user.uid, (data) => {
        // apply PFP
        const pfp = data.get("pfp");
        if (pfp && !pfp.endsWith(".svg")) {
          profileDiv.firstElementChild.src = "data:image/png;base64," + pfp;
          Events.emit("PROFILE_PIC_FOUND", data);
        }

        // apply Theme
        const themeID = data.get("themeID");
        applyTheme(themes.find((t) => t.id === themeID));

        // if the user has not edited their profile yet, signal for this button to be clicked
        if (!data.get("hasInitProfile")) {
          this.stepClickMeLoop(profileDiv);
        }
      });
    });
  }

  stepClickMeLoop(profileDiv) {
    const scale = 1 + Math.sin(Date.now() / 100) * 0.2;
    profileDiv.style.transform = `scale(${scale})`;
    requestAnimationFrame(() => {
      this.stepClickMeLoop(profileDiv);
    });
  }
}
customElements.define("profile-nav", ProfileNav);
