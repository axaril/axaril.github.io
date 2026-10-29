type Box = { x0: number; y0: number; x1: number; y1: number };

export type DotGridOptions = {
  gap?: number;
  radius?: number;
  // Theme variables the dots are drawn with.
  baseVar?: string;
  accentVar?: string;
};

type Ripple = { start: number; x: number; y: number };

// An occasional ripple: a ring of swaying dots spreads out from a random point.
const RIPPLE = {
  amp: 12, // px, peak push along the ring's radius
  tint: 1, // extra accent-colored opacity at peak push
  width: 70, // px, how thick the ring is
  k: (2 * Math.PI) / 56, // radians per px, crest to crest within the ring
  speed: 0.2, // px per ms the ring spreads
  duration: 3500, // ms, the ring fades out over this
  max: 6, // simultaneous ripples; the oldest is dropped past this
  pause: 2000, // ms, minimum wait (plus up to as much again) between ripples
};

// Faint dot grid; dots near the pointer or finger swell and light up.
export class DotGrid {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly root = document.documentElement;
  private readonly gap: number;
  private readonly radius: number;
  // Lit dots move at most ~13px, so this margin keeps them inside their repaint box.
  private readonly reach: number;
  private readonly baseVar: string;
  private readonly accentVar: string;

  private view = { width: 0, height: 0 };
  private colors = { base: "", accent: "" };
  // Offscreen until the first pointer event.
  private pointer = { x: -1e4, y: -1e4 };
  // Glow intensity, eased from 0 to 1 toward target.
  private glow = { strength: 0, target: 0 };

  // Animation bookkeeping.
  private frame = 0;
  private resizing = 0;
  private moved = false;
  private last: Box | null = null;
  private now = 0;
  private ripples: Ripple[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    { gap = 18, radius = 140, baseVar = "--muted", accentVar = "--accent" }: DotGridOptions = {},
  ) {
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.gap = gap;
    this.radius = radius;
    this.reach = radius + gap;
    this.baseVar = baseVar;
    this.accentVar = accentVar;

    this.readColors();
    this.resize();
    addEventListener("resize", this.queueResize);
    new MutationObserver(this.recolor).observe(this.root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", this.recolor);

    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.listen();
      setTimeout(this.startRipple, RIPPLE.pause);
    }
  }

