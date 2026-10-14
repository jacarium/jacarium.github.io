/*
 * <jacaranda-tree> — the animated, procedural jacaranda.
 * <jacaranda-lock> — a padlock in the same style, with blossoms draped over the
 *                    shackle.
 *                    Same attributes and behaviour; the lock itself doesn't sway.
 *
 * Attributes:
 *   pulse        Any change to a non-zero value shakes the tree once.
 *   mirror       Flip the tree horizontally.
 *   flat         No 3D: layers stay flat and petals tumble in 2D.
 *   petal-count  Falling petals (default 26).
 *
 * Methods: shake()
 *
 * Tapping the tree shakes it and drops a burst of petals. The shake pivots at
 * the trunk's foot; the ground, carpet and shadows stay still. Unless flat,
 * the depth layers get a gentle scroll parallax. prefers-reduced-motion turns
 * the animation off.
 */

const STYLE = `
:host { display: block; }
.jt-root { pointer-events: none; position: relative; width: 100%; max-width: 600px; aspect-ratio: 600 / 640; margin: 0 auto; perspective: 1200px; transform-style: preserve-3d; }
.jt-flip { position: absolute; inset: 0; transform-style: preserve-3d; }
.jt-mirror .jt-flip { transform: scaleX(-1); }
.jt-layer { position: absolute; inset: 0; will-change: transform; transform-style: preserve-3d; }
.jt-layer svg { display: block; width: 100%; height: 100%; overflow: visible; }
.jt-tree { transform-box: view-box; transform-origin: 300px 604px; animation: jtSway 8s ease-in-out infinite; }
.jt-tree.jt-still { animation: none; }
.jt-tree.jt-shake { animation: jtShake 0.9s ease-in-out 1; }
.jt-limb { transform-box: view-box; animation-name: jtLimb; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.jt-bough { transform-box: view-box; animation-name: jtBough; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.jt-btn { display: block; width: 100%; height: 100%; padding: 0; border: none; background: transparent; cursor: pointer; border-radius: 24px; pointer-events: none; }
.jt-btn path, .jt-btn ellipse, .jt-btn rect, .jt-btn circle { pointer-events: visiblePainted; }
[data-layer="front"] path { pointer-events: visiblePainted; cursor: pointer; }
.jt-btn:focus-visible { outline: 3px solid #B39DF5; outline-offset: 4px; }
.jt-petals { position: absolute; left: -25%; right: -25%; top: -10%; bottom: 0; pointer-events: none; perspective: 700px; transform-style: preserve-3d; will-change: transform; }
.jt-fall { position: absolute; width: 12px; animation-name: jtFall; animation-timing-function: linear; transform-style: preserve-3d; will-change: transform, opacity; }
.jt-tumble { position: relative; width: 12px; height: 16px; transform-style: preserve-3d; animation-name: jtTumble; animation-timing-function: linear; animation-iteration-count: infinite; }
.jt-face { position: absolute; inset: 0; width: 100%; height: 100%; backface-visibility: hidden; }
.jt-back { transform: rotateY(180deg); }
@keyframes jtSway { 0%, 100% { transform: rotate(-0.9deg); } 50% { transform: rotate(0.9deg); } }
@keyframes jtLimb { 0%, 100% { transform: rotate(-0.7deg); } 50% { transform: rotate(0.7deg); } }
@keyframes jtBough { 0%, 100% { transform: rotate(-1.3deg) translate(0, 0); } 50% { transform: rotate(1.2deg) translate(2px, -3px); } }
@keyframes jtShake { 0% { transform: rotate(0); } 15% { transform: rotate(-4deg); } 35% { transform: rotate(3.5deg); } 55% { transform: rotate(-2.5deg); } 75% { transform: rotate(1.5deg); } 100% { transform: rotate(0); } }
@keyframes jtFall { 0% { opacity: 0; transform: translate3d(0, 0, 0); } 6% { opacity: 1; } 94% { opacity: 1; transform: translate3d(var(--dx), 100%, var(--dz)); } 100% { opacity: 0; transform: translate3d(var(--dx), 100%, var(--dz)); } }
@keyframes jtTumble { 0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(-25deg) translateX(0); } 25% { transform: rotateX(90deg) rotateY(70deg) rotateZ(10deg) translateX(8px); } 50% { transform: rotateX(180deg) rotateY(150deg) rotateZ(40deg) translateX(0); } 75% { transform: rotateX(270deg) rotateY(210deg) rotateZ(5deg) translateX(-8px); } 100% { transform: rotateX(360deg) rotateY(300deg) rotateZ(-25deg) translateX(0); } }
.jt-flat, .jt-flat .jt-flip, .jt-flat .jt-layer, .jt-flat .jt-petals, .jt-flat .jt-fall, .jt-flat .jt-tumble { transform-style: flat; perspective: none; }
.jt-flat .jt-layer, .jt-flat .jt-petals { will-change: auto; }
.jt-flat .jt-tumble { animation-name: jtTumble2d; }
.jt-flat .jt-face { backface-visibility: visible; }
.jt-flat .jt-back { display: none; }
@keyframes jtTumble2d { 0% { transform: rotate(-25deg) scaleX(1) translateX(0); } 25% { transform: rotate(10deg) scaleX(0.35) translateX(8px); } 50% { transform: rotate(40deg) scaleX(-1) translateX(0); } 75% { transform: rotate(5deg) scaleX(-0.35) translateX(-8px); } 100% { transform: rotate(-25deg) scaleX(1) translateX(0); } }
@media (prefers-reduced-motion: reduce) {
  .jt-tree, .jt-limb, .jt-bough, .jt-fall, .jt-tumble { animation: none !important; }
  .jt-petals { display: none; }
}
`;

