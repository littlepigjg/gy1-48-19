import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, SURFACE_Y, TILE_TYPES, TILE_COLORS, TILE_HARDNESS } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.camY = 0;
    this.shakeTime = 0;
    this.shakeStrength = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  centerOn(player) {
    const targetX = player.x - this.canvas.width / 2;
    const targetY = player.y - this.canvas.height / 2;
    this.camX += (targetX - this.camX) * 0.1;
    this.camY += (targetY - this.camY) * 0.1;

    this.camX = Math.max(0, Math.min(WORLD_WIDTH * TILE_SIZE - this.canvas.width, this.camX));
    this.camY = Math.max(-SURFACE_Y * TILE_SIZE, Math.min(WORLD_HEIGHT * TILE_SIZE - this.canvas.height, this.camY));
  }

  shake(strength, time = 0.3) {
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  worldToScreen(x, y) {
    let sx = x - this.camX;
    let sy = y - this.camY;
    if (this.shakeTime > 0) {
      sx += (Math.random() - 0.5) * this.shakeStrength * 10;
      sy += (Math.random() - 0.5) * this.shakeStrength * 10;
    }
    return { x: sx, y: sy };
  }

  render(dt, world, player, enemies, bullets, particles, baseBuildingX, hazards = null, teleportSystem = null) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeStrength = 0;
    }

    this.centerOn(player);

    this.renderSky();
    this.renderBaseBeam(baseBuildingX);
    this.renderBase(baseBuildingX);
    this.renderWorld(world);
    if (hazards) {
      hazards.render(this.ctx, (x, y) => this.worldToScreen(x, y));
    }
    particles.render(this.ctx, (x, y) => this.worldToScreen(x, y));
    this.renderBullets(bullets);
    this.renderEnemies(enemies);
    this.renderPlayer(player, teleportSystem);
    this.renderDarkness(player);
    this.renderBaseArrow(baseBuildingX, player);
  }

  renderSky() {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.4, '#16213e');
    grad.addColorStop(0.7, '#0f3460');
    grad.addColorStop(1, '#1a1a2e');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 50; i++) {
      const sx = (i * 137 + 50) % this.canvas.width;
      const sy = ((i * 89) % (SURFACE_Y * TILE_SIZE - this.camY)) % this.canvas.height;
      if (sy < SURFACE_Y * TILE_SIZE - this.camY) {
        const size = ((i * 31) % 3) + 1;
        this.ctx.fillRect(sx, sy, size, size);
      }
    }
  }

  renderBaseBeam(baseBuildingX) {
    const baseCenterX = (baseBuildingX + 3) * TILE_SIZE - this.camX;
    const baseTopY = (SURFACE_Y - 3) * TILE_SIZE - this.camY;
    const time = Date.now() * 0.001;

    if (baseCenterX < -100 || baseCenterX > this.canvas.width + 100) return;

    const beamWidth = TILE_SIZE * 2;
    const gradient = this.ctx.createLinearGradient(
      baseCenterX - beamWidth / 2, 0,
      baseCenterX + beamWidth / 2, 0
    );
    const pulseAlpha = 0.15 + Math.sin(time * 2) * 0.08;
    gradient.addColorStop(0, `rgba(255, 215, 0, 0)`);
    gradient.addColorStop(0.3, `rgba(255, 215, 0, ${pulseAlpha})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 150, ${pulseAlpha + 0.1})`);
    gradient.addColorStop(0.7, `rgba(255, 215, 0, ${pulseAlpha})`);
    gradient.addColorStop(1, `rgba(255, 215, 0, 0)`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(baseCenterX - beamWidth / 2, 0, beamWidth, baseTopY + TILE_SIZE);

    for (let i = 0; i < 5; i++) {
      const particleY = ((time * 50 + i * 80) % (baseTopY + TILE_SIZE * 4));
      const particleX = baseCenterX + Math.sin(time * 3 + i) * TILE_SIZE * 0.8;
      const alpha = particleY < baseTopY ? 0.6 : 0.6 - (particleY - baseTopY) / (TILE_SIZE * 4) * 0.6;
      if (alpha > 0) {
        this.ctx.fillStyle = `rgba(255, 255, 100, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(particleX, particleY, 2 + (i % 2), 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  renderBase(baseBuildingX) {
    const baseScreenX = baseBuildingX * TILE_SIZE - this.camX;
    const baseScreenY = (SURFACE_Y - 3) * TILE_SIZE - this.camY;

    if (baseScreenX + TILE_SIZE * 6 < 0 || baseScreenX > this.canvas.width) return;

    const time = Date.now() * 0.001;

    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 20 + Math.sin(time * 2) * 10;

    this.ctx.fillStyle = '#4A3728';
    this.ctx.fillRect(baseScreenX, baseScreenY, TILE_SIZE * 6, TILE_SIZE * 3);

    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#5D4632';
    this.ctx.beginPath();
    this.ctx.moveTo(baseScreenX - TILE_SIZE * 0.5, baseScreenY);
    this.ctx.lineTo(baseScreenX + TILE_SIZE * 3, baseScreenY - TILE_SIZE * 1.5);
    this.ctx.lineTo(baseScreenX + TILE_SIZE * 6.5, baseScreenY);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(baseScreenX + TILE_SIZE * 0.5, baseScreenY + TILE_SIZE * 0.5, TILE_SIZE * 1.5, TILE_SIZE * 1.5);

    const windowGlow = 0.6 + Math.sin(time * 1.5) * 0.3;
    this.ctx.fillStyle = `rgba(135, 206, 235, ${windowGlow})`;
    this.ctx.shadowColor = '#87CEEB';
    this.ctx.shadowBlur = 10;
    this.ctx.fillRect(baseScreenX + TILE_SIZE * 3.5, baseScreenY + TILE_SIZE * 0.5, TILE_SIZE * 1.2, TILE_SIZE);
    this.ctx.fillRect(baseScreenX + TILE_SIZE * 5, baseScreenY + TILE_SIZE * 0.5, TILE_SIZE * 0.6, TILE_SIZE);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#000';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText('🏭 采矿基地', baseScreenX + TILE_SIZE * 3, baseScreenY - TILE_SIZE * 0.3);
    this.ctx.shadowBlur = 0;
  }

  renderBaseArrow(baseBuildingX, player) {
    const baseCenterX = (baseBuildingX + 3) * TILE_SIZE;
    const baseY = (SURFACE_Y - 1) * TILE_SIZE;
    const depth = player.tileY - SURFACE_Y;

    if (depth < 3) return;

    const playerScreen = this.worldToScreen(player.x, player.y);
    const baseScreen = this.worldToScreen(baseCenterX, baseY);

    const dx = baseCenterX - player.x;
    const dy = baseY - player.y;
    const angle = Math.atan2(dy, dx);

    const margin = 100;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - margin;

    const arrowX = centerX + Math.cos(angle) * radius;
    const arrowY = centerY + Math.sin(angle) * radius;

    this.ctx.save();
    this.ctx.translate(arrowX, arrowY);
    this.ctx.rotate(angle);

    const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.15;
    this.ctx.fillStyle = `rgba(255, 215, 0, ${0.8 * pulse})`;
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 15;

    this.ctx.beginPath();
    this.ctx.moveTo(20 * pulse, 0);
    this.ctx.lineTo(-10 * pulse, -12);
    this.ctx.lineTo(-5 * pulse, 0);
    this.ctx.lineTo(-10 * pulse, 12);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();

    const dist = Math.floor(Math.sqrt(dx * dx + dy * dy) / TILE_SIZE);
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.textAlign = 'center';
    const textX = Math.max(margin, Math.min(this.canvas.width - margin, arrowX));
    const textY = Math.max(margin + 30, Math.min(this.canvas.height - margin, arrowY + 25));
    this.ctx.fillRect(textX - 40, textY - 12, 80, 18);
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText(`🏭 ${dist}m`, textX, textY);
  }

  renderWorld(world) {
    const startX = Math.max(0, Math.floor(this.camX / TILE_SIZE) - 1);
    const startY = Math.max(0, Math.floor(this.camY / TILE_SIZE) - 1);
    const endX = Math.min(WORLD_WIDTH, Math.ceil((this.camX + this.canvas.width) / TILE_SIZE) + 1);
    const endY = Math.min(WORLD_HEIGHT, Math.ceil((this.camY + this.canvas.height) / TILE_SIZE) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = world.getTile(x, y);
        if (tile === TILE_TYPES.EMPTY) continue;
        this.renderTile(x, y, tile, world);
      }
    }
  }

  renderTile(x, y, tile, world) {
    const colors = TILE_COLORS[tile];
    if (!colors) return;

    const screen = this.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
    const colorIdx = ((x * 7 + y * 13) % 3);
    let color = colors[colorIdx];

    if (tile === TILE_TYPES.CAVE) return;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(screen.x, screen.y, TILE_SIZE + 1, TILE_SIZE + 1);

    if (tile >= TILE_TYPES.ORE_COAL && tile <= TILE_TYPES.ORE_DIAMOND) {
      const baseColors = TILE_COLORS[TILE_TYPES.STONE];
      this.ctx.fillStyle = baseColors[(x * 3 + y * 5) % 3];
      this.ctx.fillRect(screen.x, screen.y, TILE_SIZE + 1, TILE_SIZE + 1);

      this.ctx.fillStyle = colors[0];
      for (let i = 0; i < 6; i++) {
        const ox = ((x * 17 + y * 23 + i * 31) % (TILE_SIZE - 12)) + 4;
        const oy = ((x * 19 + y * 29 + i * 37) % (TILE_SIZE - 12)) + 4;
        const size = 6 + (i % 3) * 3;
        this.ctx.fillRect(screen.x + ox, screen.y + oy, size, size);
        
        this.ctx.fillStyle = colors[2];
        this.ctx.fillRect(screen.x + ox + 1, screen.y + oy + 1, size - 3, size - 3);
        this.ctx.fillStyle = colors[0];
      }
    }

    if (tile === TILE_TYPES.LAVA) {
      const time = Date.now() * 0.001;
      const bubbleX = screen.x + TILE_SIZE / 2 + Math.sin(time + x) * TILE_SIZE * 0.3;
      const bubbleY = screen.y + TILE_SIZE / 2 + Math.cos(time * 0.7 + y) * TILE_SIZE * 0.3;
      
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.beginPath();
      this.ctx.arc(bubbleX, bubbleY, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (tile === TILE_TYPES.POISON_GAS) {
      const baseColors = TILE_COLORS[TILE_TYPES.DIRT];
      this.ctx.fillStyle = baseColors[(x * 3 + y * 5) % 3];
      this.ctx.fillRect(screen.x, screen.y, TILE_SIZE + 1, TILE_SIZE + 1);

      this.ctx.globalAlpha = 0.4;
      this.ctx.fillStyle = colors[0];
      this.ctx.fillRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
      this.ctx.globalAlpha = 1;
    }

    if (tile === TILE_TYPES.INSTABILITY) {
      const baseColors = TILE_COLORS[TILE_TYPES.STONE];
      this.ctx.fillStyle = baseColors[(x * 3 + y * 5) % 3];
      this.ctx.fillRect(screen.x, screen.y, TILE_SIZE + 1, TILE_SIZE + 1);

      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
      this.ctx.fillRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);

      this.ctx.fillStyle = '#FFFF00';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('!', screen.x + TILE_SIZE / 2, screen.y + TILE_SIZE / 2 + 7);
    }

    const idx = world.getIndex(x, y);
    const hardness = TILE_HARDNESS[tile] || 0;
    const maxHealth = hardness * 100;
    const health = world.tileHealth[idx];
    if (maxHealth > 0 && health > 0 && health < maxHealth && world.isSolid(x, y)) {
      const damageRatio = 1 - health / maxHealth;
      if (damageRatio > 0.1) {
        this.ctx.strokeStyle = `rgba(0,0,0,${0.3 + damageRatio * 0.4})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const x1 = screen.x + (i * TILE_SIZE / 3) + 5;
          const y1 = screen.y + 5;
          const x2 = screen.x + TILE_SIZE - 10 - i * 5;
          const y2 = screen.y + TILE_SIZE - 10;
          this.ctx.moveTo(x1, y1);
          this.ctx.lineTo(x2, y2);
        }
        this.ctx.stroke();
      }
    }
  }

  renderPlayer(player, teleportSystem = null) {
    const screen = this.worldToScreen(player.x, player.y);
    const size = player.width;
    const half = size / 2;
    const time = Date.now() * 0.001;

    if (teleportSystem && teleportSystem.isTeleporting()) {
      const progress = teleportSystem.progress;
      const rings = 3;
      for (let i = 0; i < rings; i++) {
        const ringProgress = ((progress * 3 + i / rings) % 1);
        const ringSize = size * 1.5 + ringProgress * size * 4;
        const alpha = (1 - ringProgress) * 0.6;
        this.ctx.strokeStyle = `rgba(155, 89, 182, ${alpha})`;
        this.ctx.lineWidth = 3 - ringProgress * 2;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, ringSize, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.globalAlpha = 0.5 + Math.sin(time * 15) * 0.3;
    }

    this.ctx.save();
    this.ctx.translate(screen.x, screen.y);

    let rotation = 0;
    switch (player.facing) {
      case 'right': rotation = Math.PI / 2; break;
      case 'left': rotation = -Math.PI / 2; break;
      case 'up': rotation = Math.PI; break;
    }
    this.ctx.rotate(rotation);

    if (player.damageFlash > 0 && Math.floor(player.damageFlash * 20) % 2 === 0) {
      this.ctx.globalAlpha *= 0.5;
    }

    this.ctx.fillStyle = '#3498DB';
    this.ctx.beginPath();
    this.ctx.roundRect(-half, -half, size, size, 4);
    this.ctx.fill();

    this.ctx.fillStyle = '#2980B9';
    this.ctx.fillRect(-half, -half, size, size * 0.3);

    this.ctx.fillStyle = '#2C3E50';
    this.ctx.beginPath();
    this.ctx.roundRect(-half * 0.8, -half * 0.4, size * 0.8, size * 0.5, 3);
    this.ctx.fill();

    this.ctx.fillStyle = '#87CEEB';
    this.ctx.beginPath();
    this.ctx.roundRect(-half * 0.6, -half * 0.3, size * 0.6, size * 0.35, 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#95A5A6';
    this.ctx.beginPath();
    this.ctx.moveTo(-half * 0.7, half);
    this.ctx.lineTo(0, half + size * 0.4);
    this.ctx.lineTo(half * 0.7, half);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#7F8C8D';
    this.ctx.fillRect(-half * 0.15, half + size * 0.2, size * 0.3, size * 0.2);

    this.ctx.fillStyle = '#E74C3C';
    this.ctx.fillRect(-half - 4, -half * 0.3, 6, size * 0.6);
    this.ctx.fillRect(half - 2, -half * 0.3, 6, size * 0.6);

    if (player.moving) {
      this.ctx.fillStyle = '#F39C12';
      this.ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      this.ctx.beginPath();
      this.ctx.arc(-half + 2, 0, 5 + Math.random() * 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(half - 2, 0, 5 + Math.random() * 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }

    this.ctx.restore();

    const barWidth = size * 1.2;
    const barHeight = 4;
    const barX = screen.x - barWidth / 2;
    const barY = screen.y + half + 8;

    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    this.ctx.fillStyle = '#E74C3C';
    this.ctx.fillRect(barX, barY, barWidth * (player.health / player.maxHealth), barHeight);

    this.ctx.globalAlpha = 1;
  }

  renderEnemies(enemies) {
    for (const e of enemies) {
      const screen = this.worldToScreen(e.x, e.y);
      const size = e.width;
      const half = size / 2;

      this.ctx.save();
      this.ctx.translate(screen.x, screen.y);

      if (e.damageFlash > 0) {
        this.ctx.globalAlpha = 0.5;
      }

      switch (e.type) {
        case 'worm':
          this.ctx.fillStyle = e.color;
          for (let i = 0; i < 4; i++) {
            const segSize = size * (0.8 - i * 0.1);
            this.ctx.beginPath();
            this.ctx.arc(-i * size * 0.25, Math.sin(Date.now() * 0.005 + i) * 3, segSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
          }
          this.ctx.fillStyle = '#FFF';
          this.ctx.beginPath();
          this.ctx.arc(size * 0.15, -size * 0.1, 4, 0, Math.PI * 2);
          this.ctx.arc(size * 0.15, size * 0.1, 4, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = '#000';
          this.ctx.beginPath();
          this.ctx.arc(size * 0.18, -size * 0.1, 2, 0, Math.PI * 2);
          this.ctx.arc(size * 0.18, size * 0.1, 2, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case 'bat':
          const wingFlap = Math.sin(Date.now() * 0.02) * 0.5;
          this.ctx.fillStyle = e.color;
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.quadraticCurveTo(-size * 0.8, -half * 1.2 - wingFlap * 10, -size, 0);
          this.ctx.quadraticCurveTo(-size * 0.6, half * 0.3, 0, half);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.quadraticCurveTo(size * 0.8, -half * 1.2 - wingFlap * 10, size, 0);
          this.ctx.quadraticCurveTo(size * 0.6, half * 0.3, 0, half);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.beginPath();
          this.ctx.arc(0, 0, half * 0.7, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = '#FF0000';
          this.ctx.beginPath();
          this.ctx.arc(-4, -3, 3, 0, Math.PI * 2);
          this.ctx.arc(4, -3, 3, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case 'spider':
          this.ctx.fillStyle = e.color;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(angle) * size * 0.8, Math.sin(angle) * size * 0.8);
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = e.color;
            this.ctx.stroke();
          }
          this.ctx.beginPath();
          this.ctx.arc(0, 0, half * 0.7, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = '#FF0000';
          for (let i = 0; i < 4; i++) {
            const ex = -6 + (i % 2) * 12;
            const ey = -4 + Math.floor(i / 2) * 6;
            this.ctx.beginPath();
            this.ctx.arc(ex, ey, 2, 0, Math.PI * 2);
            this.ctx.fill();
          }
          break;

        case 'demon':
          this.ctx.fillStyle = e.color;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, half * 0.8, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.beginPath();
          this.ctx.moveTo(-half * 0.5, -half * 0.6);
          this.ctx.lineTo(-half * 0.8, -half);
          this.ctx.lineTo(-half * 0.2, -half * 0.5);
          this.ctx.fill();
          this.ctx.beginPath();
          this.ctx.moveTo(half * 0.5, -half * 0.6);
          this.ctx.lineTo(half * 0.8, -half);
          this.ctx.lineTo(half * 0.2, -half * 0.5);
          this.ctx.fill();
          this.ctx.fillStyle = '#FFFF00';
          this.ctx.beginPath();
          this.ctx.arc(-8, -3, 5, 0, Math.PI * 2);
          this.ctx.arc(8, -3, 5, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = '#000';
          this.ctx.beginPath();
          this.ctx.arc(-8, -3, 2, 0, Math.PI * 2);
          this.ctx.arc(8, -3, 2, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = '#000';
          this.ctx.beginPath();
          this.ctx.moveTo(-8, half * 0.3);
          this.ctx.lineTo(-4, half * 0.5);
          this.ctx.lineTo(0, half * 0.3);
          this.ctx.lineTo(4, half * 0.5);
          this.ctx.lineTo(8, half * 0.3);
          this.ctx.closePath();
          this.ctx.fill();
          break;
      }

      this.ctx.restore();

      const barWidth = size * 1.2;
      const barHeight = 3;
      const barX = screen.x - barWidth / 2;
      const barY = screen.y - half - 8;

      this.ctx.fillStyle = '#333';
      this.ctx.fillRect(barX, barY, barWidth, barHeight);
      this.ctx.fillStyle = '#E74C3C';
      this.ctx.fillRect(barX, barY, barWidth * (e.health / e.maxHealth), barHeight);
    }
  }

  renderBullets(bullets) {
    for (const b of bullets) {
      const screen = this.worldToScreen(b.x, b.y);
      this.ctx.fillStyle = '#FFD700';
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(screen.x - b.vx, screen.y - b.vy, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  renderParticles(particles) {
    for (const p of particles) {
      const screen = this.worldToScreen(p.x, p.y);
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(screen.x - p.size / 2, screen.y - p.size / 2, p.size, p.size);
    }
    this.ctx.globalAlpha = 1;
  }

  renderDarkness(player) {
    const depth = player.tileY - SURFACE_Y;
    if (depth <= 0) return;

    const darknessRatio = Math.min(1, depth / 100);
    if (darknessRatio < 0.1) return;

    const screen = this.worldToScreen(player.x, player.y);
    const lightRadius = 200 - darknessRatio * 80;

    const gradient = this.ctx.createRadialGradient(
      screen.x, screen.y, 0,
      screen.x, screen.y, lightRadius
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.7, `rgba(0,0,0,${darknessRatio * 0.5})`);
    gradient.addColorStop(1, `rgba(0,0,0,${darknessRatio * 0.85})`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
