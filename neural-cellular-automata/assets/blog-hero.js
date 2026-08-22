// Hero demo for growing-neural-logo.html — same runtime as iheartcomputer.club/new/.
import { createCA } from "./nca/ca.js";
import { bindVisibility, bindWebGL, registerSim } from "./sim-governor.js";

const MODEL_URL = new URL("./nca/models/logo_regenerating.json", import.meta.url);
const ZOOM = 1.28;
const SPEED = 2;
const BRUSH = 4;

async function main() {
  const canvas = document.getElementById("blog-ca-hero");
  if (!canvas) return;

  canvas.style.opacity = "0";
  canvas.style.background = "#f2f2f0";

  const payload = await fetch(MODEL_URL).then((r) => {
    if (!r.ok) throw new Error(`failed to load ${MODEL_URL}`);
    return r.json();
  });

  const layers = payload.layers || payload;
  const grid = payload.grid || [72, 70];
  const [logoW, logoH] = grid;

  const simW = logoH;
  const simH = logoW;

  const scale = Math.max(3, Math.floor(420 / logoW));
  canvas.width = simW * scale;
  canvas.height = simH * scale;

  const wrap = canvas.closest(".ca-wrap");
  if (!wrap) return;

  canvas.style.position = "absolute";
  canvas.style.left = "50%";
  canvas.style.top = "50%";
  canvas.style.width = `${(logoH / logoW) * 100}%`;
  canvas.style.height = `${(logoW / logoH) * 100}%`;
  canvas.style.maxWidth = "none";
  canvas.style.aspectRatio = "auto";
  canvas.style.imageRendering = "pixelated";
  canvas.style.transform =
    `translate(-50%, -50%) scaleX(-1) rotate(90deg) scale(${ZOOM})`;
  canvas.style.transformOrigin = "center center";

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!gl) return;

  gl.clearColor(242 / 255, 242 / 255, 240 / 255, 1);
  twgl.bindFramebufferInfo(gl);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const ca = createCA(gl, layers, [simW, simH]);

  const seedYX = payload.seed_yx || [Math.floor(logoH / 2), Math.floor(logoW / 2)];
  ca.reset = () => {
    ca.paint(0, 0, 10000, "clear");
    ca.paint(seedYX[0], seedYX[1], 1, "seed");
  };
  ca.reset();

  function canvasToGrid(clientX, clientY) {
    const rect = wrap.getBoundingClientRect();
    const vx = (clientX - rect.left) / rect.width;
    const vy = (clientY - rect.top) / rect.height;
    const cx = (vx - 0.5) / ZOOM + 0.5;
    const cy = (vy - 0.5) / ZOOM + 0.5;
    const simX = cy * simW;
    const simY = cx * simH;
    return [simX, simY];
  }

  function damageAt(clientX, clientY) {
    const [x, y] = canvasToGrid(clientX, clientY);
    ca.paint(x, y, BRUSH, "clear");
  }

  let drawing = false;
  wrap.addEventListener("pointerdown", (e) => {
    drawing = true;
    wrap.setPointerCapture(e.pointerId);
    damageAt(e.clientX, e.clientY);
  });
  wrap.addEventListener("pointermove", (e) => {
    if (drawing) damageAt(e.clientX, e.clientY);
  });
  wrap.addEventListener("pointerup", () => {
    drawing = false;
  });
  wrap.addEventListener("pointercancel", () => {
    drawing = false;
  });
  wrap.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const [x, y] = canvasToGrid(e.clientX, e.clientY);
    ca.paint(x, y, 1, "seed");
  });

  let revealed = false;
  let active = false;
  let raf = 0;

  function drawFrame() {
    if (active) {
      for (let i = 0; i < SPEED; i++) ca.step();
    }
    twgl.bindFramebufferInfo(gl);
    gl.clear(gl.COLOR_BUFFER_BIT);
    ca.draw();
    if (!revealed) {
      revealed = true;
      canvas.style.opacity = "1";
    }
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    drawFrame();
  }

  const governor = registerSim("blog-hero", (on) => {
    active = on;
  });
  const stopObs = bindVisibility(wrap, governor);

  bindWebGL(canvas, () => {
    active = false;
    governor.dispose();
    stopObs();
    canvas.style.opacity = "0";
  });

  raf = requestAnimationFrame(frame);
}

main().catch((err) => {
  console.error(err);
});
