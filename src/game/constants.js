export const TILE_SIZE = 40;
export const WORLD_WIDTH = 200;
export const WORLD_HEIGHT = 500;
export const SURFACE_Y = 20;

export const TILE_TYPES = {
  EMPTY: 0,
  DIRT: 1,
  STONE: 2,
  HARD_STONE: 3,
  LAVA: 4,
  BEDROCK: 5,
  ORE_COAL: 10,
  ORE_IRON: 11,
  ORE_GOLD: 12,
  ORE_EMERALD: 13,
  ORE_RUBY: 14,
  ORE_DIAMOND: 15,
  CAVE: 20,
  POISON_GAS: 21,
  INSTABILITY: 22
};

export const TILE_COLORS = {
  [TILE_TYPES.EMPTY]: null,
  [TILE_TYPES.DIRT]: ['#8B4513', '#A0522D', '#6B3E0A'],
  [TILE_TYPES.STONE]: ['#696969', '#808080', '#555555'],
  [TILE_TYPES.HARD_STONE]: ['#4A4A4A', '#5A5A5A', '#3A3A3A'],
  [TILE_TYPES.LAVA]: ['#FF4500', '#FF6347', '#FF0000'],
  [TILE_TYPES.BEDROCK]: ['#1a1a1a', '#2a2a2a', '#0a0a0a'],
  [TILE_TYPES.ORE_COAL]: ['#2F2F2F', '#1f1f1f', '#3f3f3f'],
  [TILE_TYPES.ORE_IRON]: ['#B87333', '#CD853F', '#A0522D'],
  [TILE_TYPES.ORE_GOLD]: ['#FFD700', '#FFA500', '#FFEC8B'],
  [TILE_TYPES.ORE_EMERALD]: ['#50C878', '#3CB371', '#98FB98'],
  [TILE_TYPES.ORE_RUBY]: ['#E0115F', '#DC143C', '#FF69B4'],
  [TILE_TYPES.ORE_DIAMOND]: ['#00CED1', '#40E0D0', '#AFEEEE'],
  [TILE_TYPES.CAVE]: null,
  [TILE_TYPES.POISON_GAS]: ['#7CFC00', '#90EE90', '#32CD32'],
  [TILE_TYPES.INSTABILITY]: ['#8B0000', '#8B008B', '#FF8C00']
};

export const TILE_HARDNESS = {
  [TILE_TYPES.EMPTY]: 0,
  [TILE_TYPES.DIRT]: 1,
  [TILE_TYPES.STONE]: 2,
  [TILE_TYPES.HARD_STONE]: 4,
  [TILE_TYPES.LAVA]: 999,
  [TILE_TYPES.BEDROCK]: 999,
  [TILE_TYPES.ORE_COAL]: 2,
  [TILE_TYPES.ORE_IRON]: 3,
  [TILE_TYPES.ORE_GOLD]: 3,
  [TILE_TYPES.ORE_EMERALD]: 4,
  [TILE_TYPES.ORE_RUBY]: 4,
  [TILE_TYPES.ORE_DIAMOND]: 5,
  [TILE_TYPES.CAVE]: 0,
  [TILE_TYPES.POISON_GAS]: 1,
  [TILE_TYPES.INSTABILITY]: 2
};

export const ORE_PRICES = {
  coal: 5,
  iron: 15,
  gold: 50,
  emerald: 100,
  ruby: 150,
  diamond: 300
};

export const ORE_NAMES = {
  coal: '煤炭',
  iron: '铁矿',
  gold: '金矿',
  emerald: '祖母绿',
  ruby: '红宝石',
  diamond: '钻石'
};

export const TILE_ORE_MAP = {
  [TILE_TYPES.ORE_COAL]: 'coal',
  [TILE_TYPES.ORE_IRON]: 'iron',
  [TILE_TYPES.ORE_GOLD]: 'gold',
  [TILE_TYPES.ORE_EMERALD]: 'emerald',
  [TILE_TYPES.ORE_RUBY]: 'ruby',
  [TILE_TYPES.ORE_DIAMOND]: 'diamond'
};

export const UPGRADE_DEFS = {
  engine: {
    name: '发动机',
    icon: '🚀',
    description: '提升移动速度，降低燃料消耗',
    maxLevel: 5,
    costs: [200, 500, 1200, 3000, 8000]
  },
  drill: {
    name: '钻头',
    icon: '⛏️',
    description: '提升钻探速度，可挖更硬的矿石',
    maxLevel: 5,
    costs: [300, 800, 2000, 5000, 12000]
  },
  cargo: {
    name: '货仓',
    icon: '📦',
    description: '增加货仓容量',
    maxLevel: 5,
    costs: [150, 400, 1000, 2500, 6000]
  },
  fuel_tank: {
    name: '燃料罐',
    icon: '⛽',
    description: '增加燃料容量',
    maxLevel: 5,
    costs: [100, 300, 800, 2000, 5000]
  },
  oxygen_tank: {
    name: '氧气罐',
    icon: '💨',
    description: '增加氧气容量',
    maxLevel: 5,
    costs: [120, 350, 900, 2200, 5500]
  },
  cooling: {
    name: '冷却系统',
    icon: '❄️',
    description: '提升散热效率，降低温度上升速度',
    maxLevel: 5,
    costs: [180, 450, 1100, 2800, 7000]
  },
  armor: {
    name: '装甲',
    icon: '🛡️',
    description: '增加最大生命值，减少伤害',
    maxLevel: 5,
    costs: [250, 600, 1500, 4000, 10000]
  },
  weapon: {
    name: '武器系统',
    icon: '⚔️',
    description: '提升攻击力和射速',
    maxLevel: 5,
    costs: [350, 800, 2000, 5000, 12000]
  }
};

export const DEPTH_BONUS_MULTIPLIER = 0.003;

export const TELEPORT_COST_BASE = 30;
export const TELEPORT_COST_PER_100M = 20;
export const TELEPORT_DURATION = 2.5;
export const TELEPORT_COOLDOWN = 5;
