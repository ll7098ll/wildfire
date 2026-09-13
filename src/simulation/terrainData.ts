import { CellStatus, TerrainCell, TerrainScaleMode } from '../types';

export interface TerrainConfig {
  scaleMode: TerrainScaleMode;
  worldSize: number; // 10,000m (10km x 10km = 100km² = 10,000 ha)
  gridSize: number;
  cellSpacing: number;
  maxHeight: number;
  treeScale: number;
  areaHa: number;
  areaKm2: number;
  forestDensity: number; // 0.1 to 1.0 (10% to 100%)
}

export function getTerrainConfig(
  scaleMode: TerrainScaleMode = '100x',
  forestDensity: number = 0.8
): TerrainConfig {
  const density = Math.min(1.0, Math.max(0.1, forestDensity));
  // 100배 산림 광역 면적: 10km x 10km = 100 km² = 10,000 ha (실측 산악 국립공원 스케일)
  const gridSize = 128;
  const worldSize = 10000;
  return {
    scaleMode: '100x',
    worldSize,
    gridSize,
    cellSpacing: worldSize / (gridSize - 1), // ~78.74m
    maxHeight: 1450, // 1,450m 백두대간급 주봉 고도
    treeScale: 8.5,
    areaHa: 10000,
    areaKm2: 100,
    forestDensity: density,
  };
}

export const DEFAULT_TERRAIN_CONFIG = getTerrainConfig('100x');
export const GRID_SIZE = DEFAULT_TERRAIN_CONFIG.gridSize;
export const WORLD_SIZE = DEFAULT_TERRAIN_CONFIG.worldSize;
export const CELL_SPACING = DEFAULT_TERRAIN_CONFIG.cellSpacing;
export const MAX_TERRAIN_HEIGHT = DEFAULT_TERRAIN_CONFIG.maxHeight;

// Fast 2D deterministic gradient noise with smooth quintic Hermite interpolation
function hash2(x: number, y: number): { gx: number; gy: number } {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  const angle = (h - Math.floor(h)) * Math.PI * 2;
  return { gx: Math.cos(angle), gy: Math.sin(angle) };
}

function gradientNoise(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const dx = x - x0;
  const dy = y - y0;

  // Quintic Hermite interpolant: 6t^5 - 15t^4 + 10t^3
  const fx = dx * dx * dx * (dx * (dx * 6 - 15) + 10);
  const fy = dy * dy * dy * (dy * (dy * 6 - 15) + 10);

  const g00 = hash2(x0, y0);
  const g10 = hash2(x1, y0);
  const g01 = hash2(x0, y1);
  const g11 = hash2(x1, y1);

  const v00 = g00.gx * dx + g00.gy * dy;
  const v10 = g10.gx * (dx - 1) + g10.gy * dy;
  const v01 = g01.gx * dx + g01.gy * (dy - 1);
  const v11 = g11.gx * (dx - 1) + g11.gy * (dy - 1);

  const v0 = v00 + fx * (v10 - v00);
  const v1 = v01 + fx * (v11 - v01);

  return (v0 + fy * (v1 - v0)) * 0.7071 + 0.5; // ~0.0 to 1.0
}

function fbm(x: number, y: number, octaves = 6): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += gradientNoise(x * frequency, y * frequency) * amplitude;
    maxAmp += amplitude;
    frequency *= 2.02;
    amplitude *= 0.5;
  }
  return value / maxAmp;
}

// Ridged multifractal noise for sharp alpine knife-edge ridges and rugged crests
function ridgedNoise(x: number, y: number, octaves = 5): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let weight = 1.0;
  for (let i = 0; i < octaves; i++) {
    let n = gradientNoise(x * frequency, y * frequency);
    let signal = 1.0 - Math.abs(n * 2.0 - 1.0);
    signal = signal * signal;
    signal *= weight;
    weight = Math.min(1.0, Math.max(0.0, signal * 2.2));
    value += signal * amplitude;
    frequency *= 2.04;
    amplitude *= 0.5;
  }
  return value;
}

