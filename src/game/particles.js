export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawn(x, y, color, count, size, options = {}) {
    const {
      vxRange = 4,
      vyRange = 4,
      vyBias = -1,
      gravity = 0.1,
      lifeMin = 20,
      lifeMax = 40,
      sizeVar = 2
    } = options;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * vxRange,
        vy: (Math.random() - 0.5) * vyRange + vyBias,
        color: color,
        size: size + Math.random() * sizeVar,
        life: lifeMin + Math.random() * (lifeMax - lifeMin),
        maxLife: lifeMax,
        gravity: gravity
      });
    }
  }

  spawnCircle(x, y, color, count, size, radius = 50) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: size + Math.random() * 2,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        gravity: 0
      });
    }
  }

  spawnTrail(x, y, color, count = 1) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.3,
        color: color,
        size: 3 + Math.random() * 3,
        life: 15 + Math.random() * 10,
        maxLife: 25,
        gravity: -0.02
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= dt * 60;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx, worldToScreen) {
    for (const p of this.particles) {
      const screen = worldToScreen(p.x, p.y);
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(screen.x - p.size / 2, screen.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles = [];
  }
}
