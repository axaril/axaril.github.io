function random(low: number, high: number) {
  return Math.random() * (high - low) + low;
}

interface Particle {
  id: number,
  x: number,
  y: number,
  startY: number,
  radius: number,
  defaultRadius: number,
  startAngle: number,
  endAngle: number,
  alpha: number,
  color: { r: number, g: number, b: number },
  speed: number,
  amplitude: number,
}

class Visual {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  particleLength: number;
  particles: Particle[];
  particleMaxRadius: number;
  handleResizeBind: () => void;

  constructor() {
    this.canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
    this.context = this.canvas.getContext('2d')!;
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.particleLength = 150;
    this.particles = [];
    this.particleMaxRadius = 8;

    this.handleResizeBind = this.handleResize.bind(this);

    this.initialize();
    this.render();
  }

  initialize() {
    this.resizeCanvas();
    for (let i = 0; i < this.particleLength; i++) {
      this.particles.push(this.createParticle(i));
    }
    this.bind();
  }

  bind() {
    window.addEventListener('resize', this.handleResizeBind, false);
  }

  unbind() {
    window.removeEventListener('resize', this.handleResizeBind, false);
  }

  handleResize() {
    this.resizeCanvas();
  }

  resizeCanvas() {
    this.canvasWidth = document.body.offsetWidth;
    this.canvasHeight = document.body.offsetHeight;
    this.canvas.width = this.canvasWidth * window.devicePixelRatio;
    this.canvas.height = this.canvasHeight * window.devicePixelRatio;
    this.context = this.canvas.getContext('2d')!;
    this.context.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  createParticle(id: number, isRecreate?: boolean): Particle {
    const radius = random(1, this.particleMaxRadius);
    const x = isRecreate ? -radius - random(this.particleMaxRadius * 2, this.canvasWidth) : random(0, this.canvasWidth);
    let y = random(this.canvasHeight / 2 - 150, this.canvasHeight / 2 + 150);
    y += random(-100, 100);
    const alpha = random(0.05, 1);

    return {
      id: id,
      x: x,
      y: y,
      startY: y,
      radius: radius,
      defaultRadius: radius,
      startAngle: 0,
      endAngle: Math.PI * 2,
      alpha: alpha,
      color: { r: random(100, 255), g: random(100, 255), b: random(100, 255) },
      speed: alpha + 1,
      amplitude: random(50, 200),
    };
  }

  drawParticles() {
    this.particles.forEach(particle => {
      this.moveParticle(particle);

      this.context.beginPath();
      this.context.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.alpha})`;
      this.context.arc(particle.x, particle.y, particle.radius, particle.startAngle, particle.endAngle);
      this.context.fill();
    });
  }

  moveParticle(particle: any) {
    particle.x += particle.speed;
    particle.y = particle.startY + particle.amplitude * Math.sin(((particle.x / 5) * Math.PI) / 180);
  }

  render() {
    this.context.clearRect(0, 0, this.canvasWidth + this.particleMaxRadius * 2, this.canvasHeight);

    this.drawParticles();

    this.particles.forEach(particle => {
      if (particle.x - particle.radius >= this.canvasWidth) {
        this.particles[particle.id] = this.createParticle(particle.id, true);
      }
    });

    requestAnimationFrame(this.render.bind(this));
  }
}

new Visual();