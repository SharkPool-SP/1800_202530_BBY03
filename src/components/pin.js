class Pin extends HTMLElement {
  connectedCallback() {
    const imgSrc = this.getAttribute("src");
    const name = this.getAttribute("name");
    const isMeetup = this.getAttribute("meetup") === "true";
    this.removeAttribute("src");
    this.removeAttribute("name");
    this.removeAttribute("meetup");
    if (!imgSrc) return;
    this.innerHTML = `
      <style>
        clustr-pin {
          position: absolute;
          display: block;
          z-index: 9999;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .clustr-pin {
          width: auto !important;
          transform: scale(1) !important;
          transform-origin: top left !important;
          position: absolute;
          left: -1%;
          top: -8%;
          ${isMeetup ? "pointer-events: all; cursor: pointer;" : ""}
        }
        .clustr-pin .location {
          background: var(--theme-value-pin);
          filter: hue-rotate(0deg) !important;
          position: relative;
          width: 25px;
          height: 25px;
          border-radius: 6px;
          padding: 2px;
          display: flex;
          justify-content: center;
          z-index: 10;
          align-items: center;
        }
        .clustr-pin div.location div {
          background: #ff0000;
          filter: var(--theme-hue) invert(1) !important;
          width: 15px;
          height: 15px;
          border-radius: 4px;
        }
        .clustr-pin .nub {
          width: 10px;
          height: 10px;
          position: absolute;
          background: var(--theme-value-pin);
          top: 95%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
        }
        .clustr-pin span {
          position: absolute;
          left: 50%;
          top: -20px;
          transform: translateX(-50%);
          text-align: center;
          font-size: 10px;
          color: #000;
          background: #fff;
          filter: var(--theme-button-filter);
          padding: 2px 5px;
          border-radius: 8px;
          white-space: nowrap;
        }

        @media (max-width: 1100px) {
          .clustr-pin {
            transform: scale(.5) !important;
          }
        }
        @media (max-width: 500px) {
          .clustr-pin {
            transform: scale(.25) !important;
          }
        }
      </style>
      <div class="clustr-pin">
        ${
          isMeetup
            ? `<div class="location"><div></div></div>`
            : `<img class="location" src="${imgSrc}" alt="Profile Image" />`
        }
        ${name ? `<span>${name}</span>` : ""}
        <div class="nub"></div>
      </div>
    `;
  }
}
customElements.define("clustr-pin", Pin);

globalThis.createPin = (imgSrc, name, isMeetup, appendable) => {
  const pinDiv = document.createElement("clustr-pin");
  pinDiv.setAttribute("src", imgSrc);
  pinDiv.setAttribute("name", name);
  pinDiv.setAttribute("meetup", isMeetup);
  appendable.appendChild(pinDiv);
  return pinDiv;
};
