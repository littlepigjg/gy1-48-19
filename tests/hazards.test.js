import { describe, it, expect, beforeEach } from 'vitest';
import { PoisonGasCloud, HazardManager } from '../src/game/hazards.js';
import { TILE_SIZE } from '../src/game/constants.js';

describe('PoisonGasCloud', () => {
  it('应该环绕中心点均匀生成（不挤在一起）', () => {
    const centerX = 400;
    const centerY = 600;
    const total = 5;
    const clouds = [];

    for (let i = 0; i < total; i++) {
      clouds.push(new PoisonGasCloud(centerX, centerY, 10, 15, i, total));
    }

    expect(clouds.length).toBe(5);

    for (let i = 0; i < clouds.length; i++) {
      const dx = clouds[i].x - centerX;
      const dy = clouds[i].y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeGreaterThan(TILE_SIZE * 0.3);
      expect(dist).toBeLessThan(TILE_SIZE * 2);
    }

    for (let i = 0; i < clouds.length; i++) {
      for (let j = i + 1; j < clouds.length; j++) {
        const dx = clouds[i].x - clouds[j].x;
        const dy = clouds[i].y - clouds[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThan(TILE_SIZE * 0.5);
      }
    }
  });

  it('应该有向外扩散的初速度', () => {
    const centerX = 400;
    const centerY = 600;
    const cloud = new PoisonGasCloud(centerX, centerY, 10, 15, 0, 5);

    expect(Math.abs(cloud.vx)).toBeGreaterThan(0);
    expect(cloud.vy).toBeLessThanOrEqual(0);
  });

  it('应该有合理的生命值和尺寸', () => {
    const cloud = new PoisonGasCloud(400, 600, 10, 15, 0, 5);
    expect(cloud.life).toBeGreaterThan(400);
    expect(cloud.life).toBeLessThan(900);
    expect(cloud.size).toBeGreaterThan(TILE_SIZE * 0.8);
    expect(cloud.size).toBeLessThan(TILE_SIZE * 1.5);
  });

  it('update应该减少生命值', () => {
    const cloud = new PoisonGasCloud(400, 600, 10, 15, 0, 5);
    const startLife = cloud.life;
    const mockWorld = { isSolid: () => false };
    cloud.update(1, mockWorld);
    expect(cloud.life).toBeLessThan(startLife);
  });

  it('生命耗尽后isAlive返回false', () => {
    const cloud = new PoisonGasCloud(400, 600, 10, 15, 0, 5);
    cloud.life = 0.1;
    const mockWorld = { isSolid: () => false };
    const alive = cloud.update(1, mockWorld);
    expect(alive).toBe(false);
    expect(cloud.isAlive()).toBe(false);
  });

  it('伤害半径应该小于总体尺寸', () => {
    const cloud = new PoisonGasCloud(400, 600, 10, 15, 0, 5);
    expect(cloud.getDamageRadius()).toBeLessThan(cloud.size);
    expect(cloud.getDamageRadius()).toBeGreaterThan(0);
  });
});

describe('HazardManager', () => {
  let hm;
  let mockPlayer;
  let mockWorld;
  let damageEvents;

  beforeEach(() => {
    hm = new HazardManager();
    mockPlayer = { x: 400, y: 600, health: 100 };
    mockWorld = { isSolid: () => false };
    damageEvents = [];
  });

  it('初始应该为空', () => {
    expect(hm.poisonClouds.length).toBe(0);
    expect(hm.collapseWarnings.length).toBe(0);
  });

  it('spawnPoisonClouds最多创建5个云', () => {
    hm.spawnPoisonClouds(400, 600, 8);
    expect(hm.poisonClouds.length).toBe(5);

    hm.spawnPoisonClouds(400, 600, 3);
    expect(hm.poisonClouds.length).toBe(5 + 3);
  });

  it('默认创建5个毒气云', () => {
    hm.spawnPoisonClouds(400, 600);
    expect(hm.poisonClouds.length).toBe(5);
  });

  it('毒气云应该环绕生成点均匀分布', () => {
    const cx = 800;
    const cy = 1200;
    hm.spawnPoisonClouds(cx, cy, 5);

    for (const cloud of hm.poisonClouds) {
      const dx = cloud.x - cx;
      const dy = cloud.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeGreaterThan(TILE_SIZE * 0.3);
    }
  });

  it('毒气云不应该有独立的damageTimer（改为全局计时器）', () => {
    const cloud = new PoisonGasCloud(400, 600, 10, 15, 0, 5);
    expect(cloud.damageTimer).toBeUndefined();
  });

  it('玩家靠近毒气云会受到伤害（全局计时器）', () => {
    hm.spawnPoisonClouds(mockPlayer.x, mockPlayer.y, 5);
    for (const cloud of hm.poisonClouds) {
      cloud.x = mockPlayer.x;
      cloud.y = mockPlayer.y;
    }
    const startHealth = mockPlayer.health;

    for (let i = 0; i < 12; i++) {
      hm.update(0.1, mockWorld, mockPlayer, (type, dmg) => {
        damageEvents.push({ type, dmg });
        mockPlayer.health -= dmg;
      });
    }

    expect(damageEvents.length).toBeGreaterThan(0);
    for (const ev of damageEvents) {
      expect(ev.type).toBe('poison');
      expect(ev.dmg).toBeGreaterThan(0);
      expect(ev.dmg).toBeLessThanOrEqual(hm.maxDamagePerTick + 0.01);
    }
    expect(mockPlayer.health).toBeLessThan(startHealth);
  });

  it('多个毒气云重叠时伤害有上限', () => {
    hm.spawnPoisonClouds(mockPlayer.x, mockPlayer.y, 5);
    for (const cloud of hm.poisonClouds) {
      cloud.x = mockPlayer.x;
      cloud.y = mockPlayer.y;
    }

    const damages = [];
    for (let i = 0; i < 12; i++) {
      hm.update(0.1, mockWorld, mockPlayer, (type, dmg) => {
        damages.push(dmg);
        mockPlayer.health -= dmg;
      });
    }

    expect(damages.length).toBeGreaterThan(0);
    for (const dmg of damages) {
      expect(dmg).toBeLessThanOrEqual(hm.maxDamagePerTick + 0.01);
    }
  });

  it('毒气云之间有排斥力，避免扎堆', () => {
    for (let i = 0; i < 5; i++) {
      const cloud = new PoisonGasCloud(mockPlayer.x, mockPlayer.y, 10, 15, i, 5);
      cloud.x = mockPlayer.x + (Math.random() - 0.5) * 10;
      cloud.y = mockPlayer.y + (Math.random() - 0.5) * 10;
      cloud.vx = 0;
      cloud.vy = 0;
      hm.poisonClouds.push(cloud);
    }

    const startPositions = hm.poisonClouds.map(c => ({ x: c.x, y: c.y }));

    for (let i = 0; i < 20; i++) {
      hm.update(0.1, mockWorld, mockPlayer, () => {});
    }

    let totalMoved = 0;
    for (let i = 0; i < hm.poisonClouds.length; i++) {
      const dx = hm.poisonClouds[i].x - startPositions[i].x;
      const dy = hm.poisonClouds[i].y - startPositions[i].y;
      totalMoved += Math.sqrt(dx * dx + dy * dy);
    }
    expect(totalMoved).toBeGreaterThan(10);

    for (let i = 0; i < hm.poisonClouds.length; i++) {
      for (let j = i + 1; j < hm.poisonClouds.length; j++) {
        const dx = hm.poisonClouds[i].x - hm.poisonClouds[j].x;
        const dy = hm.poisonClouds[i].y - hm.poisonClouds[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThan(TILE_SIZE * 0.3);
      }
    }
  });

  it('毒气云速度有上限，不会无限加速', () => {
    const cloud = new PoisonGasCloud(mockPlayer.x, mockPlayer.y, 10, 15, 0, 5);
    cloud.vx = 10;
    cloud.vy = 10;
    hm.poisonClouds.push(cloud);

    hm.update(0.1, mockWorld, mockPlayer, () => {});

    const speed = Math.sqrt(cloud.vx * cloud.vx + cloud.vy * cloud.vy);
    expect(speed).toBeLessThanOrEqual(0.81);
  });

  it('玩家远离毒气云不会受伤', () => {
    hm.spawnPoisonClouds(400, 600, 5);
    mockPlayer.x = 400 + TILE_SIZE * 20;
    mockPlayer.y = 600 + TILE_SIZE * 20;

    for (let i = 0; i < 30; i++) {
      hm.update(0.1, mockWorld, mockPlayer, (type, dmg) => {
        damageEvents.push({ type, dmg });
      });
    }

    expect(damageEvents.length).toBe(0);
  });

  it('update会清理过期的毒气云', () => {
    hm.spawnPoisonClouds(400, 600, 5);
    expect(hm.poisonClouds.length).toBe(5);

    for (let i = 0; i < 100; i++) {
      hm.update(0.5, mockWorld, mockPlayer, () => {});
    }

    expect(hm.poisonClouds.length).toBe(0);
  });

  it('addCollapseWarning添加警告', () => {
    hm.addCollapseWarning(10, 20);
    expect(hm.collapseWarnings.length).toBe(1);
    expect(hm.collapseWarnings[0].tileX).toBe(10);
    expect(hm.collapseWarnings[0].tileY).toBe(20);
  });

  it('update会清理过期的塌方警告', () => {
    hm.addCollapseWarning(10, 20);
    expect(hm.collapseWarnings.length).toBe(1);

    for (let i = 0; i < 10; i++) {
      hm.update(0.5, mockWorld, mockPlayer, () => {});
    }

    expect(hm.collapseWarnings.length).toBe(0);
  });

  it('clear会清空所有内容', () => {
    hm.spawnPoisonClouds(400, 600, 5);
    hm.addCollapseWarning(10, 20);
    expect(hm.poisonClouds.length).toBe(5);
    expect(hm.collapseWarnings.length).toBe(1);

    hm.clear();
    expect(hm.poisonClouds.length).toBe(0);
    expect(hm.collapseWarnings.length).toBe(0);
  });

  it('getTotalPoisonDamage返回正确伤害', () => {
    expect(hm.getTotalPoisonDamage(0.1)).toBe(0);
    hm.spawnPoisonClouds(400, 600, 3);
    expect(hm.getTotalPoisonDamage(0.1)).toBeGreaterThan(0);
  });
});