const PALETTE = ['#4B3597', '#5E3FB8', '#6A4BD1', '#7B5CE0', '#8E6CF0', '#9B7DF2', '#B39DF5', '#C9B8FA', '#EDE6FF'];
const PALETTE_BACK = ['#2F2466', '#3B2E80', '#4A3A9C', '#5A48B5', '#6C5BC8'];
const PETAL_COLORS = ['#B39DF5', '#C9B8FA', '#9B7DF2', '#8E6CF0', '#A98BF4'];
const PETAL_DARKS = ['#6A4BD1', '#7B5CE0', '#5E3FB8', '#5E3FB8', '#6A4BD1'];
const PETAL_D = 'M5 0h2c0.4 3.2 1.4 6 3.6 9.2c0.9 1.3 0.6 2.6-0.3 3.4l-0.9-1.1-1.1 2.2-1.3-1.5L6 15.6l-1-3.4-1.3 1.5-1.1-2.2-0.9 1.1c-0.9-0.8-1.2-2.1-0.3-3.4C3.6 6 4.6 3.2 5 0z';
const PETAL_VEIN = 'M6 2.2c-0.5 3.4-1 6.2-1.6 9.6';

// Deterministic pseudo-random in [0, 1), so every tree grows the same.
const rnd = (i) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const f = (v) => (Math.round(v * 10) / 10).toString();
const ell = (cx, cy, rx, ry) => 'M' + f(cx - rx) + ' ' + f(cy) + 'a' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + f(rx * 2) + ' 0a' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + f(-rx * 2) + ' 0';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const paths = (list) => list.map((t) => `<path d="${t.d}" fill="${t.c}" fill-opacity="${t.o}"></path>`).join('');

// ---------- Geometry (built once, shared by every instance) ----------

