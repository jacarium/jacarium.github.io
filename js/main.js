const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Screenshot carousels ----------

// Returns a controller; an inactive carousel (the frame behind) doesn't auto-rotate.
function initCarousel(root) {
  const slides = [...root.querySelectorAll('.slide')].slice(0, 8);
  const n = slides.length;
  if (!n) return null;
  const dotsEl = root.querySelector('.dots');
  const captionEl = root.querySelector('.frame-caption');
  const interval = Number(root.dataset.interval ?? 5);
  const label = root.dataset.label || 'screenshot';
  let cur = 0, paused = false, active = true, timer = 0;

  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dot';
    b.setAttribute('aria-label', `Show ${label} ${i + 1} of ${n}`);
    b.appendChild(document.createElement('span'));
    b.addEventListener('click', () => go(i, i > cur ? 1 : -1));
    dotsEl.appendChild(b);
    return b;
  });

  let leaveTimer = 0;

  function render() {
    slides.forEach((el, i) => {
      el.setAttribute('aria-hidden', i === cur ? 'false' : 'true');
      dots[i].setAttribute('aria-current', i === cur ? 'true' : 'false');
    });
    const s = slides[cur];
    const cap = (s.dataset.caption || s.querySelector('img')?.alt || '').trim();
    captionEl.textContent = cap || `[Caption for ${label} ${cur + 1}]`;
  }

  // dir: 1 = forward (enters from the right), -1 = back (enters from the left).
  function go(i, dir) {
    const next = (i + n) % n;
    if (next === cur) return;
    const prev = slides[cur], el = slides[next];
    cur = next;
    clearTimeout(leaveTimer);
    slides.forEach((s) => { if (s !== prev && s !== el) s.classList.remove('is-current', 'is-leaving'); });
    prev.classList.remove('is-current');
    prev.classList.add('is-leaving');
    // Place the incoming slide at its start position without animating, then let it glide in.
    el.classList.remove('is-leaving');
    el.style.transition = 'none';
    el.style.transform = `translate3d(${dir * 6}%, 0, 0) scale(0.98)`;
    void el.offsetWidth;
    el.style.transition = '';
    el.style.transform = '';
    el.classList.add('is-current');
    leaveTimer = setTimeout(() => prev.classList.remove('is-leaving'), 750);
    render();
  }

  function schedule() {
    clearInterval(timer);
    timer = 0;
    if (reduced || paused || !active || interval <= 0 || n < 2) return;
    timer = setInterval(() => go(cur + 1, 1), interval * 1000);
  }

  root.querySelector('[data-prev]').addEventListener('click', () => go(cur - 1, -1));
  root.querySelector('[data-next]').addEventListener('click', () => go(cur + 1, 1));
  const pause = (p) => () => { paused = p; schedule(); };
  root.addEventListener('pointerenter', pause(true));
  root.addEventListener('pointerleave', pause(false));
  root.addEventListener('focusin', pause(true));
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) pause(false)(); });

  slides[cur].classList.add('is-current');
  render();
  schedule();
  return { setActive(on) { active = on; schedule(); } };
}

// ---------- Desktop / phone frames: click the one behind to bring it forward ----------

function initDeviceStack(stack) {
  const devices = [...stack.querySelectorAll('[data-device]')].map((el) => ({
    el,
    name: el.dataset.device,
    body: el.querySelector('.device-body'),
    carousel: initCarousel(el)
  }));

  function setFront(name) {
    stack.dataset.front = name;
    devices.forEach((d) => {
      const front = d.name === name;
      d.el.toggleAttribute('data-back', !front);
      d.body.inert = !front;
      d.carousel?.setActive(front);
    });
  }

  devices.forEach((d) => {
    d.el.querySelector('.device-switch').addEventListener('click', (e) => {
      setFront(d.name);
      // Keyboard users keep their place; mouse and touch users don't get a focus ring.
      if (e.detail === 0) d.el.querySelector('[data-next]')?.focus({ preventScroll: true });
    });
  });

  // With only one frame (e.g. the phone figure was removed), it stays in front.
  setFront(devices.some((d) => d.name === stack.dataset.front) ? stack.dataset.front : devices[0].name);
}

// ---------- Features accordion (one card open at a time) ----------

function initAccordion(root) {
  const cards = [...root.querySelectorAll('.acc-card')];
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach((c) => {
        const open = c === card;
        c.setAttribute('aria-expanded', String(open));
        document.getElementById(c.getAttribute('aria-controls')).hidden = !open;
      });
    });
  });
}

// ---------- Desktop download: pick a system, get that file from the latest release ----------

