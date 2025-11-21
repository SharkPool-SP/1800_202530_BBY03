function initAll() {
  // Custom Theme for Modals
  const bodyStyle = document.body.style;
  bodyStyle.setProperty("--theme-value", "#f5e0ff");
  bodyStyle.setProperty(
    "--theme-value-dark",
    "linear-gradient(125deg, #bc2cff, #8200bf)"
  );
  bodyStyle.setProperty("--theme-value-light", "#c973f1");
  bodyStyle.setProperty("--theme-text", "#fff");

  // Button Functionality
  const aboutUsText = `
    Clustr is a web app designed to connect <b>BCIT</b> students and strengthen campus community.<br>
    With an easy-to-use meetup system, students can create or join study groups, social hangouts,
    or project sessions while making collaboration both effortless and fun.<br>Clustr also lets
    students add friends, see who’s nearby with an interactive campus map, and stay engaged with
    the people who support their learning.<br><br>Whether you’re looking to focus, make friends,
    or get involved, Clustr helps you find your crowd.
  `.replaceAll("  ", "");
  const abtUsBtn = document.querySelector(
    `span[id="about-us"][class="nav-link"]`
  );
  abtUsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showClustrModal("About Clustr", `<p>${aboutUsText}</p>`);
  });

  const ourTeamText = `
    Clustr was developed by a small group of BCIT Students<br><br>
    <b>Vicente G</b><br>
    <i>Project Manager - Developer</i>
    <br><br>
    <b>Brihad S</b><br>
    <i>Backend Developer</i>
    <br><br>
    <b>Shirin S</b><br>
    <i>Frontend Developer</i>
  `.replaceAll("  ", "");
  const ourTeamBtn = document.querySelector(
    `span[id="team"][class="nav-link"]`
  );
  ourTeamBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showClustrModal("The Clustr Team", `<p>${ourTeamText}</p>`);
  });
}

document.addEventListener("DOMContentLoaded", initAll);