// Florets: three depth layers (0 back, 1 mid, 2 front), merged into one path per
// colour. Returns a painter that draws blossom clusters with the given random source.
function makePaint(nx) {
  return (clusters) => {
    const maps = [{}, {}, {}], hi = [{}, {}, {}];
    clusters.forEach((c) => {
      const n = Math.round(c.r * 0.5);
      const scale = c.layer === 0 ? 0.9 : (c.layer === 2 ? 1.12 : 1);
      for (let i = 0; i < n; i++) {
        const ox = (nx() + nx() - 1) * c.r * 0.95, oy = (nx() + nx() - 1) * c.r * 0.8 - c.r * 0.3;
        const cx = c.x + ox, cy = c.y + oy;
        const rx = (5 + nx() * 3.2) * scale, ry = rx * (1.2 + nx() * 0.45);
        const light = (300 - cx) / 560 + (330 - cy) / 620;
        const idx = 3.4 + light * 2.4 - (oy / c.r) * 1.9 + (nx() - 0.5) * 1.5 + (c.layer === 2 ? 0.5 : 0);
        const key = c.layer === 0 ? clamp(Math.round((idx - 1) * 0.8), 0, 4) : clamp(Math.round(idx), 0, 7);
        maps[c.layer][key] = (maps[c.layer][key] || '') + ell(cx, cy, rx, ry);
      }
      if (c.layer > 0) {
        const hn = c.r > 25 ? 3 : 2;
        for (let i = 0; i < hn; i++) {
          const hx = c.x - c.r * 0.25 + (nx() - 0.5) * c.r * 0.9, hy = c.y - c.r * 0.5 + (nx() - 0.5) * c.r * 0.7;
          const hr = 2.4 + nx() * 1.4;
          const k = nx() < 0.6 ? 8 : 7;
          hi[c.layer][k] = (hi[c.layer][k] || '') + ell(hx, hy, hr, hr * 1.15);
        }
      }
    });
    const toList = (m, pal, op) => Object.keys(m).sort().map((k) => ({ d: m[k], c: pal[+k], o: op }));
    return { back: toList(maps[0], PALETTE_BACK, '0.92'), mid: toList(maps[1], PALETTE, '0.96'), front: toList(maps[2], PALETTE, '1'), hiMid: toList(hi[1], PALETTE, '0.9'), hiFront: toList(hi[2], PALETTE, '0.95') };
  };
}

let TREE = null;
function buildTree() {
  if (TREE) return TREE;
  let s = 7;
  const nx = () => rnd(s++);
  const seg = (x, y, ang, len) => {
    const bend = (nx() - 0.5) * 0.8;
    const a2 = ang + bend * 0.25;
    const ex = x + Math.cos(a2) * len, ey = y + Math.sin(a2) * len;
    const mx = (x + ex) / 2 + Math.cos(ang + Math.PI / 2) * len * bend * 0.4;
    const my = (y + ey) / 2 + Math.sin(ang + Math.PI / 2) * len * bend * 0.4;
    return { d: 'M' + f(x) + ' ' + f(y) + 'Q' + f(mx) + ' ' + f(my) + ' ' + f(ex) + ' ' + f(ey), ex, ey, ang: a2 };
  };
  const paint = makePaint(nx);
  const UP = -Math.PI / 2;
  const trunk = seg(300, 598, UP - 0.05, 112);
  const limbs = [];
  [-1.05, -0.4, 0.28, 0.98].forEach((off) => {
    const L = seg(trunk.ex, trunk.ey, UP + off + (nx() - 0.5) * 0.2, 128 * (0.9 + nx() * 0.25));
    const boughs = [];
    for (let bi = 0; bi < 3; bi++) {
      const B = seg(L.ex, L.ey, clamp(L.ang + (bi - 1) * 0.5 + (nx() - 0.5) * 0.25, -2.75, -0.4), 88 * (0.85 + nx() * 0.3));
      const b3 = [], b4 = [], clusters = [{ x: B.ex, y: B.ey, r: 24, layer: 1 }];
      for (let ci = 0; ci < 2; ci++) {
        const C = seg(B.ex, B.ey, clamp(B.ang + (ci - 0.5) * 0.9 + (nx() - 0.5) * 0.3, -2.85, -0.3), 54 * (0.85 + nx() * 0.3));
        b3.push(C.d);
        const l3 = nx();
        clusters.push({ x: C.ex, y: C.ey, r: 30, layer: l3 < 0.35 ? 0 : (l3 < 0.65 ? 1 : 2) });
        const n4 = nx() < 0.6 ? 2 : 1;
        for (let di = 0; di < n4; di++) {
          const D = seg(C.ex, C.ey, clamp(C.ang + (n4 === 1 ? 0 : (di - 0.5) * 0.9) + (nx() - 0.5) * 0.4, -2.95, -0.2), 36 * (0.8 + nx() * 0.4));
          b4.push(D.d);
          const l4 = nx();
          clusters.push({ x: D.ex, y: D.ey, r: 22, layer: l4 < 0.3 ? 0 : (l4 < 0.6 ? 1 : 2) });
        }
      }
      boughs.push(Object.assign({
        ox: f(L.ex), oy: f(L.ey), d2: B.d, d3: b3.join(''), d4: b4.join(''),
        dur: (4.6 + nx() * 2.2).toFixed(2) + 's', delay: '-' + (nx() * 6).toFixed(2) + 's'
      }, paint(clusters)));
    }
    limbs.push({ ox: f(trunk.ex), oy: f(trunk.ey), d: L.d, boughs, dur: (6.5 + nx() * 2.5).toFixed(2) + 's', delay: '-' + (nx() * 8).toFixed(2) + 's' });
  });
  TREE = { trunk: trunk.d, limbs };
  return TREE;
}

