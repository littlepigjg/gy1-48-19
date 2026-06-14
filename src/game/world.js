import { SimplexNoise } from '../utils/noise.js';
import {
  TILE_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SURFACE_Y,
  TILE_TYPES,
  TILE_HARDNESS,
  TILE_ORE_MAP
} from './constants.js';

export class World {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
    this.noise2 = new SimplexNoise(seed + 1);
    this.noise3 = new SimplexNoise(seed + 2);
    this.tiles = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);
    this.tileHealth = new Float32Array(WORLD_WIDTH * WORLD_HEIGHT);
    this.dugTiles = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);
    this.generate();
  }

  getIndex(x, y) {
    return y * WORLD_WIDTH + x;
  }

  inBounds(x, y) {
    return x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT;
  }

  getTile(x, y) {
    if (!this.inBounds(x, y)) return TILE_TYPES.BEDROCK;
    return this.tiles[this.getIndex(x, y)];
  }

  setTile(x, y, type) {
    if (!this.inBounds(x, y)) return;
    const idx = this.getIndex(x, y);
    this.tiles[idx] = type;
    if (type !== TILE_TYPES.EMPTY) {
      this.tileHealth[idx] = TILE_HARDNESS[type] * 100;
    }
  }

  isDug(x, y) {
    if (!this.inBounds(x, y)) return false;
    return this.dugTiles[this.getIndex(x, y)] === 1;
  }

  generate() {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const idx = this.getIndex(x, y);
        
        if (y >= WORLD_HEIGHT - 2) {
          this.tiles[idx] = TILE_TYPES.BEDROCK;
          continue;
        }

        if (y < SURFACE_Y) {
          this.tiles[idx] = TILE_TYPES.EMPTY;
          continue;
        }

        if (y === SURFACE_Y) {
          this.tiles[idx] = TILE_TYPES.DIRT;
          this.tileHealth[idx] = TILE_HARDNESS[TILE_TYPES.DIRT] * 100;
          continue;
        }

        const depth = y - SURFACE_Y;
        const maxDepth = WORLD_HEIGHT - SURFACE_Y;
        const depthRatio = depth / maxDepth;

        const baseNoise = this.noise.fbm(x * 0.03, y * 0.03, 4, 0.5, 2);
        const caveNoise = this.noise2.fbm(x * 0.05, y * 0.05, 3, 0.6, 2.2);
        const detailNoise = this.noise3.fbm(x * 0.1, y * 0.1, 2, 0.5, 2);

        const combined = baseNoise * 0.7 + detailNoise * 0.3;
        const stoneThreshold = 0.05 + depthRatio * 0.15;
        const hardStoneThreshold = 0.25 + depthRatio * 0.2;

        let tileType;

        if (caveNoise > 0.55 && depthRatio > 0.1 && depthRatio < 0.95) {
          const caveSize = (caveNoise - 0.55) / 0.45;
          if (caveSize > 0.3 || Math.random() < caveSize * 0.5) {
            tileType = TILE_TYPES.CAVE;
          } else {
            tileType = this.pickStoneType(combined, stoneThreshold, hardStoneThreshold, depthRatio);
          }
        } else {
          tileType = this.pickStoneType(combined, stoneThreshold, hardStoneThreshold, depthRatio);
        }

        if (tileType !== TILE_TYPES.CAVE && Math.random() < 0.003 + depthRatio * 0.008) {
          tileType = this.pickOre(depthRatio);
        }

        if (tileType !== TILE_TYPES.CAVE && depthRatio > 0.7 && Math.random() < 0.015) {
          tileType = TILE_TYPES.LAVA;
        }

        if (tileType === TILE_TYPES.CAVE) {
          this.tiles[idx] = TILE_TYPES.CAVE;
          continue;
        }

        if (depthRatio > 0.3 && tileType === TILE_TYPES.STONE && Math.random() < 0.008) {
          tileType = TILE_TYPES.INSTABILITY;
        }

        if (depthRatio > 0.2 && tileType === TILE_TYPES.DIRT && Math.random() < 0.005) {
          tileType = TILE_TYPES.POISON_GAS;
        }

        this.tiles[idx] = tileType;
        if (tileType !== TILE_TYPES.EMPTY && tileType !== TILE_TYPES.CAVE) {
          this.tileHealth[idx] = TILE_HARDNESS[tileType] * 100;
        }
      }
    }
  }

  pickStoneType(noiseVal, stoneThresh, hardThresh, depthRatio) {
    if (noiseVal < stoneThresh) {
      return depthRatio < 0.15 ? TILE_TYPES.DIRT : TILE_TYPES.STONE;
    } else if (noiseVal < hardThresh) {
      return TILE_TYPES.STONE;
    } else {
      return TILE_TYPES.HARD_STONE;
    }
  }

  pickOre(depthRatio) {
    const r = Math.random();
    if (depthRatio < 0.2) {
      if (r < 0.7) return TILE_TYPES.ORE_COAL;
      if (r < 0.95) return TILE_TYPES.ORE_IRON;
      return TILE_TYPES.ORE_GOLD;
    } else if (depthRatio < 0.4) {
      if (r < 0.4) return TILE_TYPES.ORE_COAL;
      if (r < 0.75) return TILE_TYPES.ORE_IRON;
      if (r < 0.92) return TILE_TYPES.ORE_GOLD;
      return TILE_TYPES.ORE_EMERALD;
    } else if (depthRatio < 0.6) {
      if (r < 0.2) return TILE_TYPES.ORE_IRON;
      if (r < 0.5) return TILE_TYPES.ORE_GOLD;
      if (r < 0.75) return TILE_TYPES.ORE_EMERALD;
      if (r < 0.9) return TILE_TYPES.ORE_RUBY;
      return TILE_TYPES.ORE_DIAMOND;
    } else if (depthRatio < 0.8) {
      if (r < 0.15) return TILE_TYPES.ORE_GOLD;
      if (r < 0.35) return TILE_TYPES.ORE_EMERALD;
      if (r < 0.6) return TILE_TYPES.ORE_RUBY;
      return TILE_TYPES.ORE_DIAMOND;
    } else {
      if (r < 0.1) return TILE_TYPES.ORE_EMERALD;
      if (r < 0.4) return TILE_TYPES.ORE_RUBY;
      return TILE_TYPES.ORE_DIAMOND;
    }
  }

  digTile(x, y, drillPower) {
    if (!this.inBounds(x, y)) return { success: false, ore: null };
    const tile = this.getTile(x, y);
    const idx = this.getIndex(x, y);

    if (tile === TILE_TYPES.EMPTY || tile === TILE_TYPES.CAVE) {
      return { success: true, ore: null, passable: true };
    }

    if (tile === TILE_TYPES.BEDROCK || tile === TILE_TYPES.LAVA) {
      return { success: false, ore: null, hazard: tile === TILE_TYPES.LAVA ? 'lava' : null };
    }

    const hardness = TILE_HARDNESS[tile];
    if (hardness > drillPower) {
      return { success: false, ore: null, tooHard: true };
    }

    this.tileHealth[idx] -= drillPower * 25;
    
    if (this.tileHealth[idx] <= 0) {
      const oreType = TILE_ORE_MAP[tile];
      const hazard = this.getHazardEffect(tile);
      this.tiles[idx] = TILE_TYPES.EMPTY;
      this.tileHealth[idx] = 0;
      this.dugTiles[idx] = 1;
      return { success: true, ore: oreType, broke: true, hazard };
    }

    return { success: true, ore: null, damaged: true };
  }

  getHazardEffect(tile) {
    if (tile === TILE_TYPES.POISON_GAS) return 'poison';
    if (tile === TILE_TYPES.INSTABILITY) return 'instability';
    return null;
  }

  isSolid(x, y) {
    const tile = this.getTile(x, y);
    return tile !== TILE_TYPES.EMPTY && tile !== TILE_TYPES.CAVE;
  }

  checkCollapse(x, y) {
    const collapses = [];
    if (!this.inBounds(x, y)) return collapses;

    for (let dy = -2; dy <= 0; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = x + dx;
        const checkY = y + dy;
        if (checkY < SURFACE_Y + 1) continue;
        
        const tile = this.getTile(checkX, checkY);
        if (tile === TILE_TYPES.EMPTY || tile === TILE_TYPES.CAVE) continue;
        
        const below = this.getTile(checkX, checkY + 1);
        if (below === TILE_TYPES.EMPTY || below === TILE_TYPES.CAVE) {
          const supportLeft = this.isSolid(checkX - 1, checkY + 1);
          const supportRight = this.isSolid(checkX + 1, checkY + 1);
          
          if (!supportLeft && !supportRight && Math.random() < 0.3) {
            collapses.push({ x: checkX, y: checkY });
          }
        }
      }
    }
    return collapses;
  }
}
