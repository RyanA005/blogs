/** Limit concurrent CA loops so the blog does not exhaust WebGL contexts. */
const MAX_ACTIVE = 3;
const HERO_ID = "blog-hero";
const sims = new Map();

function rebalance() {
  const pageUp = !document.hidden;
  const allowed = new Set();
  const hero = sims.get(HERO_ID);
  if (hero?.want && pageUp) allowed.add(HERO_ID);

  const ranked = [...sims.entries()]
    .filter(([id, s]) => id !== HERO_ID && s.want && pageUp)
    .sort((a, b) => b[1].ratio - a[1].ratio);
  for (const [id] of ranked) {
    if (allowed.size >= MAX_ACTIVE) break;
    allowed.add(id);
  }

  for (const [id, sim] of sims) {
    sim.run(allowed.has(id));
  }
}

export function registerSim(id, run) {
  sims.set(id, { want: false, ratio: 0, run });
  return {
    setWant(on) {
      sims.get(id).want = on;
      rebalance();
    },
    setRatio(ratio) {
      sims.get(id).ratio = ratio;
      rebalance();
    },
    dispose() {
      sims.delete(id);
      rebalance();
    },
  };
}

document.addEventListener("visibilitychange", rebalance);

export function bindVisibility(el, governor) {
  const io = new IntersectionObserver(
    ([entry]) => {
      governor.setRatio(entry.isIntersecting ? entry.intersectionRatio : 0);
      governor.setWant(entry.isIntersecting);
    },
    { rootMargin: "80px 0px", threshold: [0, 0.08, 0.2] },
  );
  io.observe(el);
  return () => io.disconnect();
}

export function bindWebGL(canvas, onLost) {
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      onLost();
    },
    false,
  );
}