const carpetCache = {};
function carpet(count) {
  if (carpetCache[count]) return carpetCache[count];
  let s = 5000;
  const nx = () => rnd(s++);
  const m = {};
  for (let i = 0; i < count; i++) {
    const cx = 300 + (nx() + nx() - 1) * 250, cy = 606 + (nx() - 0.5) * 24;
    const rx = 4 + nx() * 3;
    const k = 4 + Math.floor(nx() * 4.6);
    m[k] = (m[k] || '') + ell(cx, cy, rx, rx * 0.4);
  }
  return (carpetCache[count] = Object.keys(m).sort().map((k) => ({ d: m[k], c: PALETTE[+k], o: '0.8' })));
}

let BASE_CARPET = null;
function baseCarpet() {
  if (BASE_CARPET) return BASE_CARPET;
  let s = 9000;
  const nx = () => rnd(s++);
  const m = {};
  for (let i = 0; i < 22; i++) {
    const cx = 300 + (nx() + nx() - 1) * 44, cy = 603 + (nx() - 0.5) * 10;
    const rx = 3.5 + nx() * 2.5;
    const k = 4 + Math.floor(nx() * 4.6);
    m[k] = (m[k] || '') + ell(cx, cy, rx, rx * 0.4);
  }
  return (BASE_CARPET = Object.keys(m).sort().map((k) => ({ d: m[k], c: PALETTE[+k], o: '0.85' })));
}

// ---------- Markup ----------

// Wraps per-bough content in the limb/bough sway groups.
function swayGroups(tree, limbExtra, boughContent) {
  return tree.limbs.map((L) =>
    `<g class="jt-limb" style="transform-origin: ${L.ox}px ${L.oy}px; animation-duration: ${L.dur}; animation-delay: ${L.delay}">${limbExtra(L)}` +
    L.boughs.map((B) =>
      `<g class="jt-bough" style="transform-origin: ${B.ox}px ${B.oy}px; animation-duration: ${B.dur}; animation-delay: ${B.delay}">${boughContent(B)}</g>`
    ).join('') +
    '</g>'
  ).join('');
}

function petalHTML(p, once) {
  return `<div class="jt-fall" style="left: ${p.left}; top: ${p.top}; height: ${p.h}; --dx: ${p.dx}; --dz: ${p.dz}; animation-duration: ${p.dur}; animation-delay: ${p.delay}; animation-iteration-count: ${once ? '1; animation-fill-mode: both' : 'infinite'}">` +
    `<div class="jt-tumble" style="animation-duration: ${p.spin};${once ? '' : ` animation-delay: ${p.delay};`} width: ${p.w}; height: ${p.hh}">` +
    `<svg class="jt-face" viewBox="0 0 12 16"><path d="${PETAL_D}" fill="${p.color}"></path><path d="${PETAL_VEIN}" fill="none" stroke="#EDE6FF" stroke-width="0.9" stroke-linecap="round" stroke-opacity="0.8"></path></svg>` +
    `<svg class="jt-face jt-back" viewBox="0 0 12 16"><path d="${PETAL_D}" fill="${p.dark}"></path></svg>` +
    '</div></div>';
}