const RELEASES_API = 'https://api.github.com/repos/jacarium/jacarium/releases/latest';

// Release file names contain the version, so each option matches its file by the ending.
const MAC_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="2"></rect><path d="M2 19h20"></path></svg>';
const LINUX_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 9l3 3-3 3M12 15h5"></path></svg>';
const CHECK_ICON = '<svg class="picker-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>';
const CHEVRON_ICON = '<svg class="picker-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';

// An option with href installs from a repository: the button opens that page instead of downloading a file.
const PLATFORMS = [
  { value: 'mac-arm64', group: 'macOS', name: 'Apple silicon', hint: '.dmg · M1 and later', note: 'mac', icon: MAC_ICON, pattern: /-arm64\.dmg$/ },
  { value: 'linux-dnf', group: 'Fedora / RHEL (dnf)', name: 'COPR repository', hint: 'x86_64 and ARM64', note: 'dnf', icon: LINUX_ICON, href: 'https://copr.fedorainfracloud.org/coprs/robincernin/jacarium/', label: 'COPR project' },
  { value: 'linux-x64-appimage', group: 'Linux x64', name: 'AppImage', hint: 'Any distribution', note: 'linux', icon: LINUX_ICON, pattern: /^(?!.*arm64).*\.AppImage$/ },
  { value: 'linux-x64-deb', group: 'Linux x64', name: '.deb', hint: 'Debian, Ubuntu', note: 'linux', icon: LINUX_ICON, pattern: /_amd64\.deb$/ },
  { value: 'linux-x64-rpm', group: 'Linux x64', name: '.rpm', hint: 'Fedora, RHEL', note: 'linux', icon: LINUX_ICON, pattern: /\.x86_64\.rpm$/ },
  { value: 'linux-arm64-appimage', group: 'Linux ARM64', name: 'AppImage', hint: 'Any distribution', note: 'linux', icon: LINUX_ICON, pattern: /-arm64\.AppImage$/ },
  { value: 'linux-arm64-deb', group: 'Linux ARM64', name: '.deb', hint: 'Debian, Ubuntu', note: 'linux', icon: LINUX_ICON, pattern: /_arm64\.deb$/ },
  { value: 'linux-arm64-rpm', group: 'Linux ARM64', name: '.rpm', hint: 'Fedora, RHEL', note: 'linux', icon: LINUX_ICON, pattern: /\.aarch64\.rpm$/ }
];

// A best guess only: browsers can't reliably tell an Intel Mac from Apple silicon, or ARM Linux from x64.
function guessPlatform() {
  const ua = navigator.userAgent;
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  if (/Mac/i.test(platform) && !/iPhone|iPad/i.test(ua)) return 'mac-arm64';
  if (/Linux/i.test(platform) && !/Android/i.test(ua)) {
    const arch = /aarch64|arm64/i.test(platform + ua) ? 'arm64' : 'x64';
    if (/Fedora|Red Hat/i.test(ua)) return 'linux-dnf';
    const pkg = /Ubuntu|Debian/i.test(ua) ? 'deb' : 'appimage';
    return `linux-${arch}-${pkg}`;
  }
  return null;
}

// Cached for 5 minutes so moving around the page doesn't use up GitHub's rate limit, while a new release still shows up soon.
async function latestRelease() {
  try {
    const cached = JSON.parse(sessionStorage.getItem('jacarium-release') || 'null');
    if (cached && Date.now() - cached.at < 300e3) return cached.release;
  } catch {}
  const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  const release = { tag: data.tag_name, assets: data.assets.map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size })) };
  try { sessionStorage.setItem('jacarium-release', JSON.stringify({ at: Date.now(), release })); } catch {}
  return release;
}

