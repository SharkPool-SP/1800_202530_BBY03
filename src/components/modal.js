class Modal extends HTMLElement {
  connectedCallback() {
    const metaData = JSON.parse(this.textContent);
    this.innerHTML = `
      <style>
        .clustr-modal-holder {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .clustr-modal-holder::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--theme-value-dark);
          opacity: 0.25;
          z-index: 1;
        }
        .clustr-modal {
          position: relative;
          z-index: 2;
          font-family: "Amble-Bold", Arial;
          font-weight: bold;
          text-align: center;
          color: var(--theme-text);
          width: max-content;
          height: max-content;
          border-radius: 14px;
          border: solid 5px var(--theme-value-light);
          box-shadow: 0 0 10px 5px var(--theme-value-dark);
          background: var(--theme-value);
          transform: scale(0);
          transition: transform 0.3s ease, opacity 0.3s ease;
          opacity: 0;
        }

        /* Zoom in on attach */
        .clustr-modal.zoom-in {
          transform: scale(1);
          opacity: 1;
        }
        /* Zoom out on close */
        .clustr-modal.zoom-out {
          transform: scale(0);
          opacity: 0;
        }

        .clustr-modal .title {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 12px 12px 0 0;
          padding: 5px 0px;
          background: var(--theme-value-dark);
          font-size: clamp(10px, 32px, 3vw);
          margin-left: auto;
        }
        .clustr-modal .title span {
          display: inline-block;
          text-align: center;
          color: var(--theme-text);
        }
        .clustr-modal .title .close img {
          width: 100%;
          height: auto;
        }
        .clustr-modal .title .close {
          position: absolute;
          right: 5px;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: none;
          border: none;
          margin-left: auto;
          margin-right: 5px;
          filter: var(--theme-hue);
          transition: transform 100ms ease-in-out;
          cursor: pointer;
        }
        .clustr-modal .title .close:hover {
          transform: translateY(-50%) scale(1.2);
        }

        .clustr-modal .content {
          padding: 20px 20px 40px 20px;
          border-radius: 0 0 12px 12px;
          background: var(--theme-value);
        }
        .clustr-modal .content p {
          font-family: "Amble-Regular", Arial;
          font-weight: normal;
          margin: 0px;
          font-size: calc(clamp(10px, 35px, 3vw) / 1.5);
          background: var(--theme-value-dark);
          padding: 10px 20px 40px 20px;
          border-radius: 10px;
          box-shadow: 0 4px 0 var(--theme-value-light);
        }
      </style>
      <div class="clustr-modal-holder">
        <div class="clustr-modal">
          <header class="title">
            <span>${metaData.title}</span>
            <button class="close">
              <img draggable="false" alt="close" src="images/exit.svg">
            </button>
          </header>
          <div class="content">
            <p>${metaData.desc}</p>
          </div>
        </div>
      </div>
    `;

    const modalDiv = this;
    const modal = this.querySelector(".clustr-modal");
    requestAnimationFrame(() => {
      modal.classList.add("zoom-in");
    });

    const closeBtn = document.querySelector(
      `div[class="clustr-modal"] button[class="close"]`
    );
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      modal.classList.add("zoom-out");
      modal.addEventListener(
        "transitionend",
        () => {
          modalDiv.remove();
        },
        { once: true }
      );
    });
  }
}
customElements.define("clustr-modal", Modal);