function fallingPetals(n) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const u = 0.12 + rnd(i) * 0.76, v = 0.3 + rnd(i + 100) * 0.32;
    const top = (10 + v * 100) / 1.1;
    const size = 0.75 + rnd(i + 600) * 0.5;
    out += petalHTML({
      left: ((25 + u * 100) / 1.5).toFixed(1) + '%',
      top: top.toFixed(1) + '%',
      h: (95 - top).toFixed(1) + '%',
      dx: Math.round(30 + rnd(i + 200) * 90) + 'px',
      dz: Math.round(-60 + rnd(i + 250) * 120) + 'px',
      dur: (7 + rnd(i + 300) * 6).toFixed(2) + 's',
      delay: '-' + (rnd(i + 400) * 13).toFixed(2) + 's',
      spin: (2.2 + rnd(i + 500) * 2.4).toFixed(2) + 's',
      w: (12 * size).toFixed(1) + 'px',
      hh: (16 * size).toFixed(1) + 'px',
      color: PETAL_COLORS[i % PETAL_COLORS.length],
      dark: PETAL_DARKS[i % PETAL_DARKS.length]
    }, false);
  }
  return out;
}

let BURST = null;
function burstPetals() {
  if (BURST) return BURST;
  let out = '';
  for (let i = 0; i < 40; i++) {
    const u = 0.1 + rnd(i + 700) * 0.8, v = 0.28 + rnd(i + 800) * 0.32;
    const top = (10 + v * 100) / 1.1;
    const size = 0.8 + rnd(i + 1300) * 0.5;
    out += petalHTML({
      left: ((25 + u * 100) / 1.5).toFixed(1) + '%',
      top: top.toFixed(1) + '%',
      h: (95 - top).toFixed(1) + '%',
      dx: Math.round(-50 + rnd(i + 900) * 150) + 'px',
      dz: Math.round(-80 + rnd(i + 950) * 160) + 'px',
      dur: (2.6 + rnd(i + 1000) * 2).toFixed(2) + 's',
      delay: (rnd(i + 1100) * 0.6).toFixed(2) + 's',
      spin: (1.1 + rnd(i + 1200) * 1.4).toFixed(2) + 's',
      w: (12 * size).toFixed(1) + 'px',
      hh: (16 * size).toFixed(1) + 'px',
      color: PETAL_COLORS[(i + 2) % PETAL_COLORS.length],
      dark: PETAL_DARKS[(i + 2) % PETAL_DARKS.length]
    }, true);
  }
  return (BURST = out);
}

