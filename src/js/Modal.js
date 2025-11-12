const showModal = (title, desc) => {
  const modal = document.createElement("clustr-modal");
  modal.textContent = JSON.stringify({ title, desc });
  document.body.appendChild(modal);
};

export { showModal };
