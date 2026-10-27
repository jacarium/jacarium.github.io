// Seasonal theme switch. Set THEME to the name of a folder in themes/, or to 'none' for the normal site.
// A theme is themes/<name>/theme.css, plus themes/<name>/theme.js when it lists one below.
const THEME = 'halloween';

const THEMES = {
  halloween: { script: true }
};

// Bump this when a theme's files change, so browsers fetch the new ones.
const THEME_VERSION = '20261028b';

(function loadTheme() {
  const theme = THEMES[THEME];
  if (!theme) return;
  const base = `themes/${THEME}/`;
  document.documentElement.dataset.season = THEME;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = `${base}theme.css?v=${THEME_VERSION}`;
  document.head.appendChild(css);
  if (theme.script) {
    const js = document.createElement('script');
    js.type = 'module';
    js.src = `${base}theme.js?v=${THEME_VERSION}`;
    document.head.appendChild(js);
  }
})();