export function generateTerrainData(scaleModeOrConfig: TerrainScaleMode | TerrainConfig = '100x'): {
  grid: TerrainCell[][];
  heights: Float32Array;
  treePositions: { x: number; y: number; z: number; scale: number; gridX: number; gridZ: number }[];
  config: TerrainConfig;
} {
  const config: TerrainConfig =
    typeof scaleModeOrConfig === 'string'
      ? getTerrainConfig(scaleModeOrConfig)
      : scaleModeOrConfig;

  const { gridSize, cellSpacing, maxHeight, treeScale } = config;
  const grid: TerrainCell[][] = [];
  const heights = new Float32Array(gridSize * gridSize);
  const treePositions: { x: number; y: number; z: number; scale: number; gridX: number; gridZ: number }[] = [];

  // 1. Generate realistic alpine mountain topography
  for (let z = 0; z < gridSize; z++) {
    grid[z] = [];
    for (let x = 0; x < gridSize; x++) {
      const nx = (x / (gridSize - 1)) * 4.2;
      const nz = (z / (gridSize - 1)) * 4.2;

      // Domain warping for natural geological folding and winding mountain canyons
      const warpX = fbm(nx * 1.2 + 0.3, nz * 1.2 + 0.8, 3) * 0.7;
      const warpZ = fbm(nx * 1.2 + 4.1, nz * 1.2 + 2.7, 3) * 0.7;
      const wnx = nx + warpX;
      const wnz = nz + warpZ;

      // Base terrain: rolling valleys and foothills (0.05 to 0.35)
      let baseRelief = fbm(wnx * 0.9, wnz * 0.9, 5) * 0.32;

      // Main continuous alpine spine (Taebaek / Baekdudaegan cordillera style)
      const primaryRidge = ridgedNoise(wnx * 0.75 + 1.2, wnz * 0.75 + 0.5, 5) * 0.44;
      // Secondary crossing mountain chain creating spurs and deep mountain passes
      const crossRidge = ridgedNoise(wnz * 0.82 + 0.7, wnx * 0.82 + 2.1, 5) * 0.36;

      // Distinct Grand Mountain Summits (주요 명산 연봉):
      // 1. 중앙 주봉 (Mount Grand Summit) - Highest peak (~1,450m elevation in 100x scale)
      const peak1 = Math.exp(-(((x - 64) ** 2 + (z - 60) ** 2) / 380)) * 0.55;
      // 2. 동북 암봉 (Northeast Alpine Peak)
      const peak2 = Math.exp(-(((x - 94) ** 2 + (z - 36) ** 2) / 340)) * 0.48;
      // 3. 서북 거봉 (Northwest Crag Peak)
      const peak3 = Math.exp(-(((x - 36) ** 2 + (z - 38) ** 2) / 360)) * 0.45;
      // 4. 남동 쌍봉 (Southeast Twin Massif)
      const peak4 = Math.exp(-(((x - 92) ** 2 + (z - 90) ** 2) / 380)) * 0.46;
      // 5. 남서 암릉봉 (Southwest Rocky Ridge Peak)
      const peak5 = Math.exp(-(((x - 34) ** 2 + (z - 88) ** 2) / 340)) * 0.42;
      // 6. 북부 전위봉 (Northern Spur Peak)
      const peak6 = Math.exp(-(((x - 66) ** 2 + (z - 24) ** 2) / 280)) * 0.38;
      // 7. 남부 능선봉 (Southern Ridge Summit)
      const peak7 = Math.exp(-(((x - 60) ** 2 + (z - 96) ** 2) / 300)) * 0.39;

      // Connecting high mountain saddles linking peaks into an unbroken chain
      const saddle1 = Math.exp(-(((x - 50) ** 2 + (z - 48) ** 2) / 260)) * 0.28;
      const saddle2 = Math.exp(-(((x - 78) ** 2 + (z - 46) ** 2) / 260)) * 0.26;
      const saddle3 = Math.exp(-(((x - 48) ** 2 + (z - 74) ** 2) / 260)) * 0.25;
      const saddle4 = Math.exp(-(((x - 78) ** 2 + (z - 76) ** 2) / 260)) * 0.27;

      // Deep winding mountain river valley basins and carved ravines
      const canyonValley = Math.sin((wnx * 1.1 - wnz * 0.95) * Math.PI) * 0.12;

      let h =
        baseRelief +
        primaryRidge +
        crossRidge +
        peak1 +
        peak2 +
        peak3 +
        peak4 +
        peak5 +
        peak6 +
        peak7 +
        saddle1 +
        saddle2 +
        saddle3 +
        saddle4 +
        canyonValley;

      // Perimeter edge falloff to keep valleys cleanly sloping towards borders
      const edgeX = Math.min(x, gridSize - 1 - x) / (gridSize * 0.14);
      const edgeZ = Math.min(z, gridSize - 1 - z) / (gridSize * 0.14);
      const edgeFalloff = Math.min(1.0, Math.min(edgeX, edgeZ));
      h *= Math.pow(edgeFalloff, 0.42);

      // Map elevation accurately to configured mountain scale
      const normalizedH = Math.max(0.06, Math.min(1.0, h * 0.68));
      const elevation = normalizedH * maxHeight;
      heights[z * gridSize + x] = elevation;

      // Biomass fuel density across mountain terrain
      const fuelNoise = fbm(nx * 2.8 + 7.1, nz * 2.8 + 4.9, 4);
      let baseFuel = 0.68 + fuelNoise * 0.28;
      if (normalizedH < 0.30) {
        baseFuel = Math.min(1.0, baseFuel * 1.12);
      }
      // Scale fuel by forest density: lower density means sparser vegetation and less fuel
      const density = config.forestDensity ?? 0.8;
      const fuelFactor = 0.35 + density * 0.65;
      const fuel = Math.max(0.06, Math.min(1.0, baseFuel * fuelFactor));

      grid[z][x] = {
        x,
        z,
        height: elevation,
        status: CellStatus.UNBURNED,
        fuel,
        maxFuel: fuel,
        burnProgress: 0,
        temperature: 0,
        slopeX: 0,
        slopeZ: 0,
        treeId: -1,
      };
    }
  }

  // 2. Calculate slopes (gradients) for each cell
  for (let z = 0; z < gridSize; z++) {
    for (let x = 0; x < gridSize; x++) {
      const hLeft = x > 0 ? grid[z][x - 1].height : grid[z][x].height;
      const hRight = x < gridSize - 1 ? grid[z][x + 1].height : grid[z][x].height;
      const hTop = z > 0 ? grid[z - 1][x].height : grid[z][x].height;
      const hBottom = z < gridSize - 1 ? grid[z + 1][x].height : grid[z][x].height;

      grid[z][x].slopeX = (hRight - hLeft) / (2 * cellSpacing);
      grid[z][x].slopeZ = (hBottom - hTop) / (2 * cellSpacing);
    }
  }

  // Bilinear elevation sampler
  function getInterpolatedElevation(gx: number, gz: number): number {
    const cx = Math.max(0, Math.min(gridSize - 2, Math.floor(gx)));
    const cz = Math.max(0, Math.min(gridSize - 2, Math.floor(gz)));
    const tx = Math.max(0, Math.min(1, gx - cx));
    const tz = Math.max(0, Math.min(1, gz - cz));

    const h00 = heights[cz * gridSize + cx];
    const h10 = heights[cz * gridSize + (cx + 1)];
    const h01 = heights[(cz + 1) * gridSize + cx];
    const h11 = heights[(cz + 1) * gridSize + (cx + 1)];

    const top = h00 + tx * (h10 - h00);
    const bottom = h01 + tx * (h11 - h01);
    return top + tz * (bottom - top);
  }

  // 3. Forest coverage
  const halfGrid = (gridSize - 1) / 2;
  const density = config.forestDensity ?? 0.8;

  for (let z = 0; z < gridSize; z++) {
    for (let x = 0; x < gridSize; x++) {
      const cellHeight = grid[z][x].height;
      const normH = cellHeight / maxHeight;

      const jitterX = hash2(x * 7.31 + z * 3.17, z * 9.17 + x * 2.33).gx * 0.36;
      const jitterZ = hash2(z * 8.43 + x * 4.19, x * 6.29 + z * 5.11).gy * 0.36;
      const worldX = (x - halfGrid + jitterX) * cellSpacing;
      const worldZ = (z - halfGrid + jitterZ) * cellSpacing;
      const treeY = getInterpolatedElevation(x + jitterX, z + jitterZ);

      const noiseVal = hash2(x * 3.7 + 1.1, z * 3.7 + 9.3).gx * 0.5 + 0.5;
      let baseScale = 1.10;
      if (normH < 0.35) {
        baseScale = 1.32 + noiseVal * 0.42;
      } else if (normH < 0.72) {
        baseScale = 1.15 + noiseVal * 0.36;
      } else {
        baseScale = 0.95 + noiseVal * 0.32;
      }
      baseScale *= treeScale;

      // Determine tree spawning based on user-configured Forest Density
      // spawnNoise is 0.0 ~ 1.0; comparing with density creates natural distribution
      const spawnNoise = hash2(x * 17.3 + 9.1, z * 29.7 + 3.4).gx * 0.5 + 0.5;
      const willSpawnPrimary = spawnNoise < density * 1.06;

      if (willSpawnPrimary) {
        grid[z][x].treeId = treePositions.length;
        treePositions.push({
          x: worldX,
          y: Math.max(0.5, treeY),
          z: worldZ,
          scale: baseScale,
          gridX: x,
          gridZ: z,
        });

        // Secondary dense forest clustering (spawns when forest density is sufficient)
        if (density > 0.32 && hash2(x * 13.9, z * 17.3).gy > (1.16 - density * 1.32)) {
          const ox2 = hash2(x * 19.3 + 5.1, z * 23.1 + 8.7).gx * 0.44;
          const oz2 = hash2(z * 21.7 + 3.4, x * 15.4 + 9.2).gy * 0.44;
          const worldX2 = (x - halfGrid + ox2) * cellSpacing;
          const worldZ2 = (z - halfGrid + oz2) * cellSpacing;
          const treeY2 = getInterpolatedElevation(x + ox2, z + oz2);

          treePositions.push({
            x: worldX2,
            y: Math.max(0.5, treeY2),
            z: worldZ2,
            scale: baseScale * (0.86 + hash2(x * 3.1, z * 3.1).gx * 0.22),
            gridX: x,
            gridZ: z,
          });
        }
      } else {
        grid[z][x].treeId = -1;
      }
    }
  }

  return { grid, heights, treePositions, config };
}

