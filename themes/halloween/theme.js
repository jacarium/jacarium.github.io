/*
 * Jacarium Halloween theme, the script half. Everything here is runtime-only:
 * js/theme.js loads it while THEME is 'halloween', and with THEME set to
 * 'none' none of it exists. It does three things theme.css can't do on its own:
 *   1. tints some of the falling jacaranda petals orange (they live inside the
 *      <jacaranda-tree> / <jacaranda-lock> shadow roots);
 *   2. lets a few small bats glide across the hero;
 *   3. puts a one-line seasonal greeting at the top of the footer.
 */

// 1. Orange and amber petals among the violet ones, plus a few on the carpet.
//    The petal markup is <div class="jt-fall"><div class="jt-tumble"><svg class="jt-face">…</svg><svg class="jt-face jt-back">…</svg></div></div>.
const PETAL_STYLE = `
.jt-fall:nth-child(4n+1) .jt-face path:first-child { fill: #FF8A3D; }
.jt-fall:nth-child(4n+1) .jt-face path:last-child { stroke: #FFE2B8; }
.jt-fall:nth-child(4n+1) .jt-back path { fill: #C85A1E; }
.jt-fall:nth-child(7n+3) .jt-face path:first-child { fill: #FFB15C; }
.jt-fall:nth-child(7n+3) .jt-face path:last-child { stroke: #FFF3DF; }
.jt-fall:nth-child(7n+3) .jt-back path { fill: #E8702A; }
[data-carpet] path:nth-child(3) { fill: #FF8A3D; fill-opacity: 0.7; }
`;

function tintPetals(el, tries = 0) {
  const root = el.shadowRoot;
  if (!root || root.querySelector('style[data-halloween]')) return;
  if (!root.querySelector('.jt-root')) {
    // Not rendered yet (connectedCallback hasn't run): try again shortly.
    if (tries < 60) requestAnimationFrame(() => tintPetals(el, tries + 1));
    return;
  }
  const style = document.createElement('style');
  style.dataset.halloween = '';
  style.textContent = PETAL_STYLE;
  root.appendChild(style);
}

['jacaranda-tree', 'jacaranda-lock'].forEach((tag) => {
  customElements.whenDefined(tag).then(() => document.querySelectorAll(tag).forEach((el) => tintPetals(el)));
});

// 2. Bats across the hero. Styling and motion live in theme.css.
const BAT = '<svg viewBox="0 0 48 24" aria-hidden="true">' +
  '<path class="hw-wing" d="M24 10C20 4 12 2 3 6c4 2 5.5 5 5 8.5 3-1.5 6-.5 7.5 3 2.5-2 5.5-2.5 8.5-.5z" fill="#4A3A9C"></path>' +
  '<g transform="scale(-1 1) translate(-48 0)"><path class="hw-wing" d="M24 10C20 4 12 2 3 6c4 2 5.5 5 5 8.5 3-1.5 6-.5 7.5 3 2.5-2 5.5-2.5 8.5-.5z" fill="#4A3A9C"></path></g>' +
  '<ellipse cx="24" cy="12.5" rx="3.2" ry="5" fill="#3B2E80"></ellipse>' +
  '<path d="M21.6 9l-1-3.2 2.4 1.6zM26.4 9l1-3.2-2.4 1.6z" fill="#3B2E80"></path>' +
  '<circle cx="23" cy="10.6" r=".55" fill="#FFB15C"></circle><circle cx="25" cy="10.6" r=".55" fill="#FFB15C"></circle>' +
  '</svg>';

const hero = document.querySelector('.hero');
if (hero && !hero.querySelector('.hw-bats')) {
  const bats = document.createElement('div');
  bats.className = 'hw-bats';
  bats.setAttribute('aria-hidden', 'true');
  bats.innerHTML = [1, 2, 3].map((i) => `<div class="hw-bat hw-bat-${i}">${BAT}</div>`).join('');
  hero.prepend(bats);
}

// 3. A tiny greeting in the footer.
const PUMPKIN = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12.3 7.2c-.3-2.2.5-3.9 2.3-5" fill="none" stroke="#8E6CF0" stroke-width="2.2" stroke-linecap="round"></path>' +
  '<ellipse cx="7.2" cy="14.5" rx="5.6" ry="7.4" fill="#E8702A"></ellipse><ellipse cx="16.8" cy="14.5" rx="5.6" ry="7.4" fill="#E8702A"></ellipse>' +
  '<ellipse cx="12" cy="14.5" rx="5.8" ry="8" fill="#FF8A3D"></ellipse>' +
  '<path d="M8 13.4l1.9-2.8 1.9 2.8zM12.2 13.4l1.9-2.8 1.9 2.8z" fill="#0F0D16"></path>' +
  '<path d="M7.8 16.6l1.5 1.3 1.4-1.3 1.3 1.3 1.3-1.3 1.4 1.3 1.5-1.3" fill="none" stroke="#0F0D16" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"></path>' +
  '</svg>';

document.querySelectorAll('.site-footer').forEach((footer) => {
  if (footer.querySelector('.hw-note')) return;
  const note = document.createElement('span');
  note.className = 'hw-note';
  note.innerHTML = `${PUMPKIN}<span>Happy Halloween</span>`;
  footer.prepend(note);
});
