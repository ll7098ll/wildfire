import { CellStatus, FireFrontPoint, SimulationStats, TerrainCell, WeatherConditions } from '../types';
import { CELL_SPACING, GRID_SIZE } from './terrainData';

export class FireSpreadEngine {
  private grid: TerrainCell[][];
  private activeFires: Set<string> = new Set();
  private burnedCount = 0;
  private totalForestCells = 0;
  private elapsedSeconds = 0;
  private fireFrontCenter: { x: number; y: number; z: number } = { x: 0, y: 15, z: 0 };
  private spreadSpeedMMin = 0;
  private lastBurnedDelta = 0;

  constructor(initialGrid: TerrainCell[][]) {
    this.grid = initialGrid;
    this.countTotalForest();
  }

  private countTotalForest() {
    this.totalForestCells = 0;
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[z][x].fuel > 0.15) {
          this.totalForestCells++;
        }
      }
    }
  }

  public getGrid(): TerrainCell[][] {
    return this.grid;
  }

  public getActiveFireCoordinates(): FireFrontPoint[] {
    const points: FireFrontPoint[] = [];
    const halfGrid = (GRID_SIZE - 1) / 2;
    for (const key of this.activeFires) {
      const [xStr, zStr] = key.split(',');
      const x = parseInt(xStr, 10);
      const z = parseInt(zStr, 10);
      const cell = this.grid[z]?.[x];
      if (cell && (cell.status === CellStatus.BURNING || cell.status === CellStatus.IGNITING)) {
        const worldX = (x - halfGrid) * CELL_SPACING;
        const worldZ = (z - halfGrid) * CELL_SPACING;
        points.push({
          x: worldX,
          y: cell.height + 0.6,
          z: worldZ,
          intensity: cell.temperature,
        });
      }
    }
    return points;
  }

  public getFireFrontCenter(): { x: number; y: number; z: number } {
    return this.fireFrontCenter;
  }

  public ignite(gridX: number, gridZ: number, radius = 1): number {
    let ignitedCount = 0;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = gridX + dx;
        const nz = gridZ + dz;
        if (nx >= 0 && nx < GRID_SIZE && nz >= 0 && nz < GRID_SIZE) {
          const cell = this.grid[nz][nx];
          if (cell.status === CellStatus.UNBURNED && cell.fuel > 0.05) {
            cell.status = CellStatus.BURNING;
            cell.temperature = 0.85;
            cell.burnProgress = 0.05;
            this.activeFires.add(`${nx},${nz}`);
            ignitedCount++;
          }
        }
      }
    }
    return ignitedCount;
  }

  public igniteWorld(worldX: number, worldZ: number, radius = 2): number {
    const halfGrid = (GRID_SIZE - 1) / 2;
    const gx = Math.round(worldX / CELL_SPACING + halfGrid);
    const gz = Math.round(worldZ / CELL_SPACING + halfGrid);
    if (gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE) {
      return this.ignite(gx, gz, radius);
    }
    return 0;
  }

  // Calculate Rothermel-inspired spread probability from cell (x, z) to (nx, nz)
  private calculateSpreadProbability(
    source: TerrainCell,
    target: TerrainCell,
    dx: number,
    dz: number,
    dist: number,
    weather: WeatherConditions,
  ): number {
    if (target.status !== CellStatus.UNBURNED || target.fuel <= 0.08) {
      return 0;
    }

    // 1. Base fuel & moisture factor
    // Dryness factor: humidity 10% -> 0.95, 80% -> 0.3
    const dryness = Math.max(0.2, (100 - weather.humidity * 0.85) / 100);
    const tempFactor = Math.min(1.6, Math.max(0.8, weather.temperature / 26));
    const baseRate = 0.15 * target.fuel * dryness * tempFactor;

    // 2. Wind effect
    // Convert wind angle (degrees, 0 is blowing toward -Z North)
    const windRad = (weather.wind.direction * Math.PI) / 180;
    const windDirX = Math.sin(windRad);
    const windDirZ = -Math.cos(windRad);

    // Vector from source to target
    const propDirX = (dx * CELL_SPACING) / dist;
    const propDirZ = (dz * CELL_SPACING) / dist;

    // Dot product between wind vector and fire propagation vector
    const windAlignment = windDirX * propDirX + windDirZ * propDirZ; // -1 to 1

    // Wind speed coefficient (0 to 25 m/s)
    const wSpeed = weather.wind.speed;
    let windFactor = 1.0;
    if (windAlignment > 0) {
      // Wind blowing fire forward: strong propagation boost along wind direction
      windFactor = 1.0 + Math.pow(wSpeed / 4.5, 1.25) * windAlignment * 2.8;
    } else {
      // Backwind resists fire spread but doesn't completely halt it
      windFactor = Math.max(0.22, 1.0 / (1.0 + (wSpeed / 7) * Math.abs(windAlignment)));
    }

    // 3. Slope effect (crucial for mountainous wildfire!)
    // Uphill fire spreads drastically faster because convection preheats vegetation above
    const deltaHeight = target.height - source.height;
    const slopeTan = deltaHeight / dist; // positive = uphill, negative = downhill
    let slopeFactor = 1.0;
    if (slopeTan > 0) {
      // Uphill acceleration
      slopeFactor = 1.0 + Math.min(4.2, 3.2 * Math.pow(slopeTan, 1.1));
    } else {
      // Downhill deceleration
      slopeFactor = Math.max(0.4, 1.0 / (1.0 + 1.8 * Math.abs(slopeTan)));
    }

    // Combined spread rate
    const spreadRate = baseRate * windFactor * slopeFactor;
    return Math.min(0.98, spreadRate);
  }

  public update(dt: number, weather: WeatherConditions): SimulationStats {
    this.elapsedSeconds += dt;
    const newlyIgnited: Array<{ x: number; z: number }> = [];
    const extinguished: string[] = [];

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let fireCount = 0;
    let peakIntensity = 0;

    const neighbors = [
      { dx: -1, dz: 0, dist: CELL_SPACING },
      { dx: 1, dz: 0, dist: CELL_SPACING },
      { dx: 0, dz: -1, dist: CELL_SPACING },
      { dx: 0, dz: 1, dist: CELL_SPACING },
      { dx: -1, dz: -1, dist: CELL_SPACING * 1.414 },
      { dx: 1, dz: -1, dist: CELL_SPACING * 1.414 },
      { dx: -1, dz: 1, dist: CELL_SPACING * 1.414 },
      { dx: 1, dz: 1, dist: CELL_SPACING * 1.414 },
    ];

    for (const key of this.activeFires) {
      const [xStr, zStr] = key.split(',');
      const x = parseInt(xStr, 10);
      const z = parseInt(zStr, 10);
      const cell = this.grid[z]?.[x];
      if (!cell) continue;

      fireCount++;
      const wx = (x - GRID_SIZE / 2) * CELL_SPACING;
      const wz = (z - GRID_SIZE / 2) * CELL_SPACING;
      sumX += wx;
      sumY += cell.height;
      sumZ += wz;

      // Update burning progress (cells burn for ~14-20 seconds for authentic sustained firefront)
      const burnSpeed = (0.055 + weather.wind.speed * 0.0018) * dt;
      cell.burnProgress += burnSpeed;
      // High heat curve that peaks early and stays hot during peak combustion
      cell.temperature = Math.sin(Math.pow(Math.min(1.0, cell.burnProgress), 0.75) * Math.PI) * 0.85 + 0.15;
      if (cell.temperature > peakIntensity) peakIntensity = cell.temperature;

      // When fully consumed
      if (cell.burnProgress >= 1.0) {
        cell.status = CellStatus.BURNED;
        cell.fuel = 0;
        cell.temperature = 0;
        extinguished.push(key);
        this.burnedCount++;
        continue;
      }

      // Spread to unburned neighbors with exponential propagation rate
      for (const n of neighbors) {
        const nx = x + n.dx;
        const nz = z + n.dz;
        if (nx < 0 || nx >= GRID_SIZE || nz < 0 || nz >= GRID_SIZE) continue;

        const target = this.grid[nz][nx];
        if (target.status === CellStatus.UNBURNED) {
          const prob = this.calculateSpreadProbability(cell, target, n.dx, n.dz, n.dist, weather);
          // Exponential chance to ignite per frame: ~35-70% per sec downwind, realistic advance
          const ignitionProb = 1.0 - Math.exp(-prob * dt * 4.8);
          if (Math.random() < ignitionProb) {
            newlyIgnited.push({ x: nx, z: nz });
          }
        }
      }

      // Spotting fire (비화 현상): 강풍 시 불씨가 멀리 튀어 신규 발화
      if (weather.spottingEnabled && weather.wind.speed > 8 && Math.random() < 0.008 * dt * (weather.wind.speed / 10)) {
        const windRad = (weather.wind.direction * Math.PI) / 180;
        const throwDist = 2 + Math.floor(Math.random() * (weather.wind.speed * 0.4));
        const spotX = x + Math.round(Math.sin(windRad) * throwDist + (Math.random() - 0.5) * 2);
        const spotZ = z + Math.round(-Math.cos(windRad) * throwDist + (Math.random() - 0.5) * 2);

        if (spotX >= 0 && spotX < GRID_SIZE && spotZ >= 0 && spotZ < GRID_SIZE) {
          const spotTarget = this.grid[spotZ][spotX];
          if (spotTarget.status === CellStatus.UNBURNED && spotTarget.fuel > 0.15) {
            newlyIgnited.push({ x: spotX, z: spotZ });
          }
        }
      }
    }

    // Remove extinguished fires
    for (const key of extinguished) {
      this.activeFires.delete(key);
    }

    // Add new fires
    for (const pos of newlyIgnited) {
      const cell = this.grid[pos.z][pos.x];
      if (cell.status === CellStatus.UNBURNED) {
        cell.status = CellStatus.BURNING;
        cell.burnProgress = 0.05;
        cell.temperature = 0.5;
        this.activeFires.add(`${pos.x},${pos.z}`);
      }
    }

    // Update fire front center position
    if (fireCount > 0) {
      this.fireFrontCenter = {
        x: sumX / fireCount,
        y: sumY / fireCount + 3,
        z: sumZ / fireCount,
      };
    }

    // Calculate spread velocity (m/min)
    const currentDelta = newlyIgnited.length;
    this.lastBurnedDelta = this.lastBurnedDelta * 0.85 + currentDelta * 0.15;
    this.spreadSpeedMMin = Math.round(this.lastBurnedDelta * CELL_SPACING * 6.5);

    // Physical area calculation (1 ha = 10,000 m²)
    const cellAreaHa = (CELL_SPACING * CELL_SPACING) / 10000;
    const burnedAreaHa = Math.round(this.burnedCount * cellAreaHa * 10) / 10;
    const totalForestHa = Math.round(this.totalForestCells * cellAreaHa * 10) / 10;
    const burnedPercentage = this.totalForestCells > 0 ? Math.min(100, Math.round((this.burnedCount / this.totalForestCells) * 100)) : 0;

    return {
      activeFires: this.activeFires.size,
      burnedAreaHa,
      totalForestHa,
      burnedPercentage,
      spreadRateMMin: this.spreadSpeedMMin,
      elapsedSeconds: Math.round(this.elapsedSeconds),
      peakIntensity,
    };
  }

  public reset(newGrid: TerrainCell[][]) {
    this.grid = newGrid;
    this.activeFires.clear();
    this.burnedCount = 0;
    this.elapsedSeconds = 0;
    this.spreadSpeedMMin = 0;
    this.lastBurnedDelta = 0;
    this.fireFrontCenter = { x: 0, y: 15, z: 0 };
    this.countTotalForest();
  }
}
