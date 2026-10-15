const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Screenshot carousels ----------

// Returns a controller; an inactive carousel (the frame behind) doesn't auto-rotate.
function initCarousel(root) {
  const slides = [...root.querySelectorAll('.slide')].slice(0, 6);
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

// Release file names contain the version, so each option matches by its ending.
const ASSET_PATTERNS = {
  'mac-arm64': /-arm64\.dmg$/,
  'linux-x64-appimage': /^(?!.*arm64).*\.AppImage$/,
  'linux-x64-deb': /_amd64\.deb$/,
  'linux-x64-rpm': /\.x86_64\.rpm$/,
  'linux-arm64-appimage': /-arm64\.AppImage$/,
  'linux-arm64-deb': /_arm64\.deb$/,
  'linux-arm64-rpm': /\.aarch64\.rpm$/
};

// A best guess only: browsers can't reliably tell an Intel Mac from Apple silicon, or ARM Linux from x64.
function guessPlatform() {
  const ua = navigator.userAgent;
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  if (/Mac/i.test(platform) && !/iPhone|iPad/i.test(ua)) return 'mac-arm64';
  if (/Linux/i.test(platform) && !/Android/i.test(ua)) {
    const arch = /aarch64|arm64/i.test(platform + ua) ? 'arm64' : 'x64';
    const pkg = /Ubuntu|Debian/i.test(ua) ? 'deb' : /Fedora|Red Hat/i.test(ua) ? 'rpm' : 'appimage';
    return `linux-${arch}-${pkg}`;
  }
  return null;
}

// Cached for the session so moving around the page doesn't use up GitHub's rate limit.
async function latestRelease() {
  try {
    const cached = JSON.parse(sessionStorage.getItem('jacarium-release') || 'null');
    if (cached && Date.now() - cached.at < 3600e3) return cached.release;
  } catch {}
  const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  const release = { tag: data.tag_name, assets: data.assets.map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size })) };
  try { sessionStorage.setItem('jacarium-release', JSON.stringify({ at: Date.now(), release })); } catch {}
  return release;
}

function initDownload(root) {
  const select = root.querySelector('select');
  const link = root.querySelector('[data-download-link]');
  const meta = root.querySelector('[data-download-meta]');
  const fallback = link.href;
  let release = null;

  const guess = guessPlatform();
  if (guess) select.value = guess;

  function update() {
    const asset = release?.assets.find((a) => ASSET_PATTERNS[select.value]?.test(a.name));
    if (asset) {
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

  select.addEventListener('change', update);
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