function treeMarkup() {
  const t = buildTree();
  const back = swayGroups(t, () => '', (B) => paths(B.back));
  const main = swayGroups(t,
    (L) => `<path d="${L.d}" fill="none" stroke="#3E3350" stroke-width="17" stroke-linecap="round"></path><path d="${L.d}" fill="none" stroke="#5A4D6E" stroke-width="3" stroke-opacity="0.6" stroke-linecap="round" transform="translate(-4 0)"></path>`,
    (B) => `<path d="${B.d2}" fill="none" stroke="#463B59" stroke-width="10" stroke-linecap="round"></path><path d="${B.d3}" fill="none" stroke="#4F4463" stroke-width="6" stroke-linecap="round"></path><path d="${B.d4}" fill="none" stroke="#57496B" stroke-width="3.2" stroke-linecap="round"></path>` + paths(B.mid) + paths(B.hiMid));
  const front = swayGroups(t, () => '', (B) => paths(B.front) + paths(B.hiFront));
  return `
<div class="jt-flip">
  <div class="jt-layer" data-layer="back" aria-hidden="true">
    <svg viewBox="0 0 600 640">
      <ellipse cx="300" cy="608" rx="300" ry="24" fill="#15111F"></ellipse>
      <ellipse cx="300" cy="606" rx="236" ry="15" fill="#09070F" fill-opacity="0.8"></ellipse>
      <g data-carpet></g>
      <g class="jt-tree">${back}</g>
    </svg>
  </div>
  <div class="jt-layer" data-layer="main">
    <button type="button" class="jt-btn" aria-label="Shake the jacaranda tree">
      <svg viewBox="0 0 600 640" aria-hidden="true">
        <g>
          <ellipse cx="300" cy="604" rx="46" ry="9" fill="#15111F"></ellipse>
          <ellipse cx="300" cy="603" rx="30" ry="5" fill="#09070F" fill-opacity="0.7"></ellipse>
          ${paths(baseCarpet())}
        </g>
        <g class="jt-tree">
          <path d="${t.trunk}" fill="none" stroke="#3A3042" stroke-width="34" stroke-linecap="round"></path>
          <path d="${t.trunk}" fill="none" stroke="#241C2E" stroke-width="9" stroke-opacity="0.7" stroke-linecap="round" transform="translate(10 0)"></path>
          <path d="${t.trunk}" fill="none" stroke="#5A4D6E" stroke-width="6" stroke-opacity="0.8" stroke-linecap="round" transform="translate(-9 0)"></path>
          <path d="M297 586 l-1 -34 M305 560 l1 -28 M291 540 l-1 -24" fill="none" stroke="#2A2236" stroke-width="2" stroke-linecap="round"></path>
          ${main}
        </g>
      </svg>
    </button>
  </div>
  <div class="jt-layer" data-layer="front" aria-hidden="true">
    <svg viewBox="0 0 600 640"><g class="jt-tree">${front}</g></svg>
  </div>
  <div class="jt-petals" data-layer="petals" aria-hidden="true">
    <div data-falling></div>
    <div data-burst></div>
  </div>
</div>`;
}

// ---------- Lock geometry ----------

let LOCK = null;
function buildLock() {
  if (LOCK) return LOCK;
  let s = 31;
  const nx = () => rnd(s++);
  const paint = makePaint(nx);
  // Shackle: an arch centred on (300, 330), radius 110.
  const cx = 300, cy = 330, R = 110;
  const at = (deg, r) => [cx + Math.cos(deg * Math.PI / 180) * r, cy + Math.sin(deg * Math.PI / 180) * r];
  const clusters = [];
  // A full wreath of blossom along the shackle, with a second, outer ring over the top.
  for (let deg = 180, k = 0; deg <= 360; deg += 13, k++) {
    const [x, y] = at(deg, R + 4 + (nx() - 0.5) * 12);
    clusters.push({ x, y, r: 28 + nx() * 9, layer: [1, 2, 0, 2, 1][k % 5] });
  }
  for (let deg = 214, k = 0; deg <= 326; deg += 16, k++) {
    const [x, y] = at(deg, R + 26 + (nx() - 0.5) * 10);
    clusters.push({ x, y, r: 26 + nx() * 6, layer: k % 2 ? 0 : 1 });
  }
  // Blossom spilling over the body's shoulders and trailing down its left side.
  clusters.push(
    { x: 152, y: 342, r: 30, layer: 2 }, { x: 200, y: 336, r: 22, layer: 0 },
    { x: 402, y: 336, r: 22, layer: 1 }, { x: 450, y: 344, r: 28, layer: 2 },
    { x: 142, y: 388, r: 20, layer: 1 }, { x: 138, y: 428, r: 16, layer: 2 }, { x: 140, y: 462, r: 12, layer: 1 },
    { x: 460, y: 384, r: 16, layer: 1 }
  );
  // The vine the blossoms hang from, following the shackle with a little wobble.
  let [px, py] = at(180, R + 2);
  let vine = 'M' + f(px) + ' ' + f(py);
  for (let deg = 194; deg <= 360; deg += 14) {
    const [x, y] = at(deg, R + 2 + (nx() - 0.5) * 12);
    const [mx, my] = at(deg - 7, R + 12 + (nx() - 0.5) * 14);
    vine += 'Q' + f(mx) + ' ' + f(my) + ' ' + f(x) + ' ' + f(y);
  }
  vine += 'M152 346Q140 380 141 410Q140 440 140 466';
  LOCK = Object.assign({ vine }, paint(clusters));
  return LOCK;
}

