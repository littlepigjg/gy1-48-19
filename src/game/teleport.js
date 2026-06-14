import { TILE_SIZE, SURFACE_Y, WORLD_WIDTH } from './constants.js';

export class TeleportSystem {
  constructor() {
    this.active = false;
    this.progress = 0;
    this.duration = 2.5;
    this.costPer100Depth = 20;
    this.minCost = 30;
    this.cooldown = 0;
    this.cooldownMax = 5;
    this.cooldownOnCancel = 1.5;
    this.gracePeriod = 0;
    this.gracePeriodMax = 0.5;
  }

  calculateCost(currentDepth) {
    const depthCost = Math.ceil(currentDepth / 100) * this.costPer100Depth;
    return Math.max(this.minCost, depthCost);
  }

  canTeleport(player) {
    if (this.cooldown > 0) return { can: false, reason: '冷却中' };
    if (this.active) return { can: false, reason: '传送中' };
    
    const cost = this.calculateCost(Math.max(0, player.tileY - SURFACE_Y));
    if (player.gold < cost) return { can: false, reason: `金币不足（需要$${cost}）` };
    
    return { can: true, cost };
  }

  start(player) {
    const check = this.canTeleport(player);
    if (!check.can) return check;

    this.active = true;
    this.progress = 0;
    this.gracePeriod = this.gracePeriodMax;
    return { success: true, cost: check.cost };
  }

  cancel(force = false) {
    if (this.active) {
      if (!force && this.gracePeriod > 0) {
        return false;
      }
      this.active = false;
      this.progress = 0;
      this.cooldown = this.cooldownOnCancel;
      return true;
    }
    return false;
  }

  update(dt, player, world, particles, onComplete) {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
    }

    if (!this.active) return;

    if (this.gracePeriod > 0) {
      this.gracePeriod -= dt;
    }

    this.progress += dt / this.duration;

    const targetX = Math.floor(WORLD_WIDTH / 2);
    const targetY = SURFACE_Y - 1;
    const startProgress = Math.min(1, this.progress * 3);
    const endProgress = Math.max(0, (this.progress - 0.7) / 0.3);

    if (this.progress < 1 && Math.random() < 0.3) {
      particles.spawn(
        player.x + (Math.random() - 0.5) * 40,
        player.y + (Math.random() - 0.5) * 40,
        this.getTeleportColor(),
        1,
        3 + Math.random() * 2,
        { gravity: -0.05, lifeMin: 10, lifeMax: 20 }
      );
    }

    if (this.progress >= 1) {
      const cost = this.calculateCost(Math.max(0, player.tileY - SURFACE_Y));
      player.gold -= cost;
      
      player.x = targetX * TILE_SIZE + TILE_SIZE / 2;
      player.y = targetY * TILE_SIZE + TILE_SIZE / 2;
      player.tileX = targetX;
      player.tileY = targetY;
      
      this.active = false;
      this.progress = 0;
      this.cooldown = this.cooldownMax;

      for (let i = 0; i < 20; i++) {
        particles.spawn(
          player.x + (Math.random() - 0.5) * 60,
          player.y + (Math.random() - 0.5) * 60,
          this.getTeleportColor(),
          1,
          4 + Math.random() * 3,
          { gravity: -0.02, lifeMin: 20, lifeMax: 40 }
        );
      }

      if (onComplete) onComplete(cost);
    }
  }

  getTeleportColor() {
    const colors = ['#9B59B6', '#8E44AD', '#3498DB', '#2980B9', '#1ABC9C'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getProgressPercent() {
    return Math.min(100, this.progress * 100);
  }

  isTeleporting() {
    return this.active;
  }

  getCooldownPercent() {
    return this.cooldown > 0 ? (this.cooldown / this.cooldownMax) * 100 : 0;
  }
}
