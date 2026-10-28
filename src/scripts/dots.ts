// Faint dot grid; dots near the pointer or finger swell and light up.
const canvas = document.getElementById("dots") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
const root = document.documentElement;

const GAP = 18;
const RADIUS = 140;

let width = 0;
let height = 0;
let base = "";
let accent = "";
let px = -1e4;
let py = -1e4;
let target = 0;
let strength = 0;
let frame = 0;
let moved = false;

const readColors = () => {
  const css = getComputedStyle(root);
  base = css.getPropertyValue("--muted").trim();
  accent = css.getPropertyValue("--accent").trim();
};

const draw = () => {
  ctx.clearRect(0, 0, width, height);
  for (let y = GAP / 2; y < height; y += GAP) {
    for (let x = GAP / 2; x < width; x += GAP) {
      const dx = x - px;
      const dy = y - py;
      const d = Math.hypot(dx, dy);
      const t = Math.max(0, 1 - d / RADIUS) ** 2 * strength;
      const push = d ? (t * 10) / d : 0;
      ctx.globalAlpha = 0.14 + t * 0.7;
      ctx.fillStyle = t > 0.02 ? accent : base;
      const half = 0.9 + t * 2;
      ctx.fillRect(x + dx * push - half, y + dy * push - half, half * 2, half * 2);
    }
  }
};

const tick = () => {
  strength += (target - strength) * 0.14;
  const settled = Math.abs(target - strength) < 0.004;
  if (settled) strength = target;
  draw();
  frame = settled && !moved ? 0 : requestAnimationFrame(tick);
  moved = false;
};

const aim = (x: number, y: number) => {
  px = x;
  py = y;
  target = 1;
  moved = true;
  if (!frame) frame = requestAnimationFrame(tick);
};

const release = () => {
  target = 0;
  if (!frame) frame = requestAnimationFrame(tick);
};

const resize = () => {
  const dpr = devicePixelRatio || 1;
  width = innerWidth;
  height = innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
};

const recolor = () => {
  readColors();
  draw();
};

readColors();
resize();
addEventListener("resize", resize);
new MutationObserver(recolor).observe(root, {
  attributes: true,
  attributeFilter: ["data-theme"],
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", recolor);

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch") aim(e.clientX, e.clientY);
  });
  root.addEventListener("mouseleave", release);
  const touch = (e: TouchEvent) =>
    aim(e.touches[0].clientX, e.touches[0].clientY);
  addEventListener("touchstart", touch, { passive: true });
  addEventListener("touchmove", touch, { passive: true });
  addEventListener("touchend", release);
  addEventListener("touchcancel", release);
}

export {};
