class NavBar extends HTMLElement {
  connectedCallback() {
    const selectedTab = this.getAttribute("tab");
    this.innerHTML = `
      <style>
        @media screen and (min-width: 1300px) {
          .clustr-navbar button img {
            margin-right: 15px;
            width: 10% !important;
          }
          .clustr-navbar button {
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: clamp(15px, 20px, 3vw) !important;
          }
        }
        .clustr-navbar {
          width: 100%;
          display: flex;
          position: fixed;
          bottom: 0px;
          z-index: 999;
        }
        .clustr-navbar button {
          font-family: "Amble-Bold", Arial;
          font-weight: bold;
          font-size: clamp(10px, 16px, 3vw);
          color: var(--theme-text);
          width: 100%;
          border: none;
          padding: 10px 0;
          background: var(--theme-value-dark);
          border-top: 3px solid rgba(0, 0, 0, .5);
          border-left: 1.5px dotted rgba(0, 0, 0, .5);
          border-right: 1.5px dotted rgba(0, 0, 0, .5);
          cursor: pointer;
          transition: background 100ms ease-in-out;
        }
        .clustr-navbar button:hover {
          background: var(--theme-value);
        }
        .clustr-navbar button[selected="true"] {
          background:  var(--theme-value-light);
        }
        .clustr-navbar div {
          margin: 5px 0;
        }
        .clustr-navbar img {
          filter: var(--theme-hue);
          width: clamp(32px, 100vw, calc(50px - 10%));
        }
      </style>
      <div class="clustr-navbar">
        <button id="meetup-list" selected="${selectedTab === "meetup-list"}">
          <img src="images/icon-meetup.svg" draggable="false" alt="Meetups" />
          <div>My Meetups</div>
        </button>
        <button id="map" selected="${selectedTab === "map"}">
          <img src="images/icon-map.svg" draggable="false" alt="Map" />
          <div>Campus Map</div>
        </button>
        <button id="friends" selected="${selectedTab === "friends"}">
          <img src="images/icon-friends.svg" draggable="false" alt="Friends" />
          <div>Friends</div>
        </button>
      </div>
    `;

    const navBar = document.querySelector(`div[class="clustr-navbar"]`);
    navBar.addEventListener("click", (e) => {
      e.stopPropagation();

      const newTab = e.target.closest("button").id + ".html";
      if (window.location.href !== newTab) {
        window.location.href = newTab;
      }
    });
  }
}
customElements.define("clustr-navbar", NavBar);
