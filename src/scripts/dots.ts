type Box = { x0: number; y0: number; x1: number; y1: number };

export type DotGridOptions = {
  gap?: number;
  radius?: number;
  // Theme variables the dots are drawn with.
  baseVar?: string;
  accentVar?: string;
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

    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) this.listen();
  }

  private listen() {
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "touch") this.aim(e.clientX, e.clientY);
    });
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
        const fill = t > 0.02 ? colors.accent : colors.base;
        if (fill !== style) ctx.fillStyle = style = fill;
        ctx.globalAlpha = 0.14 + t * 0.7;
        const half = 0.9 + t * 2;
        ctx.fillRect(x + dx * push - half, y + dy * push - half, half * 2, half * 2);
      }
    }
  }

  private snap(v: number, max: number, round: (n: number) => number) {
    return Math.min(Math.max(round(v / this.gap) * this.gap, 0), max);
  }

  private around(x: number, y: number): Box {
    const { gap, reach, view } = this;
    const maxX = Math.ceil(view.width / gap) * gap;
    const maxY = Math.ceil(view.height / gap) * gap;
    return {
      x0: this.snap(x - reach, maxX, Math.floor),
      y0: this.snap(y - reach, maxY, Math.floor),
      x1: this.snap(x + reach, maxX, Math.ceil),
      y1: this.snap(y + reach, maxY, Math.ceil),
    };
  }

  private full(): Box {
    return { x0: 0, y0: 0, x1: this.view.width, y1: this.view.height };
  }

  private tick = () => {
    const { glow, last } = this;
    glow.strength += (glow.target - glow.strength) * 0.14;
    const settled = Math.abs(glow.target - glow.strength) < 0.004;
    if (settled) glow.strength = glow.target;

    // Repaint where the lit dots were last frame and where they are now.
    const box = this.around(this.pointer.x, this.pointer.y);
    this.paint(
      last
        ? {
            x0: Math.min(box.x0, last.x0),
            y0: Math.min(box.y0, last.y0),
            x1: Math.max(box.x1, last.x1),
            y1: Math.max(box.y1, last.y1),
          }
        : box,
    );
    this.last = box;

    this.frame = settled && !this.moved ? 0 : requestAnimationFrame(this.tick);
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
    const dpr = Math.min(devicePixelRatio || 1, 2);
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
