import { TILE_SIZE, WORLD_WIDTH, SURFACE_Y, UPGRADE_DEFS, TILE_TYPES } from './constants.js';

export class Player {
  constructor(startX, startY) {
    this.x = startX * TILE_SIZE + TILE_SIZE / 2;
    this.y = startY * TILE_SIZE + TILE_SIZE / 2;
    this.tileX = startX;
    this.tileY = startY;
    this.vx = 0;
    this.vy = 0;
    this.width = TILE_SIZE * 0.8;
    this.height = TILE_SIZE * 0.8;
    this.facing = 'down';
    this.moving = false;

    this.upgrades = {
      engine: 0,
      drill: 0,
      cargo: 0,
      fuel_tank: 0,
      oxygen_tank: 0,
      cooling: 0,
      armor: 0,
      weapon: 0
    };

    this.maxFuel = 100 + this.upgrades.fuel_tank * 40;
    this.fuel = this.maxFuel;
    this.maxOxygen = 100 + this.upgrades.oxygen_tank * 40;
    this.oxygen = this.maxOxygen;
    this.maxHeat = 100;
    this.heat = 20;
    this.maxCargo = 50 + this.upgrades.cargo * 30;
    this.cargoUsed = 0;
    this.maxHealth = 100 + this.upgrades.armor * 30;
    this.health = this.maxHealth;

    this.speed = 3 + this.upgrades.engine * 0.6;
    this.drillPower = 1 + this.upgrades.drill;
    this.heatGeneration = 0.15 - this.upgrades.cooling * 0.02;
    this.coolingRate = 0.08 + this.upgrades.cooling * 0.03;
    this.fuelConsumption = 0.03 - this.upgrades.engine * 0.004;
    this.oxygenConsumption = 0.02;
    this.damageReduction = this.upgrades.armor * 0.1;
    this.weaponDamage = 10 + this.upgrades.weapon * 8;
    this.weaponCooldown = Math.max(150, 500 - this.upgrades.weapon * 70);
    this.lastShot = 0;

    this.gold = 0;
    this.cargo = {
      coal: 0,
      iron: 0,
      gold: 0,
      emerald: 0,
      ruby: 0,
      diamond: 0
    };

    this.maxDepth = 0;
    this.damageFlash = 0;
    this.diggingTarget = null;
    this.diggingProgress = 0;
  }

  applyUpgrades() {
    const oldMaxHealth = this.maxHealth;
    const oldMaxFuel = this.maxFuel;
    const oldMaxOxygen = this.maxOxygen;
    const oldMaxCargo = this.maxCargo;

    this.maxFuel = 100 + this.upgrades.fuel_tank * 40;
    this.maxOxygen = 100 + this.upgrades.oxygen_tank * 40;
    this.maxCargo = 50 + this.upgrades.cargo * 30;
    this.maxHealth = 100 + this.upgrades.armor * 30;
    
    this.speed = 3 + this.upgrades.engine * 0.6;
    this.drillPower = 1 + this.upgrades.drill;
    this.heatGeneration = 0.15 - this.upgrades.cooling * 0.02;
    this.coolingRate = 0.08 + this.upgrades.cooling * 0.03;
    this.fuelConsumption = 0.03 - this.upgrades.engine * 0.004;
    this.damageReduction = this.upgrades.armor * 0.1;
    this.weaponDamage = 10 + this.upgrades.weapon * 8;
    this.weaponCooldown = Math.max(150, 500 - this.upgrades.weapon * 70);

    this.fuel += (this.maxFuel - oldMaxFuel);
    this.oxygen += (this.maxOxygen - oldMaxOxygen);
    this.health += (this.maxHealth - oldMaxHealth);
    if (this.fuel > this.maxFuel) this.fuel = this.maxFuel;
    if (this.oxygen > this.maxOxygen) this.oxygen = this.maxOxygen;
    if (this.health > this.maxHealth) this.health = this.maxHealth;
  }

  getUpgradeCost(type) {
    const level = this.upgrades[type];
    const def = UPGRADE_DEFS[type];
    if (level >= def.maxLevel) return null;
    return def.costs[level];
  }

  buyUpgrade(type) {
    const cost = this.getUpgradeCost(type);
    if (cost === null || this.gold < cost) return false;
    this.gold -= cost;
    this.upgrades[type]++;
    this.applyUpgrades();
    return true;
  }

  addOre(oreType) {
    if (this.cargoUsed >= this.maxCargo) return false;
    this.cargo[oreType]++;
    this.cargoUsed++;
    return true;
  }

  sellOres(prices, depthBonusMultiplier = 1) {
    let total = 0;
    let bonus = 0;
    for (const [type, count] of Object.entries(this.cargo)) {
      const baseValue = count * prices[type];
      total += baseValue;
      bonus += baseValue * (depthBonusMultiplier - 1);
      this.cargo[type] = 0;
    }
    const finalTotal = Math.floor(total + bonus);
    this.gold += finalTotal;
    this.cargoUsed = 0;
    return { total: finalTotal, base: Math.floor(total), bonus: Math.floor(bonus) };
  }