  private listen() {
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "touch") this.aim(e.clientX, e.clientY);
    });
    addEventListener("pointerdown", (e) => this.ripplePoint(e.clientX, e.clientY));
    this.root.addEventListener("mouseleave", this.release);
    const touch = (e: TouchEvent) =>
      this.aim(e.touches[0].clientX, e.touches[0].clientY);
    addEventListener("touchstart", touch, { passive: true });
    addEventListener("touchmove", touch, { passive: true });
    addEventListener("touchend", this.release);
    addEventListener("touchcancel", this.release);
  }

  // Resolves a theme variable to a color the canvas understands.
  private resolve(name: string) {
    this.canvas.style.color = `var(${name})`;
    return getComputedStyle(this.canvas).color;
  }

  private readColors() {
    this.colors.base = this.resolve(this.baseVar);
    this.colors.accent = this.resolve(this.accentVar);
  }

  // Repaints only the grid cells inside the box; edges sit on cell boundaries.
  private paint({ x0, y0, x1, y1 }: Box) {
    const { ctx, gap, radius, pointer, glow, colors } = this;
    ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
    let style = "";
    for (let y = y0 + gap / 2; y < y1; y += gap) {
      for (let x = x0 + gap / 2; x < x1; x += gap) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d = Math.hypot(dx, dy);
        const t = Math.max(0, 1 - d / radius) ** 2 * glow.strength;
        const push = d ? (t * 10) / d : 0;
        // Dots on the ring are pushed along its radius and take on a faint accent tint.
        let rx = 0;
        let ry = 0;
        let tint = 0;
        for (const ripple of this.ripples) {
          const ox = x - ripple.x;
          const oy = y - ripple.y;
          const od = Math.hypot(ox, oy);
          const s = od ? this.push(od, ripple) : 0;
          rx += (ox / od) * s || 0;
          ry += (oy / od) * s || 0;
          tint += Math.abs(s) / RIPPLE.amp;
        }
        const fill = t > 0.02 || tint > 0.08 ? colors.accent : colors.base;
        if (fill !== style) ctx.fillStyle = style = fill;
        ctx.globalAlpha = Math.min(1, 0.28 + t * 0.6 + tint * RIPPLE.tint);
        const half = 1.1 + t * 2 + tint * 0.8;
        ctx.fillRect(x + rx + dx * push - half, y + ry + dy * push - half, half * 2, half * 2);
      }
    }
  }

  // How far the ripple pushes a dot that is `d` px from its origin.
  private push(d: number, ripple: Ripple) {
    const age = this.now - ripple.start;
    const p = age / RIPPLE.duration;
    if (p >= 1) return 0;
    const u = d - age * RIPPLE.speed;
    const ring = Math.exp(-((u / RIPPLE.width) ** 2));
    return RIPPLE.amp * (1 - p) ** 2 * ring * Math.sin(u * RIPPLE.k);
  }

  // Area the ripple has reached so far.
  private spread({ x, y, start }: Ripple): Box {
    const reach = (this.now - start) * RIPPLE.speed + RIPPLE.width * 2.5 + RIPPLE.amp;
    return this.around(x, y, reach);
  }

  // Starts a ripple at a random point, then lines up the next one.
  private startRipple = () => {
    const { width, height } = this.view;
    this.ripplePoint(Math.random() * width, Math.random() * height);
    setTimeout(this.startRipple, RIPPLE.pause + Math.random() * RIPPLE.pause);
  };

  // Ripples overlap, each fading out on its own clock.
  private ripplePoint(x: number, y: number) {
    this.ripples.push({ start: performance.now(), x, y });
    if (this.ripples.length > RIPPLE.max) this.ripples.shift();
    this.wake();
  }

  private snap(v: number, max: number, round: (n: number) => number) {
    return Math.min(Math.max(round(v / this.gap) * this.gap, 0), max);
  }

  private around(x: number, y: number, reach = this.reach): Box {
    const { gap, view } = this;
    const maxX = Math.ceil(view.width / gap) * gap;
    const maxY = Math.ceil(view.height / gap) * gap;
    return {
      x0: this.snap(x - reach, maxX, Math.floor),
      y0: this.snap(y - reach, maxY, Math.floor),
      x1: this.snap(x + reach, maxX, Math.ceil),
      y1: this.snap(y + reach, maxY, Math.ceil),
    };
  }

  private union(a: Box, b: Box): Box {
    return {
      x0: Math.min(a.x0, b.x0),
      y0: Math.min(a.y0, b.y0),
      x1: Math.max(a.x1, b.x1),
      y1: Math.max(a.y1, b.y1),
    };
  }

  private full(): Box {
    return { x0: 0, y0: 0, x1: this.view.width, y1: this.view.height };
  }

  private tick = () => {
    const { glow, last } = this;
    this.now = performance.now();
    glow.strength += (glow.target - glow.strength) * 0.14;
    const settled = Math.abs(glow.target - glow.strength) < 0.004;
    if (settled) glow.strength = glow.target;

    // One repaint covers where the lit dots were last frame and are now, and every ripple.
    const box = this.around(this.pointer.x, this.pointer.y);
    this.last = box;
    let dirty = last ? this.union(box, last) : box;
    for (const ripple of this.ripples) dirty = this.union(dirty, this.spread(ripple));
    this.paint(dirty);
    // The frame past a ripple's end paints its dots back at rest.
    this.ripples = this.ripples.filter((r) => this.now - r.start < RIPPLE.duration);

    this.frame = settled && !this.moved && !this.ripples.length ? 0 : requestAnimationFrame(this.tick);
    this.moved = false;
  };

  private wake() {
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  private aim(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.glow.target = 1;
    this.moved = true;
    this.wake();
  }

  private release = () => {
    this.glow.target = 0;
    this.wake();
  };

  // Reallocating clears the bitmap, so skip it when a phone's address bar only
  // shrinks the viewport; the fixed canvas just overhangs the bottom edge.
  private resize() {
    const { canvas, view } = this;
    if (innerWidth === view.width && innerHeight <= view.height) return;
    // The dots are tiny and faint, so full-resolution pixels aren't worth 4x the memory.
    const dpr = 1;
    view.width = innerWidth;
    view.height = innerHeight;
    canvas.width = view.width * dpr;
    canvas.height = view.height * dpr;
    canvas.style.width = `${view.width}px`;
    canvas.style.height = `${view.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.last = null;
    this.paint(this.full());
  }

  private queueResize = () => {
    if (!this.resizing)
      this.resizing = requestAnimationFrame(() => {
        this.resizing = 0;
        this.resize();
      });
  };

  private recolor = () => {
    this.readColors();
    this.paint(this.full());
  };
}
