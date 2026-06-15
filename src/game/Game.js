import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, SURFACE_Y, TILE_TYPES, TILE_COLORS, DEPTH_BONUS_MULTIPLIER, CHARGE_AFTERSHOT_DELAY } from './constants.js';
import { World } from './world.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Renderer } from './renderer.js';
import { UIManager } from './ui.js';
import { ParticleSystem } from './particles.js';
import { HazardManager } from './hazards.js';
import { TeleportSystem } from './teleport.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.ui = new UIManager(this);

    this.paused = false;
    this.running = false;
    this.lastTime = 0;

    this.stats = {
      blocksDug: 0,
      enemiesKilled: 0
    };

    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      dig: false,
      shoot: false,
      teleport: false
    };

    this.bullets = [];
    this.particles = new ParticleSystem();
    this.hazards = new HazardManager();
    this.teleport = new TeleportSystem();
    this.collapseTimer = 0;

    this.audioContext = null;
    this.chargeOscillator = null;
    this.chargeGain = null;
    this.lastChargeSoundLevel = -1;

    this.baseBuildingX = Math.floor(WORLD_WIDTH / 2) - 3;

    this.setupInput();
    this.init();
  }

  init() {
    const seed = Date.now();
    this.world = new World(seed);

    const startX = Math.floor(WORLD_WIDTH / 2);
    const startY = SURFACE_Y - 1;

    for (let dy = 0; dy < 5; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = startX + dx;
        const ty = SURFACE_Y + dy;
        if (this.world.inBounds(tx, ty)) {
          const idx = this.world.getIndex(tx, ty);
          this.world.tiles[idx] = TILE_TYPES.EMPTY;
          this.world.tileHealth[idx] = 0;
          this.world.dugTiles[idx] = 1;
        }
      }
    }

    this.player = new Player(startX, startY);
    this.enemies = new EnemyManager();
    this.bullets = [];
    this.particles.clear();
    this.hazards.clear();
    this.teleport = new TeleportSystem();
    this.stats = { blocksDug: 0, enemiesKilled: 0 };
    this.collapseTimer = 0;
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (!this.running) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.input.left = true;
          if (this.teleport.isTeleporting()) this.cancelTeleport();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.input.right = true;
          if (this.teleport.isTeleporting()) this.cancelTeleport();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.input.up = true;
          if (this.teleport.isTeleporting()) this.cancelTeleport();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.input.down = true;
          if (this.teleport.isTeleporting()) this.cancelTeleport();
          break;
        case ' ':
          this.input.dig = true;
          if (this.teleport.isTeleporting()) this.cancelTeleport();
          e.preventDefault();
          break;
        case 'x':
        case 'X':
          this.input.shoot = true;
          if (this.teleport.isTeleporting()) this.cancelTeleport();
          break;
        case 't':
        case 'T':
          this.tryTeleport();
          break;
        case 'Escape':
          if (this.ui.isShopOpen()) {
            this.ui.closeShop();
          } else {
            this.ui.openShop();
          }
          e.preventDefault();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.input.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.input.right = false;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.input.up = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.input.down = false;
          break;
        case ' ':
          this.input.dig = false;
          break;
        case 'x':
        case 'X':
          this.input.shoot = false;
          break;
      }
    });
  }

  tryTeleport() {
    if (!this.running || this.paused) return;
    const depth = Math.max(0, this.player.tileY - SURFACE_Y);
    if (depth < 2) {
      this.ui.showWarning('已在地面，无需传送', 1500);
      return;
    }

    const result = this.teleport.start(this.player);
    if (result.success) {
      this.ui.showWarning(`传送启动中...消耗 $${result.cost}`, 1500, 'text-purple-300');
      this.particles.spawnCircle(this.player.x, this.player.y, '#9B59B6', 15, 4);
    } else {
      this.ui.showWarning(`传送失败: ${result.reason}`, 2000);
    }
  }

  cancelTeleport() {
    if (this.teleport.cancel()) {
      this.ui.showWarning('传送已取消', 1000);
    }
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.ui.showHUD();
    this.ui.hideGameOver();
    this.loop();
  }

  loop() {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (!this.paused) {
      this.update(dt);
    }

    const chargeProgress = this.player.getChargeProgress(now);
    
    this.renderer.render(
      dt,
      this.world,
      this.player,
      this.enemies.enemies,
      this.bullets,
      this.particles,
      this.baseBuildingX,
      this.hazards,
      this.teleport,
      chargeProgress
    );

    this.ui.updateHUD();

    if (this.player.health <= 0) {
      this.gameOver();
      return;
    }

    requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    if (!this.teleport.isTeleporting()) {
      this.player.update(dt, this.world, this.input);
    }

    this.teleport.update(dt, this.player, this.world, this.particles, (cost) => {
      this.ui.showWarning(`✨ 传送成功！消耗 $${cost}`, 2000, 'text-cyan-300');
      this.particles.spawnCircle(this.player.x, this.player.y, '#FFD700', 25, 5);
      this.renderer.shake(2, 0.3);
    });

    this.enemies.update(dt, this.player, this.world);
    this.handleDigging(dt);
    this.handleShooting(dt);
    this.updateBullets(dt);
    this.particles.update(dt);
    this.hazards.update(dt, this.world, this.player, (type, damage) => {
      if (type === 'poison') {
        this.player.takeDamage(damage);
        if (Math.random() < 0.2) {
          this.particles.spawnTrail(this.player.x, this.player.y, '#7CFC00');
        }
      }
    });
    this.checkHazards(dt);
    this.checkCollapses(dt);
    this.checkEnemyKills();
    this.checkLowResources();
  }

  handleDigging(dt) {
    if (!this.input.dig || this.teleport.isTeleporting()) return;

    const target = this.player.getDigTarget();
    const result = this.world.digTile(target.x, target.y, this.player.drillPower);

    if (result.success) {
      if (result.damaged) {
        this.particles.spawn(
          target.x * TILE_SIZE + TILE_SIZE / 2,
          target.y * TILE_SIZE + TILE_SIZE / 2,
          this.getDustColor(this.world.getTile(target.x, target.y)),
          2,
          1
        );
      }

      if (result.broke) {
        this.stats.blocksDug++;
        this.renderer.shake(1, 0.1);

        if (result.ore) {
          if (this.player.addOre(result.ore)) {
            this.particles.spawn(
              target.x * TILE_SIZE + TILE_SIZE / 2,
              target.y * TILE_SIZE + TILE_SIZE / 2,
              this.getOreColor(result.ore),
              10,
              3
            );
            this.particles.spawnCircle(
              target.x * TILE_SIZE + TILE_SIZE / 2,
              target.y * TILE_SIZE + TILE_SIZE / 2,
              this.getOreColor(result.ore),
              6,
              2
            );
          } else {
            this.ui.showWarning('📦 货仓已满！返回地面出售矿石', 2000);
          }
        } else {
          this.particles.spawn(
            target.x * TILE_SIZE + TILE_SIZE / 2,
            target.y * TILE_SIZE + TILE_SIZE / 2,
            this.getDustColor(this.world.getTile(target.x, target.y)),
            6,
            2
          );
        }

        if (result.hazard === 'poison') {
          this.hazards.spawnPoisonClouds(
            target.x * TILE_SIZE + TILE_SIZE / 2,
            target.y * TILE_SIZE + TILE_SIZE / 2,
            5
          );
          this.ui.showWarning('☠️ 毒气释放！小心绿色毒云', 2500);
        }

        if (result.hazard === 'instability') {
          this.hazards.addCollapseWarning(target.x, target.y);
          setTimeout(() => this.triggerCollapse(target.x, target.y), 1000);
        }

        this.player.fuel -= this.player.fuelConsumption * 0.5 * dt * 60;
        this.player.addHeat(this.player.heatGeneration * 0.3 * dt * 60);
      }
    } else if (result.tooHard) {
      this.ui.showWarning('⛏️ 钻头等级不够，无法挖掘此方块！', 1000);
      this.input.dig = false;
    }
  }

  initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  playSound(frequency, duration, type = 'sine', volume = 0.1) {
    try {
      const ctx = this.initAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
    }
  }

  startChargeSound() {
    try {
      const ctx = this.initAudio();
      this.chargeOscillator = ctx.createOscillator();
      this.chargeGain = ctx.createGain();
      this.chargeOscillator.type = 'sawtooth';
      this.chargeOscillator.frequency.setValueAtTime(200, ctx.currentTime);
      this.chargeGain.gain.setValueAtTime(0, ctx.currentTime);
      this.chargeOscillator.connect(this.chargeGain);
      this.chargeGain.connect(ctx.destination);
      this.chargeOscillator.start(ctx.currentTime);
      this.lastChargeSoundLevel = -1;
    } catch (e) {
    }
  }

  updateChargeSound(progress) {
    if (!this.chargeOscillator || !this.chargeGain) return;
    try {
      const ctx = this.audioContext;
      const level = Math.floor(progress * 10);
      if (level !== this.lastChargeSoundLevel) {
        this.lastChargeSoundLevel = level;
        const freq = 200 + progress * 600;
        const vol = 0.05 + progress * 0.15;
        this.chargeOscillator.frequency.setValueAtTime(freq, ctx.currentTime);
        this.chargeGain.gain.setValueAtTime(vol, ctx.currentTime);
      }
    } catch (e) {
    }
  }

  stopChargeSound(fullCharge = false) {
    if (this.chargeOscillator) {
      try {
        this.chargeGain.gain.setValueAtTime(0.001, this.audioContext.currentTime);
        this.chargeOscillator.stop(this.audioContext.currentTime + 0.1);
      } catch (e) {
      }
      this.chargeOscillator = null;
      this.chargeGain = null;
      this.lastChargeSoundLevel = -1;
    }
    if (fullCharge) {
      this.playSound(800, 0.1, 'sine', 0.2);
      setTimeout(() => this.playSound(1000, 0.15, 'sine', 0.15), 50);
    }
  }

  playShootSound(charged = false) {
    if (charged) {
      this.playSound(150, 0.2, 'square', 0.2);
      setTimeout(() => this.playSound(100, 0.3, 'sawtooth', 0.15), 50);
    } else {
      this.playSound(300, 0.08, 'square', 0.1);
    }
  }

  handleShooting(dt) {
    const now = performance.now();
    let dirX = 0, dirY = 0;
    switch (this.player.facing) {
      case 'up': dirY = -1; break;
      case 'down': dirY = 1; break;
      case 'left': dirX = -1; break;
      case 'right': dirX = 1; break;
    }

    if (this.input.shoot && !this.teleport.isTeleporting()) {
      if (!this.player.charging) {
        if (this.player.startCharge(now)) {
          this.startChargeSound();
        }
      } else {
        const progress = this.player.updateCharge(now);
        this.updateChargeSound(progress);
        if (progress >= 1 && this.player.chargeFull) {
          if (!this._fullChargeNotified) {
            this.stopChargeSound(true);
            this._fullChargeNotified = true;
            this.ui.showWarning('⚡ 蓄力已满！', 500, 'text-yellow-300');
          }
        }
      }
    } else {
      if (this.player.charging) {
        const progress = this.player.getChargeProgress(now);
        if (progress >= 0.2) {
          const bullet = this.player.releaseCharge(now, dirX, dirY);
          if (bullet) {
            this.bullets.push(bullet);
            this.playShootSound(true);
            this.renderer.shake(bullet.chargeLevel * 3, 0.2 + bullet.chargeLevel * 0.2);
            const particleCount = Math.floor(5 + bullet.chargeLevel * 10);
            for (let i = 0; i < particleCount; i++) {
              const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 0.5;
              const speed = 2 + Math.random() * 3;
              this.particles.spawn(
                this.player.x + dirX * TILE_SIZE * 0.5,
                this.player.y + dirY * TILE_SIZE * 0.5,
                bullet.chargeLevel >= 1 ? '#00FFFF' : '#FFD700',
                3 + Math.random() * 3,
                2 + Math.random() * 2,
                {
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  gravity: 0,
                  lifeMin: 15,
                  lifeMax: 25
                }
              );
            }
          }
        } else {
          this.player.cancelCharge();
        }
        this.stopChargeSound(false);
        this._fullChargeNotified = false;
      }
    }
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life -= dt * 60;

      const tileX = Math.floor(b.x / TILE_SIZE);
      const tileY = Math.floor(b.y / TILE_SIZE);
      if (this.world.isSolid(tileX, tileY)) {
        const color = b.charged && b.chargeLevel >= 1 ? '#00FFFF' : '#FFD700';
        this.particles.spawn(b.x, b.y, color, 4, 2, { gravity: 0, lifeMin: 5, lifeMax: 10 });
        this.bullets.splice(i, 1);
        continue;
      }

      const hitResult = this.enemies.checkBulletCollision(b);
      if (hitResult.hit) {
        const hitColor = b.charged && b.chargeLevel >= 1 ? '#00FFFF' : '#FF4444';
        this.particles.spawnCircle(b.x, b.y, hitColor, 8, 3);
        this.renderer.shake(0.5, 0.1);
        if (b.charged && b.piercing !== undefined) {
          b.pierced++;
          if (b.pierced >= b.piercing) {
            this.bullets.splice(i, 1);
          }
        } else {
          this.bullets.splice(i, 1);
        }
        continue;
      }

      if (b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }
  }

  getDustColor(tile) {
    const colors = TILE_COLORS[tile];
    if (colors && colors.length > 0) return colors[0];
    return '#8B4513';
  }

  getOreColor(oreType) {
    const colorMap = {
      coal: '#2F2F2F',
      iron: '#B87333',
      gold: '#FFD700',
      emerald: '#50C878',
      ruby: '#E0115F',
      diamond: '#00CED1'
    };
    return colorMap[oreType] || '#FFFFFF';
  }

  checkHazards(dt) {
    const px = this.player.tileX;
    const py = this.player.tileY;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = px + dx;
        const ty = py + dy;
        const tile = this.world.getTile(tx, ty);
        if (tile === TILE_TYPES.LAVA) {
          this.player.addHeat(2 * dt * 60);
        }
      }
    }
  }

  checkCollapses(dt) {
    this.collapseTimer += dt;
    if (this.collapseTimer < 0.5) return;
    this.collapseTimer = 0;

    const collapses = this.world.checkCollapse(this.player.tileX, this.player.tileY);
    for (const c of collapses) {
      const tile = this.world.getTile(c.x, c.y);
      if (tile !== TILE_TYPES.EMPTY && tile !== TILE_TYPES.CAVE) {
        this.hazards.addCollapseWarning(c.x, c.y);
        setTimeout(() => this.triggerCollapse(c.x, c.y), 500 + Math.random() * 500);
      }
    }
  }

  triggerCollapse(x, y) {
    if (!this.world.inBounds(x, y)) return;
    const tile = this.world.getTile(x, y);
    if (tile === TILE_TYPES.BEDROCK || tile === TILE_TYPES.EMPTY || tile === TILE_TYPES.CAVE) return;

    this.ui.showWarning('💥 塌方！', 800);
    this.renderer.shake(3, 0.5);

    const dx = (x + 0.5) * TILE_SIZE - this.player.x;
    const dy = (y + 0.5) * TILE_SIZE - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < TILE_SIZE * 1.8) {
      const damage = dist < TILE_SIZE ? 20 : 10;
      this.player.takeDamage(damage);
    }

    this.enemies.damageEnemyAt(
      (x + 0.5) * TILE_SIZE,
      (y + 0.5) * TILE_SIZE,
      TILE_SIZE * 1.5,
      50
    );

    const idx = this.world.getIndex(x, y);
    this.world.tiles[idx] = TILE_TYPES.EMPTY;
    this.world.tileHealth[idx] = 0;
    this.world.dugTiles[idx] = 1;

    this.particles.spawnCircle(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      this.getDustColor(tile),
      20,
      4
    );
    this.particles.spawn(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      this.getDustColor(tile),
      15,
      5
    );
  }

  checkEnemyKills() {
    const before = this.enemies.enemies.length;
    const killedEnemies = this.enemies.enemies.filter(e => e.health <= 0);
    
    for (const e of killedEnemies) {
      this.particles.spawnCircle(e.x, e.y, e.color, 12, 4);
      this.particles.spawn(e.x, e.y, '#FFD700', 6, 3, { gravity: -0.05 });
      this.stats.enemiesKilled++;
    }

    this.enemies.enemies = this.enemies.enemies.filter(e => e.health > 0);
  }

  checkLowResources() {
    const p = this.player;
    const depth = p.tileY - SURFACE_Y;

    if (depth > 10) {
      if (p.fuel < p.maxFuel * 0.1 && !this._fuelWarned) {
        this._fuelWarned = true;
        setTimeout(() => this._fuelWarned = false, 5000);
      }
      if (p.oxygen < p.maxOxygen * 0.1 && !this._oxyWarned) {
        this._oxyWarned = true;
        setTimeout(() => this._oxyWarned = false, 5000);
      }
    }
  }

  gameOver() {
    this.running = false;
    this.ui.hideHUD();
    this.ui.showGameOver({
      gold: this.player.gold,
      maxDepth: this.player.maxDepth,
      enemiesKilled: this.stats.enemiesKilled,
      blocksDug: this.stats.blocksDug
    });
  }

  restart() {
    this.init();
    this.ui.hideGameOver();
    this.start();
  }
}
