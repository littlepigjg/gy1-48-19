import { describe, it, expect, beforeEach } from 'vitest';
import { TeleportSystem } from '../src/game/teleport.js';
import { TILE_SIZE, SURFACE_Y, WORLD_WIDTH } from '../src/game/constants.js';

describe('TeleportSystem', () => {
  let tp;
  let mockPlayer;
  let mockParticles;

  beforeEach(() => {
    tp = new TeleportSystem();
    mockPlayer = {
      gold: 500,
      tileX: Math.floor(WORLD_WIDTH / 2),
      tileY: SURFACE_Y + 50,
      x: 0,
      y: 0,
    };
    mockParticles = {
      spawn: () => {},
      spawnCircle: () => {},
    };
  });

  it('初始化时应该处于非活动状态，无冷却', () => {
    expect(tp.isTeleporting()).toBe(false);
    expect(tp.getProgressPercent()).toBe(0);
    expect(tp.getCooldownPercent()).toBe(0);
  });

  it('计算传送费用 - 浅层为最低费用', () => {
    expect(tp.calculateCost(0)).toBe(30);
    expect(tp.calculateCost(50)).toBe(30);
  });

  it('计算传送费用 - 100米深度费用增加', () => {
    expect(tp.calculateCost(100)).toBe(30);
    expect(tp.calculateCost(151)).toBe(40);
    expect(tp.calculateCost(200)).toBe(40);
    expect(tp.calculateCost(251)).toBe(60);
    expect(tp.calculateCost(350)).toBe(80);
  });

  it('金币不足时无法传送', () => {
    mockPlayer.gold = 10;
    const result = tp.start(mockPlayer);
    expect(result.success).toBeUndefined();
    expect(result.can).toBe(false);
    expect(result.reason).toContain('金币不足');
    expect(tp.isTeleporting()).toBe(false);
  });

  it('成功启动传送', () => {
    const result = tp.start(mockPlayer);
    expect(result.success).toBe(true);
    expect(result.cost).toBeGreaterThanOrEqual(30);
    expect(tp.isTeleporting()).toBe(true);
  });

  it('传送中再次启动会失败', () => {
    tp.start(mockPlayer);
    const result = tp.start(mockPlayer);
    expect(result.success).toBeUndefined();
    expect(result.can).toBe(false);
    expect(result.reason).toContain('传送中');
  });

  it('取消传送后应该有1.5秒短冷却', () => {
    tp.start(mockPlayer);
    expect(tp.isTeleporting()).toBe(true);
    const cancelled = tp.cancel(true);
    expect(cancelled).toBe(true);
    expect(tp.isTeleporting()).toBe(false);
    expect(tp.cooldown).toBe(tp.cooldownOnCancel);
    expect(tp.getCooldownPercent()).toBeCloseTo((1.5 / 5) * 100);
  });

  it('保护期内非强制取消应该失败', () => {
    tp.start(mockPlayer);
    expect(tp.gracePeriod).toBe(tp.gracePeriodMax);
    const cancelled = tp.cancel(false);
    expect(cancelled).toBe(false);
    expect(tp.isTeleporting()).toBe(true);
  });

  it('保护期后取消应该成功', () => {
    tp.start(mockPlayer);
    tp.update(tp.gracePeriodMax + 0.1, mockPlayer, null, mockParticles);
    const cancelled = tp.cancel(false);
    expect(cancelled).toBe(true);
    expect(tp.isTeleporting()).toBe(false);
  });

  it('保护期内强制取消应该成功', () => {
    tp.start(mockPlayer);
    const cancelled = tp.cancel(true);
    expect(cancelled).toBe(true);
    expect(tp.isTeleporting()).toBe(false);
  });

  it('取消后需要等1.5秒冷却才能重开，比完整冷却短', () => {
    tp.start(mockPlayer);
    tp.cancel(true);
    expect(tp.cooldown).toBe(1.5);

    let result = tp.start(mockPlayer);
    expect(result.can).toBe(false);
    expect(result.reason).toContain('冷却中');

    tp.update(1, mockPlayer, null, mockParticles);
    result = tp.start(mockPlayer);
    expect(result.can).toBe(false);

    tp.update(0.6, mockPlayer, null, mockParticles);
    result = tp.start(mockPlayer);
    expect(result.success).toBe(true);
  });

  it('完成传送后会进入冷却期', () => {
    tp.start(mockPlayer);
    tp.update(tp.duration + 0.1, mockPlayer, null, mockParticles, () => {});
    expect(tp.isTeleporting()).toBe(false);
    expect(tp.cooldown).toBe(tp.cooldownMax);
    expect(tp.getCooldownPercent()).toBe(100);
  });

  it('冷却期内无法传送', () => {
    tp.start(mockPlayer);
    tp.update(tp.duration + 0.1, mockPlayer, null, mockParticles, () => {});
    const result = tp.start(mockPlayer);
    expect(result.can).toBe(false);
    expect(result.reason).toContain('冷却中');
  });

  it('冷却期随时间减少', () => {
    tp.start(mockPlayer);
    tp.update(tp.duration + 0.1, mockPlayer, null, mockParticles, () => {});
    expect(tp.getCooldownPercent()).toBe(100);
    tp.update(tp.cooldownMax / 2, mockPlayer, null, mockParticles, () => {});
    expect(tp.getCooldownPercent()).toBeCloseTo(50);
    tp.update(tp.cooldownMax / 2 + 0.1, mockPlayer, null, mockParticles, () => {});
    expect(tp.getCooldownPercent()).toBe(0);
  });

  it('完成传送会扣除金币并移动玩家到基地', () => {
    const startGold = mockPlayer.gold;
    const expectedCost = tp.calculateCost(mockPlayer.tileY - SURFACE_Y);
    let actualCost = null;

    tp.start(mockPlayer);
    tp.update(tp.duration + 0.1, mockPlayer, null, mockParticles, (cost) => {
      actualCost = cost;
    });

    expect(mockPlayer.gold).toBe(startGold - expectedCost);
    expect(actualCost).toBe(expectedCost);
    expect(mockPlayer.tileX).toBe(Math.floor(WORLD_WIDTH / 2));
    expect(mockPlayer.tileY).toBe(SURFACE_Y - 1);
    expect(mockPlayer.x).toBe(Math.floor(WORLD_WIDTH / 2) * TILE_SIZE + TILE_SIZE / 2);
    expect(mockPlayer.y).toBe((SURFACE_Y - 1) * TILE_SIZE + TILE_SIZE / 2);
  });

  it('进度随时间线性增加', () => {
    tp.start(mockPlayer);
    tp.update(tp.duration * 0.5, mockPlayer, null, mockParticles);
    expect(tp.getProgressPercent()).toBeCloseTo(50);
  });
});
