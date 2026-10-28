// Faint dot grid; dots near the pointer or finger swell and light up.
const canvas = document.getElementById("dots") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
const root = document.documentElement;

const GAP = 18;
const RADIUS = 140;
// Lit dots move at most ~13px, so this margin keeps them inside their repaint box.
const REACH = RADIUS + GAP;

type Box = { x0: number; y0: number; x1: number; y1: number };

const view = { width: 0, height: 0 };
const colors = { base: "", accent: "" };
// Offscreen until the first pointer event.
const pointer = { x: -1e4, y: -1e4 };
// Glow intensity, eased from 0 to 1 toward target.
const glow = { strength: 0, target: 0 };

// Animation bookkeeping.
let frame = 0;
let resizing = 0;
let moved = false;
let last: Box | null = null;

// Resolves a theme variable to a color the canvas understands.
function resolve(name: string) {
  canvas.style.color = `var(${name})`;
  return getComputedStyle(canvas).color;
}

function readColors() {
  colors.base = resolve("--muted");
  colors.accent = resolve("--accent");
}

// Repaints only the grid cells inside the box; edges sit on cell boundaries.
function paint({ x0, y0, x1, y1 }: Box) {
  ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
  let style = "";
  for (let y = y0 + GAP / 2; y < y1; y += GAP) {
    for (let x = x0 + GAP / 2; x < x1; x += GAP) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const d = Math.hypot(dx, dy);
      const t = Math.max(0, 1 - d / RADIUS) ** 2 * glow.strength;
      const push = d ? (t * 10) / d : 0;
      const fill = t > 0.02 ? colors.accent : colors.base;
      if (fill !== style) ctx.fillStyle = style = fill;
      ctx.globalAlpha = 0.14 + t * 0.7;
      const half = 0.9 + t * 2;
      ctx.fillRect(x + dx * push - half, y + dy * push - half, half * 2, half * 2);
    }
  }
}

function snap(v: number, max: number, round: (n: number) => number) {
  return Math.min(Math.max(round(v / GAP) * GAP, 0), max);
}

function around(x: number, y: number): Box {
  const maxX = Math.ceil(view.width / GAP) * GAP;
  const maxY = Math.ceil(view.height / GAP) * GAP;
  return {
    x0: snap(x - REACH, maxX, Math.floor),
    y0: snap(y - REACH, maxY, Math.floor),
    x1: snap(x + REACH, maxX, Math.ceil),
    y1: snap(y + REACH, maxY, Math.ceil),
  };
}

function full(): Box {
  return { x0: 0, y0: 0, x1: view.width, y1: view.height };
}

function tick() {
  glow.strength += (glow.target - glow.strength) * 0.14;
  const settled = Math.abs(glow.target - glow.strength) < 0.004;
  if (settled) glow.strength = glow.target;

  // Repaint where the lit dots were last frame and where they are now.
  const box = around(pointer.x, pointer.y);
  paint(
    last
      ? {
          x0: Math.min(box.x0, last.x0),
          y0: Math.min(box.y0, last.y0),
          x1: Math.max(box.x1, last.x1),
          y1: Math.max(box.y1, last.y1),
        }
      : box,
  );
  last = box;

  frame = settled && !moved ? 0 : requestAnimationFrame(tick);
  moved = false;
}

function wake() {
  if (!frame) frame = requestAnimationFrame(tick);
}

function aim(x: number, y: number) {
  pointer.x = x;
  pointer.y = y;
  glow.target = 1;
  moved = true;
  wake();
}

function release() {
  glow.target = 0;
  wake();
}

// Reallocating clears the bitmap, so skip it when a phone's address bar only
// shrinks the viewport; the fixed canvas just overhangs the bottom edge.
function resize() {
  if (innerWidth === view.width && innerHeight <= view.height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  view.width = innerWidth;
  view.height = innerHeight;
  canvas.width = view.width * dpr;
  canvas.height = view.height * dpr;
  canvas.style.width = `${view.width}px`;
  canvas.style.height = `${view.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  last = null;
  paint(full());
}

function queueResize() {
  if (!resizing)
    resizing = requestAnimationFrame(() => {
      resizing = 0;
      resize();
    });
}

function recolor() {
  readColors();
  paint(full());
}

readColors();
resize();
addEventListener("resize", queueResize);
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
