import { doc } from "firebase/firestore";
import { getThemes } from "./Themes.js";
import { getProgramsBCIT } from "./Programs.js";

// TODO, make this update profiles in firestore

function initAll() {
  /*
    Profile Picture
  */
  // TODO I lazy.

  /*
    Editable Fields
  */
  // TODO finish
  const fields = document.querySelectorAll("button.edit");
  Array.from(fields).forEach((field) => {
    field.addEventListener("click", (e) => {
      e.stopPropagation();

      const btn = e.target.closest("button");
      btn.nextElementSibling.focus();
    });
  });

  /*
    Programs
  */
  const programDiv = document.querySelector("datalist.program-select");
  const programAppendables = [];
  for (const program of getProgramsBCIT()) {
    const option = document.createElement("option");
    option.text = program;
    option.value = program;
    programAppendables.push(option);
  }

  programDiv.append(...programAppendables);

  /*
    Themes
  */
  const templateTheme = document.querySelector(".content-holder .theme-btn");
  const themes = getThemes();

  const appendables = [];
  for (const theme of themes) {
    const button = templateTheme.cloneNode(true);
    button.id = theme.id;
    button.style.background = theme.displayColor ?? theme.color;
    button.style.color = theme.text;
    button.textContent = "Aa";
    appendables.push(button);
  }

  const themeDiv = templateTheme.parentElement;
  templateTheme.remove();
  themeDiv.append(...appendables);
  themeDiv.addEventListener("click", (e) => {
    e.stopPropagation();

    const btn = e.target.closest("button");
    if (!btn) return;

    const theme = themes.find((t) => t.id === btn.id);
    const bodyStyle = document.body.style;
    bodyStyle.setProperty("--theme-hue", theme.filter);
    bodyStyle.setProperty("--theme-hue-norm", theme.filterNorm);
    bodyStyle.setProperty("--theme-value", theme.color);
    bodyStyle.setProperty("--theme-value-dark", theme.colorDark);
    bodyStyle.setProperty("--theme-text", theme.text);
    bodyStyle.setProperty("--theme-glow", theme.glow ?? "#000");
    bodyStyle.setProperty("--theme-borders", theme.borders ?? theme.color);
    bodyStyle.setProperty(
      "--theme-button-filter",
      theme.whiteButtonFilter ?? ""
    );

    for (const child of appendables) child.removeAttribute("selected");
    btn.setAttribute("selected", "true");
  });
}

document.addEventListener("DOMContentLoaded", initAll);
