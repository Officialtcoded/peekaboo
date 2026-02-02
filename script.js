/* Romantic Valentine page interactions:
 * - floating petals/hearts canvas
 * - reveal-on-scroll fade-ins
 * - gallery arrows
 * - music toggle (user-gesture required)
 * - runaway "No" button (desktop + mobile)
 * - "Yes" celebration burst + message + music
 */

const $ = (sel) => document.querySelector(sel);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  );
}

// -----------------------------
// Reveal on scroll
// -----------------------------
function initReveal() {
  const els = Array.from(document.querySelectorAll(".reveal"));
  if (!els.length) return;

  if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => io.observe(el));
}

// -----------------------------
// Background petals/hearts canvas
// -----------------------------
function initPetals() {
  const canvas = $("#petals");
  if (!canvas || prefersReducedMotion()) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  const colors = [
    "rgba(242,179,198,0.70)", // soft pink
    "rgba(200,90,122,0.65)", // rose
    "rgba(216,176,140,0.55)", // rose gold
    "rgba(255,243,234,0.40)", // cream
  ];

  const shapes = ["petal", "heart"];

  const COUNT = clamp(Math.floor((w * h) / 35000), 18, 46);
  const particles = Array.from({ length: COUNT }, () => {
    const shape = shapes[Math.random() < 0.72 ? 0 : 1];
    return {
      x: rand(0, w),
      y: rand(-h, h),
      r: rand(6, 14),
      vx: rand(-0.18, 0.18),
      vy: rand(0.25, 0.8),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.012, 0.012),
      wob: rand(0, Math.PI * 2),
      wobSpeed: rand(0.006, 0.016),
      color: colors[Math.floor(rand(0, colors.length))],
      shape,
    };
  });

  function drawHeart(x, y, size, rot, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(size / 20, size / 20);

    ctx.beginPath();
    // classic bezier heart
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-10, -4, -18, 6, 0, 18);
    ctx.bezierCurveTo(18, 6, 10, -4, 0, 6);
    ctx.closePath();

    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  function drawPetal(x, y, size, rot, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    // teardrop / petal shape
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.95, -size * 0.1, 0, size);
    ctx.quadraticCurveTo(-size * 0.95, -size * 0.1, 0, -size);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  let last = performance.now();

  function tick(now) {
    const dt = clamp((now - last) / 16.6667, 0.25, 2.0);
    last = now;

    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.wob += p.wobSpeed * dt;
      p.x += (p.vx + Math.sin(p.wob) * 0.22) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      // wrap
      if (p.y > h + 24) {
        p.y = -24;
        p.x = rand(0, w);
      }
      if (p.x < -24) p.x = w + 24;
      if (p.x > w + 24) p.x = -24;

      // subtle glow
      ctx.shadowColor = "rgba(242,179,198,0.12)";
      ctx.shadowBlur = 14;

      if (p.shape === "heart") drawHeart(p.x, p.y, p.r * 1.3, p.rot, p.color);
      else drawPetal(p.x, p.y, p.r, p.rot, p.color);
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// -----------------------------
// Carousel arrows (optional)
// -----------------------------
function initCarousel() {
  const track = $("#carouselTrack");
  const prev = $("#prevBtn");
  const next = $("#nextBtn");
  if (!track || !prev || !next) return;

  function scrollByItem(dir) {
    const first = track.querySelector(".carousel__item");
    const step = first ? first.getBoundingClientRect().width + 12 : 280;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  prev.addEventListener("click", () => scrollByItem(-1));
  next.addEventListener("click", () => scrollByItem(1));
}

// -----------------------------
// Music toggle
// -----------------------------
function initMusic() {
  const audio = $("#bgm");
  const toggle = $("#musicToggle");
  if (!audio || !toggle) return;

  audio.volume = 0.4;

  function updateLabel() {
    const playing = !audio.paused;
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.querySelector(".musicToggle__text").textContent = playing
      ? "Pause our song"
      : "Play our song";
  }

  toggle.addEventListener("click", () => {
    if (audio.paused) {
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(updateLabel).catch(() => {
          // ignore – some browsers may still block programmatic play
        });
      } else {
        updateLabel();
      }
    } else {
      audio.pause();
      updateLabel();
    }
  });

  // Dedicated intro overlay button that both starts the music
  // and then gracefully fades away.
  const introOverlay = $("#introOverlay");
  const introPlay = $("#introPlay");
  if (introOverlay && introPlay) {
    const trigger = () => {
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(updateLabel).catch(() => {
          // even if play fails, still close the overlay
        });
      } else {
        updateLabel();
      }
      introOverlay.classList.add("introOverlay--hide");
      window.setTimeout(() => {
        introOverlay.remove();
      }, 450);
    };

    introPlay.addEventListener("click", trigger);
    introPlay.addEventListener("touchstart", trigger);
  }

  return {
    ensurePlaying: () => {
      if (!audio.paused) return;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(updateLabel).catch(() => {});
      } else {
        updateLabel();
      }
    },
  };
}

