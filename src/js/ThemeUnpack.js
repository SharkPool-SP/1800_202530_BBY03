const applyTheme = function (theme) {
  const bodyStyle = document.body.style;
  bodyStyle.setProperty("--theme-hue", theme.filter);
  bodyStyle.setProperty("--theme-hue-norm", theme.filterNorm);
  bodyStyle.setProperty("--theme-hue-map", theme.mapFilter);
  bodyStyle.setProperty("--theme-value", theme.color);
  bodyStyle.setProperty("--theme-value-dark", theme.colorDark);
  bodyStyle.setProperty("--theme-value-light", theme.colorLight);
  bodyStyle.setProperty("--theme-text", theme.text);
  bodyStyle.setProperty("--theme-value-pin", theme.pinColor);

  bodyStyle.setProperty("--theme-glow", theme.glow ?? "#000");
  bodyStyle.setProperty("--theme-borders", theme.borders ?? theme.color);
  bodyStyle.setProperty("--theme-button-filter", theme.whiteButtonFilter ?? "");
  bodyStyle.setProperty("--theme-background", theme.specialBG ?? theme.color);
};

export { applyTheme };
