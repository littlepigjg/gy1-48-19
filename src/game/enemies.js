import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, SURFACE_Y, TILE_TYPES } from './constants.js';

export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.spawnTimer = 0;
  }

  spawn(player, world) {
    const depth = player.tileY - SURFACE_Y;
    const maxDepth = WORLD_HEIGHT - SURFACE_Y;
    const depthRatio = depth / maxDepth;

    if (depthRatio < 0.15) return;
    if (this.enemies.length > 8 + Math.floor(depthRatio * 8)) return;

    this.spawnTimer--;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 180 + Math.floor(Math.random() * 120);

    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 10;
    let spawnX = player.x + Math.cos(angle) * dist * TILE_SIZE;
    let spawnY = player.y + Math.sin(angle) * dist * TILE_SIZE;

    spawnX = Math.max(TILE_SIZE * 2, Math.min(WORLD_WIDTH * TILE_SIZE - TILE_SIZE * 2, spawnX));
    spawnY = Math.max((SURFACE_Y + 3) * TILE_SIZE, Math.min((WORLD_HEIGHT - 5) * TILE_SIZE, spawnY));

    const tileX = Math.floor(spawnX / TILE_SIZE);
    const tileY = Math.floor(spawnY / TILE_SIZE);

    if (world.isSolid(tileX, tileY)) return;

    let enemyType;
    const r = Math.random();
    if (depthRatio < 0.3) {
      enemyType = r < 0.7 ? 'worm' : 'bat';
    } else if (depthRatio < 0.6) {
      if (r < 0.4) enemyType = 'worm';
      else if (r < 0.7) enemyType = 'bat';
      else enemyType = 'spider';
    } else {
      if (r < 0.25) enemyType = 'worm';
      else if (r < 0.5) enemyType = 'bat';
      else if (r < 0.8) enemyType = 'spider';
      else enemyType = 'demon';
    }

    this.enemies.push(this.createEnemy(enemyType, spawnX, spawnY));
  }

  createEnemy(type, x, y) {
    const baseStats = {
      worm: { health: 30, speed: 1.2, damage: 5, color: '#8B4513', size: 0.7, gold: 10 },
      bat: { health: 20, speed: 2.5, damage: 4, color: '#4B0082', size: 0.6, gold: 15 },
      spider: { health: 50, speed: 1.8, damage: 10, color: '#2F4F4F', size: 0.8, gold: 25 },
      demon: { health: 100, speed: 2.0, damage: 20, color: '#8B0000', size: 1.0, gold: 60 }
    };

    const stats = baseStats[type];
    return {
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      health: stats.health,
      maxHealth: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      color: stats.color,
      size: stats.size,
      gold: stats.gold,
      tileX: Math.floor(x / TILE_SIZE),
      tileY: Math.floor(y / TILE_SIZE),
      width: TILE_SIZE * stats.size,
      height: TILE_SIZE * stats.size,
      damageFlash: 0,
      aiTimer: 0,
      aiDir: { x: 0, y: 0 }
    };
  }

  update(dt, player, world) {
    this.spawn(player, world);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      e.tileX = Math.floor(e.x / TILE_SIZE);
      e.tileY = Math.floor(e.y / TILE_SIZE);

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 40 * TILE_SIZE) {
        this.enemies.splice(i, 1);
        continue;
      }

      e.aiTimer -= dt * 60;
      if (e.aiTimer <= 0) {
        e.aiTimer = 30 + Math.random() * 30;
        if (e.type === 'bat') {
          e.aiDir = {
            x: (Math.random() - 0.5) * 0.6,
            y: (Math.random() - 0.5) * 0.6
          };
        }
      }

      let moveX = 0, moveY = 0;

      if (dist < 15 * TILE_SIZE) {
        moveX = dx / dist;
        moveY = dy / dist;

        if (e.type === 'bat') {
          moveX += e.aiDir.x;
          moveY += e.aiDir.y;
          const l = Math.sqrt(moveX * moveX + moveY * moveY);
          if (l > 0) { moveX /= l; moveY /= l; }
        }
      } else {
        if (e.type === 'bat') {
          moveX = e.aiDir.x;
          moveY = e.aiDir.y;
        }
      }

      const speed = e.speed * dt * 60;
      const newX = e.x + moveX * speed;
      const newY = e.y + moveY * speed;

      if (e.type === 'bat' || !this.checkCollision(newX, e.y, e.width, e.height, world)) {
        e.x = newX;
      }
      if (e.type === 'bat' || !this.checkCollision(e.x, newY, e.width, e.height, world)) {
        e.y = newY;
      }

      e.x = Math.max(e.width / 2, Math.min(WORLD_WIDTH * TILE_SIZE - e.width / 2, e.x));
      e.y = Math.max(e.height / 2, Math.min(WORLD_HEIGHT * TILE_SIZE - e.height / 2, e.y));

      if (dist < TILE_SIZE * 0.8) {
        player.takeDamage(e.damage * dt);
      }

      if (e.damageFlash > 0) e.damageFlash -= dt;

      if (e.health <= 0) {
        player.gold += e.gold;
        this.enemies.splice(i, 1);
      }
    }
  }

  checkCollision(x, y, width, height, world) {
    const halfW = width / 2;
    const halfH = height / 2;
    
    const left = Math.floor((x - halfW) / TILE_SIZE);
    const right = Math.floor((x + halfW) / TILE_SIZE);
    const top = Math.floor((y - halfH) / TILE_SIZE);
    const bottom = Math.floor((y + halfH) / TILE_SIZE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (world.isSolid(tx, ty)) {
          return true;
        }
      }
    }
    return false;
  }

  checkBulletCollision(bullet) {
    for (const e of this.enemies) {
      const dx = bullet.x - e.x;
      const dy = bullet.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < e.width * 0.6) {
        e.health -= bullet.damage;
        e.damageFlash = 0.2;
        return true;
      }
    }
    return false;
  }

  damageEnemyAt(x, y, radius, damage) {
    for (const e of this.enemies) {
      const dx = e.x - x;
      const dy = e.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        e.health -= damage;
        e.damageFlash = 0.2;
      }
    }
  }
}
