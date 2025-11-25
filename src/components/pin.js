class Pin extends HTMLElement {
  connectedCallback() {
    const imgSrc = this.getAttribute("src");
    const name = this.getAttribute("name");
    const isMeetup = this.getAttribute("meetup");
    this.removeAttribute("src");
    this.removeAttribute("name");
    this.removeAttribute("name");
    if (!imgSrc) return;
    this.innerHTML = `
      <style>
        clustr-pin {
          position: absolute;
          top: 25%;
          left: 25%;
          display: block;
          z-index: 9999;
        }

        .clustr-pin {
          width: auto !important;
          transform: scale(1) !important;
          left: -14px !important;
          top: -35px !important;
        }
        .clustr-pin img {
          background: var(--theme-value-pin);
          filter: hue-rotate(0deg) !important;
          position: relative;
          width: 25px;
          height: 25px;
          border-radius: 6px;
          padding: 2px;
        }
        .clustr-pin .nub {
          width: 10px;
          height: 10px;
          position: absolute;
          background: var(--theme-value-pin);
          top: 25px;
          left: calc(50% + 5px);
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
      </style>
      <div class="clustr-pin">
        <img src="${imgSrc}" alt="Profile Image" />
        <span>${name}</span>
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
  console.log(name, isMeetup, appendable);
  appendable.appendChild(pinDiv);
  return pinDiv;
};