function lockMarkup() {
  const L = buildLock();
  const shackle = 'M190 366V330A110 110 0 0 1 410 330V366';
  const bloom = (part) => `<g class="jt-bough" style="transform-origin: 300px 230px; animation-duration: 6.4s; animation-delay: -2s">${part}</g>`;
  return `
<div class="jt-flip">
  <div class="jt-layer" data-layer="back" aria-hidden="true">
    <svg viewBox="0 0 600 640">
      <ellipse cx="300" cy="608" rx="300" ry="24" fill="#15111F"></ellipse>
      <ellipse cx="300" cy="606" rx="236" ry="15" fill="#09070F" fill-opacity="0.8"></ellipse>
      <g data-carpet></g>
      <g class="jt-tree jt-still">${bloom(paths(L.back))}</g>
    </svg>
  </div>
  <div class="jt-layer" data-layer="main">
    <button type="button" class="jt-btn" aria-label="Shake the jacaranda lock">
      <svg viewBox="0 0 600 640" aria-hidden="true">
        <g>
          <ellipse cx="300" cy="603" rx="176" ry="11" fill="#15111F"></ellipse>
          <ellipse cx="300" cy="602" rx="140" ry="6" fill="#09070F" fill-opacity="0.7"></ellipse>
          ${paths(baseCarpet())}
        </g>
        <g class="jt-tree jt-still">
          <path d="${shackle}" fill="none" stroke="#3A3042" stroke-width="40"></path>
          <path d="${shackle}" fill="none" stroke="#241C2E" stroke-width="10" stroke-opacity="0.7" transform="translate(11 0)"></path>
          <path d="${shackle}" fill="none" stroke="#5A4D6E" stroke-width="7" stroke-opacity="0.8" transform="translate(-11 0)"></path>
          <rect x="136" y="342" width="328" height="256" rx="48" fill="#3E3350"></rect>
          <rect x="136" y="342" width="328" height="256" rx="48" fill="none" stroke="#2A2236" stroke-width="3"></rect>
          <rect x="160" y="366" width="280" height="208" rx="34" fill="#463B59" fill-opacity="0.55"></rect>
          <path d="M158 386V556" fill="none" stroke="#5A4D6E" stroke-width="7" stroke-opacity="0.7" stroke-linecap="round"></path>
          <path d="M444 392V560" fill="none" stroke="#241C2E" stroke-width="9" stroke-opacity="0.6" stroke-linecap="round"></path>
          <circle cx="300" cy="458" r="24" fill="#1E1828"></circle>
          <path d="M289 472L282 536Q281 546 291 546H309Q319 546 318 536L311 472Z" fill="#1E1828"></path>
          ${bloom(`<path d="${L.vine}" fill="none" stroke="#57496B" stroke-width="3.2" stroke-linecap="round"></path>` + paths(L.mid) + paths(L.hiMid))}
        </g>
      </svg>
    </button>
  </div>
  <div class="jt-layer" data-layer="front" aria-hidden="true">
    <svg viewBox="0 0 600 640"><g class="jt-tree jt-still">${bloom(paths(L.front) + paths(L.hiFront))}</g></svg>
  </div>
  <div class="jt-petals" data-layer="petals" aria-hidden="true">
    <div data-falling></div>
    <div data-burst></div>
  </div>
</div>`;
}

// ---------- Element ----------

class JacarandaTree extends HTMLElement {
  static get observedAttributes() { return ['pulse', 'mirror', 'flat', 'petal-count']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.fallen = 0;
    this.timers = [];
    this.raf = 0;
    this.cur = 0;
    this.target = 0;
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onScroll = () => {
      const r = this.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      this.target = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
      this.kick();
    };
    this.tick = () => {
      this.raf = 0;
      this.cur += (this.target - this.cur) * 0.1;
      this.applyParallax();
      if (Math.abs(this.target - this.cur) > 0.002) this.kick();
    };
  }

