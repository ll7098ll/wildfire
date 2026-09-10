export enum CellStatus {
  UNBURNED = 0,
  IGNITING = 1,
  BURNING = 2,
  BURNED = 3,
}

export interface TerrainCell {
  x: number;
  z: number;
  height: number;
  status: CellStatus;
  fuel: number; // 0.0 to 1.0 (vegetation density)
  maxFuel: number;
  burnProgress: number; // 0.0 to 1.0
  temperature: number; // 0.0 to 1.0
  slopeX: number;
  slopeZ: number;
  treeId: number; // -1 if no tree
}

export interface WindConditions {
  speed: number; // m/s (0 to 25)
  direction: number; // degrees (0 to 360), 0 is North (+Z to -Z)
}

export interface WeatherConditions {
  humidity: number; // % (10 to 90)
  temperature: number; // Celsius (15 to 42)
  wind: WindConditions;
  spottingEnabled: boolean; // 비화(불씨 날림) 활성화 여부
}

export interface SimulationStats {
  activeFires: number;
  burnedAreaHa: number;
  totalForestHa: number;
  burnedPercentage: number;
  spreadRateMMin: number;
  elapsedSeconds: number;
  peakIntensity: number;
}

export type CameraPreset = 'orbit' | 'track_front' | 'top_down';
export type LightingMode = 'dusk' | 'night' | 'day';

export interface FireFrontPoint {
  x: number;
  y: number;
  z: number;
  intensity: number;
}
