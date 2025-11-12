import { getDocument } from "../js/FireStoreUtil.js";
import { applyTheme } from "../js/ThemeUnpack.js";
import { getThemes } from "../js/Themes.js";

const themes = getThemes();

class ProfileNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        .my-profile {
          margin: 8px 0 0 8px;
          padding: 2px;
          border-radius: 100%;
          width: 50px;
          height: 50px;
          position: absolute;
          background: var(--theme-value);
          box-shadow: 0 0 15px #000;
          top: 0px;
          cursor: pointer;
          transition: filter 100ms ease-in-out;
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
      <div class="my-profile" title="My Profile">
        <img src="images/default-avatar.svg" draggable="false" alt="pfp" />
      </div>
    `;

    const profileDiv = document.querySelector(`div[class="my-profile"]`);
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
        }

        // apply Theme
        const themeID = data.get("themeID");
        applyTheme(themes.find((t) => t.id === themeID));
      });
    });
  }
}
customElements.define("profile-nav", ProfileNav);