// -----------------------------
// Runaway "No" button (desktop + mobile)
// -----------------------------
function initRunawayNo() {
  const noBtn = $("#noBtn");
  const ctaRow = $("#ctaRow");
  const panel = document.querySelector(".question__panel");
  if (!noBtn || !ctaRow) return;

  // We "teleport" the button within the viewport while keeping it reasonably near the question panel.
  // Using fixed positioning prevents layout jumps and works for both mouse and touch proximity.
  let isArmed = false;
  let movedRecently = false;

  const safePadding = 12;

  function getNoRect() {
    return noBtn.getBoundingClientRect();
  }

  function distanceToRect(px, py, rect) {
    const dx =
      px < rect.left ? rect.left - px : px > rect.right ? px - rect.right : 0;
    const dy =
      py < rect.top ? rect.top - py : py > rect.bottom ? py - rect.bottom : 0;
    return Math.hypot(dx, dy);
  }

  function teleportAway(fromX, fromY) {
    if (!isArmed || movedRecently) return;

    const rect = getNoRect();
    const bw = rect.width;
    const bh = rect.height;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Favor staying near the question section (intimate), but still dodgy.
    const anchorRect = ctaRow.getBoundingClientRect();
    const centerX = anchorRect.left + anchorRect.width / 2;
    const centerY = anchorRect.top + anchorRect.height / 2;

    // Candidate positions (try a few randoms and choose the farthest from the pointer)
    let best = null;
    let bestScore = -1;

    for (let i = 0; i < 10; i++) {
      const spreadX = clamp(vw * 0.38, 180, 420);
      const spreadY = clamp(vh * 0.3, 160, 360);

      let x = centerX + rand(-spreadX, spreadX);
      let y = centerY + rand(-spreadY, spreadY);

      x = clamp(x, safePadding + bw / 2, vw - safePadding - bw / 2);
      y = clamp(y, safePadding + bh / 2, vh - safePadding - bh / 2);

      const score = Math.hypot(x - fromX, y - fromY);
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }

    if (!best) return;

    noBtn.style.position = "fixed";
    noBtn.style.left = `${best.x}px`;
    noBtn.style.top = `${best.y}px`;
    noBtn.style.transform = "translate(-50%, -50%)";
    noBtn.style.zIndex = "30";

    movedRecently = true;
    window.setTimeout(() => {
      movedRecently = false;
    }, 280);
  }

  function maybeRun(e) {
    if (!isArmed) return;
    const rect = getNoRect();
    const x = e.clientX;
    const y = e.clientY;
    const dist = distanceToRect(x, y, rect);
    const threshold = 90; // px
    if (dist < threshold) teleportAway(x, y);
  }

  // Desktop mouse proximity
  window.addEventListener("mousemove", maybeRun, { passive: true });

  // Touch proximity (finger approach)
  window.addEventListener(
    "touchmove",
    (ev) => {
      const t = ev.touches?.[0];
      if (!t) return;
      maybeRun({ clientX: t.clientX, clientY: t.clientY });
    },
    { passive: true }
  );

  // Only arm the runaway behavior once the pointer actually
  // enters the question panel, so it doesn't disappear randomly.
  const arm = () => {
    isArmed = true;
    if (panel) {
      panel.removeEventListener("pointerenter", arm);
      panel.removeEventListener("touchstart", arm);
    }
  };
  if (panel) {
    panel.addEventListener("pointerenter", arm, { passive: true });
    panel.addEventListener("touchstart", arm, { passive: true });
  }

  // Clicking "No" should also dodge
  noBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    const rect = getNoRect();
    teleportAway(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  // Reset the "No" button if viewport changes a lot (rotation)
  window.addEventListener(
    "resize",
    () => {
      noBtn.style.position = "";
      noBtn.style.left = "";
      noBtn.style.top = "";
      noBtn.style.transform = "";
      noBtn.style.zIndex = "";
    },
    { passive: true }
  );

  return {
    disarm: () => {
      isArmed = false;
      noBtn.style.position = "";
      noBtn.style.left = "";
      noBtn.style.top = "";
      noBtn.style.transform = "";
      noBtn.style.zIndex = "";
    },
  };
}

// -----------------------------
// "Yes" celebration
// -----------------------------
function initYesCelebration({ music }) {
  const yesBtn = $("#yesBtn");
  const noBtn = $("#noBtn");
  const final = $("#final");
  const celebrate = $("#celebrate");
  if (!yesBtn || !final || !celebrate) return;

  function heartSvgData(fill) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}"><path d="M12 21s-7.2-4.7-10-9.3C-0.4 7.5 2.2 3 6.8 3c2.2 0 3.8 1.1 5.2 2.6C13.4 4.1 15 3 17.2 3c4.6 0 7.2 4.5 4.8 8.7C19.2 16.3 12 21 12 21z"/></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  const palette = ["#f2b3c6", "#c85a7a", "#d8b08c", "#fff3ea"];

  function burstAt(x, y) {
    const count = prefersReducedMotion() ? 12 : 26;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("img");
      el.className = "burstHeart";
      el.src = heartSvgData(palette[Math.floor(rand(0, palette.length))]);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.setProperty("--dx", `${rand(-220, 220)}px`);
      el.style.setProperty("--dy", `${rand(-260, -40)}px`);
      el.style.setProperty("--rot", `${rand(-40, 40)}deg`);
      el.style.animationDelay = `${rand(0, 140)}ms`;
      el.style.width = `${rand(14, 22)}px`;
      el.style.height = el.style.width;
      celebrate.appendChild(el);

      window.setTimeout(() => el.remove(), 1250);
    }
  }

  yesBtn.addEventListener("click", async () => {
    const rect = yesBtn.getBoundingClientRect();
    burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    burstAt(window.innerWidth * 0.22, window.innerHeight * 0.3);
    burstAt(window.innerWidth * 0.78, window.innerHeight * 0.32);

    // show final message
    final.hidden = false;
    final.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    final.classList.add("is-visible");

    // freeze the "No" button and gently emphasize "Yes"
    if (noBtn) {
      noBtn.disabled = true;
      noBtn.style.opacity = "0.5";
      noBtn.style.cursor = "not-allowed";
    }
    yesBtn.style.filter = "brightness(1.08)";

    // ensure music plays (user gesture: click)
    if (music?.ensurePlaying) await music.ensurePlaying();
  });
}

// -----------------------------
// Boot
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  initReveal();
  initCarousel();
  initPetals();
  const music = initMusic();
  const runaway = initRunawayNo();
  initYesCelebration({ music, runaway });
});
