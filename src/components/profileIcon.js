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

    const navBar = document.querySelector(`div[class="my-profile"]`);
    navBar.addEventListener("click", (e) => {
      e.stopPropagation();

      if (window.location.href !== "account.html") {
        window.location.href = "account.html";
      }
    });
  }
}
customElements.define("profile-nav", ProfileNav);