// A button and listbox instead of a native <select>, whose option list can't be styled on macOS.
function buildPicker(root, onChange) {
  const picker = document.createElement('div');
  picker.className = 'picker';
  picker.innerHTML = `
    <button type="button" class="picker-btn" aria-haspopup="listbox" aria-expanded="false">
      <span class="picker-icon"></span>
      <span class="picker-text"><span class="picker-title"></span><span class="picker-sub"></span></span>
      ${CHEVRON_ICON}
    </button>
    <ul class="picker-list" role="listbox" tabindex="-1" aria-label="Your system" hidden></ul>`;
  const btn = picker.querySelector('.picker-btn');
  const list = picker.querySelector('.picker-list');

  let lastGroup = '';
  const opts = PLATFORMS.map((p, i) => {
    if (p.group !== lastGroup) {
      lastGroup = p.group;
      const g = document.createElement('li');
      g.className = 'picker-group';
      g.setAttribute('role', 'presentation');
      g.textContent = p.group;
      list.appendChild(g);
    }
    const li = document.createElement('li');
    li.className = 'picker-opt';
    li.id = `dl-opt-${i}`;
    li.setAttribute('role', 'option');
    li.innerHTML = `<span class="picker-opt-name"></span><span class="picker-opt-hint"></span>${CHECK_ICON}`;
    li.querySelector('.picker-opt-name').textContent = p.name;
    li.querySelector('.picker-opt-hint').textContent = p.hint;
    li.addEventListener('click', () => { select(i); close(true); });
    li.addEventListener('pointermove', () => setActive(i));
    list.appendChild(li);
    return li;
  });

  let cur = 0, active = 0;

  function setActive(i) {
    active = (i + opts.length) % opts.length;
    opts.forEach((o, j) => o.classList.toggle('is-active', j === active));
    list.setAttribute('aria-activedescendant', opts[active].id);
    opts[active].scrollIntoView({ block: 'nearest' });
  }

  function select(i) {
    cur = i;
    const p = PLATFORMS[i];
    opts.forEach((o, j) => o.setAttribute('aria-selected', String(j === i)));
    btn.querySelector('.picker-icon').innerHTML = p.icon;
    btn.querySelector('.picker-title').textContent = p.group;
    btn.querySelector('.picker-sub').textContent = `${p.name} · ${p.hint}`;
    btn.setAttribute('aria-label', `Your system: ${p.group}, ${p.name}, ${p.hint}`);
    onChange(p);
  }

  function open() {
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    setActive(cur);
    list.focus({ preventScroll: true });
  }

  function close(refocus) {
    if (list.hidden) return;
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus({ preventScroll: true });
  }

  btn.addEventListener('click', () => (list.hidden ? open() : close(false)));
  btn.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); }
  });
  list.addEventListener('keydown', (e) => {
    const keys = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: opts.length - 1 };
    if (e.key in keys) { e.preventDefault(); setActive(keys[e.key]); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(active); close(true); }
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close(false);
  });
  document.addEventListener('pointerdown', (e) => { if (!picker.contains(e.target)) close(false); });

  root.prepend(picker);
  return { select(value) { select(Math.max(0, PLATFORMS.findIndex((p) => p.value === value))); } };
}

function initDownload(root) {
  const link = root.querySelector('[data-download-link]');
  const meta = root.querySelector('[data-download-meta]');
  const notes = [...document.querySelectorAll('[data-note]')];
  const fallback = link.href;
  let release = null, platform = null;

  function update() {
    notes.forEach((n) => { n.hidden = n.dataset.note !== platform.note; });
    link.textContent = platform.label || 'Download';
    const asset = platform.pattern && release?.assets.find((a) => platform.pattern.test(a.name));
    if (platform.href) {
      link.href = platform.href;
      link.target = '_blank';
      link.removeAttribute('aria-label');
      meta.textContent = '';
    } else if (asset) {
      // GitHub serves release files as attachments, so the browser saves it and stays on this page.
      link.href = asset.url;
      link.removeAttribute('target');
      link.setAttribute('aria-label', `Download ${asset.name}`);
      meta.textContent = `${release.tag} · ${asset.name} · ${Math.round(asset.size / 1048576)} MB`;
    } else {
      link.href = fallback;
      link.target = '_blank';
      link.removeAttribute('aria-label');
      meta.textContent = '';
    }
  }

  const picker = buildPicker(root, (p) => { platform = p; update(); });
  picker.select(guessPlatform() || 'mac-arm64');
  latestRelease().then((r) => { release = r; update(); }).catch(() => {});
}

// ---------- Scroll reveal; the security lock shakes once on entry ----------

function initReveal() {
  const els = [...document.querySelectorAll('.reveal')];
  const sectionArt = document.querySelector('#security jacaranda-lock');
  const onEnter = (el) => {
    el.classList.add('is-in');
    if (sectionArt && el.closest('#security')) sectionArt.pulse = Number(sectionArt.pulse || 0) + 1;
  };
  if (typeof IntersectionObserver === 'undefined') { els.forEach(onEnter); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      onEnter(e.target);
    });
  }, { threshold: 0.2 });
  els.forEach((el) => io.observe(el));
}

document.querySelectorAll('[data-device-stack]').forEach(initDeviceStack);
document.querySelectorAll('[data-carousel]:not([data-device])').forEach(initCarousel);
document.querySelectorAll('[data-accordion]').forEach(initAccordion);
document.querySelectorAll('[data-download]').forEach(initDownload);
initReveal();
