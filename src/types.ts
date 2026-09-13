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
  speed: number; // m/s (0 to 45 m/s)
  direction: number; // degrees (0 to 360), 0 is North (+Z to -Z)
}

export type RiskLevel = '낮음' | '보통' | '높음' | '매우높음';

export interface RiskPredictionResult {
  level: RiskLevel;
  score: number; // 0 ~ 100
  probabilities: {
    낮음: number;
    보통: number;
    높음: number;
    매우높음: number;
  };
  spreadMultiplier: number; // 0.35 (낮음) ~ 3.5 (매우높음)
  flameIntensityScale: number; // visual scale 0.5 ~ 2.5
  spottingProbabilityFactor: number; // 0.0 ~ 4.5
  description: string;
  nearestNeighbors: Array<{
    temperature: number;
    humidity: number;
    windSpeed: number;
    risk: RiskLevel;
    distance: number;
  }>;
}

export interface WeatherConditions {
  humidity: number; // % (5 to 100)
  temperature: number; // Celsius (-10 to 48)
  wind: WindConditions;
  spottingEnabled: boolean; // 비화(불씨 날림) 활성화 여부
  riskLevel?: RiskLevel;
  riskScore?: number;
}

export type TerrainScaleMode = '100x';

export interface SimulationStats {
  activeFires: number;
  burnedAreaHa: number;
  burnedAreaKm2: number;
  totalForestHa: number;
  totalAreaKm2: number;
  burnedPercentage: number;
  spreadRateMMin: number;
  elapsedSeconds: number;
  peakIntensity: number;
  scaleMode: TerrainScaleMode;
  treeCount?: number;
}

export type CameraPreset = 'orbit' | 'track_front' | 'top_down';
export type LightingMode = 'dusk' | 'night' | 'day';

export interface FireFrontPoint {
  x: number;
  y: number;
  z: number;
  intensity: number;
}