  sellOre(type, prices, depthBonusMultiplier = 1) {
    const count = this.cargo[type];
    if (count <= 0) return { total: 0, base: 0, bonus: 0 };
    const baseValue = count * prices[type];
    const bonus = baseValue * (depthBonusMultiplier - 1);
    const finalValue = Math.floor(baseValue + bonus);
    this.gold += finalValue;
    this.cargoUsed -= count;
    this.cargo[type] = 0;
    return { total: finalValue, base: Math.floor(baseValue), bonus: Math.floor(bonus) };
  }

  takeDamage(amount) {
    const reduced = amount * (1 - this.damageReduction);
    this.health -= reduced;
    this.damageFlash = 0.5;
    if (this.health < 0) this.health = 0;
    return reduced;
  }

  addHeat(amount) {
    this.heat += amount;
    if (this.heat > this.maxHeat) {
      const overflow = this.heat - this.maxHeat;
      this.takeDamage(overflow * 0.5);
      this.heat = this.maxHeat;
    }
  }

  canShoot(now) {
    return now - this.lastShot >= this.weaponCooldown;
  }

  shoot(now, dirX, dirY) {
    if (!this.canShoot(now)) return null;
    this.lastShot = now;
    return {
      x: this.x,
      y: this.y,
      vx: dirX * 10,
      vy: dirY * 10,
      damage: this.weaponDamage,
      life: 60
    };
  }

  update(dt, world, input) {
    this.tileX = Math.floor(this.x / TILE_SIZE);
    this.tileY = Math.floor(this.y / TILE_SIZE);
    
    const depth = this.tileY - SURFACE_Y;
    if (depth > this.maxDepth) this.maxDepth = depth;

    let moveX = 0, moveY = 0;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;
    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;

    this.moving = moveX !== 0 || moveY !== 0;

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= len;
      moveY /= len;
      
      if (Math.abs(moveX) > Math.abs(moveY)) {
        this.facing = moveX > 0 ? 'right' : 'left';
      } else {
        this.facing = moveY > 0 ? 'down' : 'up';
      }
    }

    const moveSpeed = this.speed * dt * 60;
    const newX = this.x + moveX * moveSpeed;
    const newY = this.y + moveY * moveSpeed;

    if (!this.checkCollision(newX, this.y, world)) {
      this.x = newX;
    }
    if (!this.checkCollision(this.x, newY, world)) {
      this.y = newY;
    }

    this.x = Math.max(this.width / 2, Math.min(WORLD_WIDTH * TILE_SIZE - this.width / 2, this.x));
    this.y = Math.max(this.height / 2, this.y);

    const isUnderground = this.tileY >= SURFACE_Y;

    if (this.moving) {
      this.fuel -= this.fuelConsumption * dt * 60;
    }

    if (isUnderground) {
      this.oxygen -= this.oxygenConsumption * dt * 60;
    } else {
      this.oxygen = Math.min(this.maxOxygen, this.oxygen + this.oxygenConsumption * 3 * dt * 60);
    }

    if (this.moving && isUnderground) {
      this.addHeat(this.heatGeneration * dt * 60);
    } else if (!isUnderground) {
      this.heat = Math.max(20, this.heat - this.coolingRate * 2 * dt * 60);
    } else {
      this.heat = Math.max(20, this.heat - this.coolingRate * dt * 60);
    }

    if (this.fuel < 0) {
      this.fuel = 0;
      this.health -= 0.1 * dt * 60;
    }
    if (this.oxygen < 0) {
      this.oxygen = 0;
      this.health -= 0.3 * dt * 60;
    }

    if (this.damageFlash > 0) {
      this.damageFlash -= dt;
    }
  }

  checkCollision(x, y, world) {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    
    const left = Math.floor((x - halfW) / TILE_SIZE);
    const right = Math.floor((x + halfW) / TILE_SIZE);
    const top = Math.floor((y - halfH) / TILE_SIZE);
    const bottom = Math.floor((y + halfH) / TILE_SIZE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        const tile = world.getTile(tx, ty);
        if (world.isSolid(tx, ty)) {
          if (tile === TILE_TYPES.LAVA) {
            this.takeDamage(2);
            this.addHeat(5);
          }
          return true;
        }
      }
    }
    return false;
  }

  isOnSurface() {
    return this.tileY < SURFACE_Y + 2;
  }

  getDigTarget() {
    let targetX = this.tileX;
    let targetY = this.tileY;

    switch (this.facing) {
      case 'up': targetY -= 1; break;
      case 'down': targetY += 1; break;
      case 'left': targetX -= 1; break;
      case 'right': targetX += 1; break;
    }

    return { x: targetX, y: targetY };
  }
}