  get pulse() { return this.getAttribute('pulse'); }
  set pulse(v) { this.setAttribute('pulse', String(v)); }

  connectedCallback() {
    if (!this.root) this.render();
    this.syncParallax();
  }

  disconnectedCallback() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.stopParallax();
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this.root || oldV === newV) return;
    if (name === 'pulse') { if (Number(newV)) this.shake(); return; }
    if (name === 'petal-count') { this.renderFalling(); return; }
    this.applyModes();
    this.syncParallax();
  }

  markup() { return treeMarkup(); }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><div class="jt-root">${this.markup()}</div>`;
    this.root = this.shadowRoot.querySelector('.jt-root');
    this.layers = {};
    this.shadowRoot.querySelectorAll('[data-layer]').forEach((el) => { this.layers[el.dataset.layer] = el; });
    this.trees = [...this.shadowRoot.querySelectorAll('.jt-tree')];
    this.carpetEl = this.shadowRoot.querySelector('[data-carpet]');
    this.fallingEl = this.shadowRoot.querySelector('[data-falling]');
    this.burstEl = this.shadowRoot.querySelector('[data-burst]');
    this.shadowRoot.querySelector('.jt-btn').addEventListener('click', () => this.shake());
    // Blossoms in front of the button take taps too.
    this.layers.front.addEventListener('click', () => this.shake());
    this.applyModes();
    this.renderCarpet();
    this.renderFalling();
  }

  applyModes() {
    this.root.classList.toggle('jt-flat', this.hasAttribute('flat'));
    this.root.classList.toggle('jt-mirror', this.hasAttribute('mirror'));
  }

  renderCarpet() { this.carpetEl.innerHTML = paths(carpet(60 + this.fallen * 12)); }

  renderFalling() {
    const n = parseInt(this.getAttribute('petal-count'), 10);
    this.fallingEl.innerHTML = fallingPetals(Number.isFinite(n) ? clamp(n, 0, 60) : 26);
  }

  shake() {
    if (!this.root) return;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.fallen = Math.min(this.fallen + 1, 8);
    this.renderCarpet();
    this.trees.forEach((g) => g.classList.remove('jt-shake'));
    this.burstEl.innerHTML = '';
    this.timers.push(setTimeout(() => {
      this.trees.forEach((g) => g.classList.add('jt-shake'));
      if (!this.reduced) this.burstEl.innerHTML = burstPetals();
    }, 30));
    this.timers.push(setTimeout(() => this.trees.forEach((g) => g.classList.remove('jt-shake')), 1000));
    this.timers.push(setTimeout(() => { this.burstEl.innerHTML = ''; }, 5200));
  }

  // Scroll parallax on the depth layers (3D mode only).
  syncParallax() {
    const want = this.isConnected && !this.reduced && !this.hasAttribute('flat');
    if (want && !this.parallaxOn) {
      this.parallaxOn = true;
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll);
      this.onScroll();
    } else if (!want && this.parallaxOn) {
      this.stopParallax();
      Object.values(this.layers).forEach((el) => { el.style.transform = ''; });
    }
  }

  stopParallax() {
    this.parallaxOn = false;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  kick() { if (!this.raf) this.raf = requestAnimationFrame(this.tick); }

  applyParallax() {
    const s = this.cur, L = this.layers;
    const tr = (dy, dz) => 'translate3d(0px, ' + dy.toFixed(1) + 'px, ' + dz + 'px)';
    L.back.style.transform = tr(s * 12, -40);
    L.main.style.transform = tr(0, 0);
    L.front.style.transform = tr(-s * 10, 30);
    L.petals.style.transform = tr(-s * 18, 50);
  }
}

if (!customElements.get('jacaranda-tree')) customElements.define('jacaranda-tree', JacarandaTree);

class JacarandaLock extends JacarandaTree {
  markup() { return lockMarkup(); }
}

if (!customElements.get('jacaranda-lock')) customElements.define('jacaranda-lock', JacarandaLock);
