let callbackFn, triggeredButtons;

function resetTriggers() {
  callbackFn = undefined;
  triggeredButtons = {
    confirm: false,
    cancel: false,
  };
}

resetTriggers();

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
          border-radius: 16px;
          border: solid 5px var(--theme-value-light);
          box-shadow: 0 0 10px 5px var(--theme-value-dark);
          background: var(--theme-value);
          transform: scale(0);
          transition: transform 0.3s ease, opacity 0.3s ease;
          opacity: 0;
          margin: 0 30px;
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
          font-size: clamp(26px, 32px, 3vw);
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
          font-size: calc(clamp(22px, 35px, 3vw) / 1.8);
        }
        .clustr-modal .content p:first-child {
          font-family: "Amble-Regular", Arial;
          font-weight: normal;
          margin: 0px;
          background: var(--theme-value-dark);
          padding: 10px 20px 40px 20px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 4px 0 var(--theme-value-light);
          max-width: 65vw;
        }

        .clustr-modal .button-row {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: -20px 0 25px 0;
        }
        .clustr-modal .button-row button {
          margin: 0 10px;
          background: #fff;
          color: #000;
          padding: 10px 20px;
          filter: var(--theme-button-filter);
          border: none;
          border-radius: 12px;
          font-family: "Amble-Bold", Arial;
          font-weight: bold;
          font-size: calc(clamp(22px, 35px, 3vw) / 1.8);
          transition: transform 150ms ease-in-out;
        }
        .clustr-modal .button-row button:hover {
          transform: scale(1.1);
        }

        .clustr-modal button.btn {
          padding: 8px 15px;
          background: #fff;
          color: #000;
          filter: var(--theme-button-filter);
          font-family: "Amble-Bold", Arial;
          font-weight: bold;
          font-size: 75%;
          border-radius: 12px;
          border: none;
          transition: transform 150ms ease-in-out;
          margin: 0 5px;
          pointer-events: all;
          cursor: pointer;
        }
        .clustr-modal button.btn:not([blocked="true"]):hover {
          transform: scale(1.1);
        }
        .clustr-modal button.btn[blocked="true"] {
          pointer-events: none;
          opacity: .5;
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
            ${metaData.desc}
          </div>
          ${
            !metaData.isConfirm
              ? ""
              : `
              <div class="button-row">
                <button id="confirm">Yes</button>
                <button id="cancel">Cancel</button>
              </div>
            `
          }
        </div>
      </div>
    `;

    const modalDiv = this;
    const modal = this.querySelector(".clustr-modal");
    requestAnimationFrame(() => {
      modal.classList.add("zoom-in");
    });

    const closeHandler = (e) => {
      e.stopPropagation();
      modal.classList.add("zoom-out");
      modal.addEventListener(
        "transitionend",
        () => {
          modalDiv.remove();
        },
        { once: true }
      );

      if (!triggeredButtons.confirm) {
        triggeredButtons.cancel = true;
      }
      if (callbackFn) callbackFn();
    };

    const closeBtn = document.querySelector(
      `div[class="clustr-modal"] button[class="close"]`
    );
    closeBtn.addEventListener("click", closeHandler);
    if (metaData.isConfirm) {
      const cancelBtn = document.querySelector(
        `div[class="button-row"] button[id="cancel"]`
      );
      cancelBtn.addEventListener("click", closeHandler);

      const submitBtn = document.querySelector(
        `div[class="button-row"] button[id="confirm"]`
      );
      submitBtn.addEventListener("click", (e) => {
        triggeredButtons.confirm = true;
        closeHandler(e);
      });
    }
  }
}
customElements.define("clustr-modal", Modal);

globalThis.showClustrModal = (title, desc, isConfirm) => {
  resetTriggers();
  const modal = document.createElement("clustr-modal");
  modal.textContent = JSON.stringify({ title, desc, isConfirm });
  document.body.appendChild(modal);

  if (isConfirm) {
    return new Promise((resolve) => {
      callbackFn = () => {
        resolve(triggeredButtons.confirm);
      };
    });
  }
};
