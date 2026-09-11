import { RiskLevel, RiskPredictionResult } from '../types';

export interface DatasetItem {
  id: number;
  temperature: number; // °C
  humidity: number; // %
  windSpeed: number; // m/s
  risk: RiskLevel;
}

// 100건의 AI 학습 데이터셋 (제공해주신 데이터 원본 그대로 포함)
export const WILDFIRE_TRAINING_DATASET: DatasetItem[] = [
  // 낮음 (25건)
  { id: 1, temperature: 5, humidity: 88, windSpeed: 1.2, risk: '낮음' },
  { id: 2, temperature: 7, humidity: 85, windSpeed: 0.8, risk: '낮음' },
  { id: 3, temperature: 8, humidity: 92, windSpeed: 1.5, risk: '낮음' },
  { id: 4, temperature: 10, humidity: 80, windSpeed: 2.0, risk: '낮음' },
  { id: 5, temperature: 11, humidity: 78, windSpeed: 1.1, risk: '낮음' },
  { id: 6, temperature: 12, humidity: 85, windSpeed: 0.5, risk: '낮음' },
  { id: 7, temperature: 13, humidity: 75, windSpeed: 1.8, risk: '낮음' },
  { id: 8, temperature: 14, humidity: 82, windSpeed: 2.2, risk: '낮음' },
  { id: 9, temperature: 15, humidity: 70, windSpeed: 1.4, risk: '낮음' },
  { id: 10, temperature: 9, humidity: 90, windSpeed: 2.5, risk: '낮음' },
  { id: 11, temperature: 6, humidity: 95, windSpeed: 1.0, risk: '낮음' },
  { id: 12, temperature: 12, humidity: 88, windSpeed: 1.6, risk: '낮음' },
  { id: 13, temperature: 16, humidity: 72, windSpeed: 1.9, risk: '낮음' },
  { id: 14, temperature: 10, humidity: 84, windSpeed: 0.7, risk: '낮음' },
  { id: 15, temperature: 14, humidity: 76, windSpeed: 2.1, risk: '낮음' },
  { id: 16, temperature: 8, humidity: 89, windSpeed: 1.3, risk: '낮음' },
  { id: 17, temperature: 11, humidity: 81, windSpeed: 1.7, risk: '낮음' },
  { id: 18, temperature: 13, humidity: 79, windSpeed: 0.9, risk: '낮음' },
  { id: 19, temperature: 15, humidity: 74, windSpeed: 2.4, risk: '낮음' },
  { id: 20, temperature: 7, humidity: 91, windSpeed: 1.5, risk: '낮음' },
  { id: 21, temperature: 17, humidity: 68, windSpeed: 1.8, risk: '낮음' },
  { id: 22, temperature: 9, humidity: 86, windSpeed: 2.0, risk: '낮음' },
  { id: 23, temperature: 12, humidity: 80, windSpeed: 1.2, risk: '낮음' },
  { id: 24, temperature: 14, humidity: 77, windSpeed: 1.0, risk: '낮음' },
  { id: 25, temperature: 10, humidity: 93, windSpeed: 0.6, risk: '낮음' },

  // 보통 (25건)
  { id: 26, temperature: 16, humidity: 60, windSpeed: 2.5, risk: '보통' },
  { id: 27, temperature: 17, humidity: 58, windSpeed: 3.1, risk: '보통' },
  { id: 28, temperature: 18, humidity: 55, windSpeed: 2.8, risk: '보통' },
  { id: 29, temperature: 19, humidity: 52, windSpeed: 3.4, risk: '보통' },
  { id: 30, temperature: 20, humidity: 50, windSpeed: 2.6, risk: '보통' },
  { id: 31, temperature: 21, humidity: 48, windSpeed: 3.2, risk: '보통' },
  { id: 32, temperature: 22, humidity: 45, windSpeed: 3.8, risk: '보통' },
  { id: 33, temperature: 18, humidity: 62, windSpeed: 2.2, risk: '보통' },
  { id: 34, temperature: 15, humidity: 55, windSpeed: 4.0, risk: '보통' },
  { id: 35, temperature: 23, humidity: 46, windSpeed: 3.0, risk: '보통' },
  { id: 36, temperature: 17, humidity: 50, windSpeed: 3.5, risk: '보통' },
  { id: 37, temperature: 19, humidity: 54, windSpeed: 2.7, risk: '보통' },
  { id: 38, temperature: 20, humidity: 58, windSpeed: 2.1, risk: '보통' },
  { id: 39, temperature: 21, humidity: 52, windSpeed: 3.6, risk: '보통' },
  { id: 40, temperature: 22, humidity: 50, windSpeed: 2.9, risk: '보통' },
  { id: 41, temperature: 16, humidity: 52, windSpeed: 3.3, risk: '보통' },
  { id: 42, temperature: 18, humidity: 48, windSpeed: 3.9, risk: '보통' },
  { id: 43, temperature: 20, humidity: 46, windSpeed: 3.1, risk: '보통' },
  { id: 44, temperature: 23, humidity: 52, windSpeed: 2.5, risk: '보통' },
  { id: 45, temperature: 17, humidity: 60, windSpeed: 2.8, risk: '보통' },
  { id: 46, temperature: 19, humidity: 47, windSpeed: 3.7, risk: '보통' },
  { id: 47, temperature: 21, humidity: 55, windSpeed: 2.4, risk: '보통' },
  { id: 48, temperature: 22, humidity: 44, windSpeed: 4.1, risk: '보통' },
  { id: 49, temperature: 18, humidity: 53, windSpeed: 3.0, risk: '보통' },
  { id: 50, temperature: 20, humidity: 51, windSpeed: 3.4, risk: '보통' },

  // 높음 (25건)
  { id: 51, temperature: 22, humidity: 35, windSpeed: 5.0, risk: '높음' },
  { id: 52, temperature: 23, humidity: 30, windSpeed: 5.5, risk: '높음' },
  { id: 53, temperature: 24, humidity: 28, windSpeed: 6.2, risk: '높음' },
  { id: 54, temperature: 25, humidity: 32, windSpeed: 4.8, risk: '높음' },
  { id: 55, temperature: 26, humidity: 25, windSpeed: 5.8, risk: '높음' },
  { id: 56, temperature: 27, humidity: 34, windSpeed: 5.2, risk: '높음' },
  { id: 57, temperature: 28, humidity: 29, windSpeed: 6.5, risk: '높음' },
  { id: 58, temperature: 21, humidity: 26, windSpeed: 6.0, risk: '높음' },
  { id: 59, temperature: 23, humidity: 33, windSpeed: 4.9, risk: '높음' },
  { id: 60, temperature: 24, humidity: 27, windSpeed: 7.1, risk: '높음' },
  { id: 61, temperature: 25, humidity: 30, windSpeed: 5.6, risk: '높음' },
  { id: 62, temperature: 26, humidity: 35, windSpeed: 5.1, risk: '높음' },
  { id: 63, temperature: 27, humidity: 24, windSpeed: 6.8, risk: '높음' },
  { id: 64, temperature: 28, humidity: 31, windSpeed: 5.4, risk: '높음' },
  { id: 65, temperature: 22, humidity: 28, windSpeed: 6.3, risk: '높음' },
  { id: 66, temperature: 24, humidity: 34, windSpeed: 4.7, risk: '높음' },
  { id: 67, temperature: 25, humidity: 26, windSpeed: 6.6, risk: '높음' },
  { id: 68, temperature: 26, humidity: 29, windSpeed: 5.9, risk: '높음' },
  { id: 69, temperature: 27, humidity: 32, windSpeed: 5.3, risk: '높음' },
  { id: 70, temperature: 28, humidity: 27, windSpeed: 6.4, risk: '높음' },
  { id: 71, temperature: 23, humidity: 25, windSpeed: 7.3, risk: '높음' },
  { id: 72, temperature: 25, humidity: 35, windSpeed: 4.6, risk: '높음' },
  { id: 73, temperature: 26, humidity: 28, windSpeed: 6.1, risk: '높음' },
  { id: 74, temperature: 27, humidity: 30, windSpeed: 5.7, risk: '높음' },
  { id: 75, temperature: 29, humidity: 33, windSpeed: 5.0, risk: '높음' },

  // 매우높음 (25건)
  { id: 76, temperature: 29, humidity: 18, windSpeed: 8.5, risk: '매우높음' },
  { id: 77, temperature: 30, humidity: 15, windSpeed: 9.2, risk: '매우높음' },
  { id: 78, temperature: 31, humidity: 14, windSpeed: 10.5, risk: '매우높음' },
  { id: 79, temperature: 32, humidity: 12, windSpeed: 11.0, risk: '매우높음' },
  { id: 80, temperature: 33, humidity: 16, windSpeed: 9.8, risk: '매우높음' },
  { id: 81, temperature: 34, humidity: 15, windSpeed: 12.5, risk: '매우높음' },
  { id: 82, temperature: 35, humidity: 19, windSpeed: 13.2, risk: '매우높음' },
  { id: 83, temperature: 36, humidity: 11, windSpeed: 14.0, risk: '매우높음' },
  { id: 84, temperature: 28, humidity: 13, windSpeed: 8.8, risk: '매우높음' },
  { id: 85, temperature: 30, humidity: 17, windSpeed: 10.0, risk: '매우높음' },
  { id: 86, temperature: 31, humidity: 10, windSpeed: 11.5, risk: '매우높음' },
  { id: 87, temperature: 32, humidity: 15, windSpeed: 9.5, risk: '매우높음' },
  { id: 88, temperature: 33, humidity: 13, windSpeed: 12.0, risk: '매우높음' },
  { id: 89, temperature: 34, humidity: 18, windSpeed: 10.8, risk: '매우높음' },
  { id: 90, temperature: 35, humidity: 14, windSpeed: 13.8, risk: '매우높음' },
  { id: 91, temperature: 29, humidity: 16, windSpeed: 9.0, risk: '매우높음' },
  { id: 92, temperature: 30, humidity: 12, windSpeed: 11.2, risk: '매우높음' },
  { id: 93, temperature: 31, humidity: 18, windSpeed: 8.9, risk: '매우높음' },
  { id: 94, temperature: 32, humidity: 11, windSpeed: 13.0, risk: '매우높음' },
  { id: 95, temperature: 33, humidity: 15, windSpeed: 10.2, risk: '매우높음' },
  { id: 96, temperature: 34, humidity: 12, windSpeed: 14.5, risk: '매우높음' },
  { id: 97, temperature: 35, humidity: 17, windSpeed: 11.8, risk: '매우높음' },
  { id: 98, temperature: 36, humidity: 13, windSpeed: 15.0, risk: '매우높음' },
  { id: 99, temperature: 32, humidity: 10, windSpeed: 10.6, risk: '매우높음' },
  { id: 100, temperature: 34, humidity: 14, windSpeed: 12.8, risk: '매우높음' },
];

// Feature Normalization Bounds (based on dataset domain)
const NORM_BOUNDS = {
  temp: { min: 5, max: 38 },
  hum: { min: 10, max: 95 },
  wind: { min: 0.5, max: 15.0 },
};

/**
 * AI 산불 위험도 예측 엔진 (Weighted k-NN + Softmax Distribution)
 * 입력된 온도, 습도, 풍속을 기반으로 100개 학습 데이터와의 거리 기반 분류 수행
 */
export function predictWildfireRisk(
  temperature: number,
  humidity: number,
  windSpeed: number,
  k = 7
): RiskPredictionResult {
  // 1. Min-Max Normalization
  const normT = (temperature - NORM_BOUNDS.temp.min) / (NORM_BOUNDS.temp.max - NORM_BOUNDS.temp.min);
  const normH = (humidity - NORM_BOUNDS.hum.min) / (NORM_BOUNDS.hum.max - NORM_BOUNDS.hum.min);
  const normW = (windSpeed - NORM_BOUNDS.wind.min) / (NORM_BOUNDS.wind.max - NORM_BOUNDS.wind.min);

  // 2. Feature weights: 습도(Dryness)와 풍속(Wind)이 산불 확산에 가장 결정적
  const WEIGHT_T = 1.0;
  const WEIGHT_H = 1.4;
  const WEIGHT_W = 1.3;

  // 3. Calculate distance to all training samples
  const scored = WILDFIRE_TRAINING_DATASET.map((sample) => {
    const sNormT = (sample.temperature - NORM_BOUNDS.temp.min) / (NORM_BOUNDS.temp.max - NORM_BOUNDS.temp.min);
    const sNormH = (sample.humidity - NORM_BOUNDS.hum.min) / (NORM_BOUNDS.hum.max - NORM_BOUNDS.hum.min);
    const sNormW = (sample.windSpeed - NORM_BOUNDS.wind.min) / (NORM_BOUNDS.wind.max - NORM_BOUNDS.wind.min);

    const distSq =
      WEIGHT_T * Math.pow(normT - sNormT, 2) +
      WEIGHT_H * Math.pow(normH - sNormH, 2) +
      WEIGHT_W * Math.pow(normW - sNormW, 2);

    const dist = Math.sqrt(distSq);
    return { sample, dist };
  });

  // Sort by distance ascending
  scored.sort((a, b) => a.dist - b.dist);

  // Select top-k neighbors
  const neighbors = scored.slice(0, k);

  // 4. Calculate vote weights using Inverse Distance with Gaussian smoothing
  const classWeights: Record<RiskLevel, number> = {
    낮음: 0,
    보통: 0,
    높음: 0,
    매우높음: 0,
  };

  let totalWeight = 0;
  for (const n of neighbors) {
    // Avoid division by zero with small epsilon
    const weight = 1.0 / Math.pow(n.dist + 0.05, 1.8);
    classWeights[n.sample.risk] += weight;
    totalWeight += weight;
  }

  // Softmax-like normalized probabilities (%)
  const probabilities = {
    낮음: Math.round((classWeights.낮음 / totalWeight) * 100),
    보통: Math.round((classWeights.보통 / totalWeight) * 100),
    높음: Math.round((classWeights.높음 / totalWeight) * 100),
    매우높음: Math.round((classWeights.매우높음 / totalWeight) * 100),
  };

  // Adjust rounding sum to exactly 100%
  const sumProb = probabilities.낮음 + probabilities.보통 + probabilities.높음 + probabilities.매우높음;
  if (sumProb !== 100) {
    const diff = 100 - sumProb;
    // apply diff to max class
    let maxKey: RiskLevel = '낮음';
    let maxVal = -1;
    for (const key of ['낮음', '보통', '높음', '매우높음'] as RiskLevel[]) {
      if (probabilities[key] > maxVal) {
        maxVal = probabilities[key];
        maxKey = key;
      }
    }
    probabilities[maxKey] += diff;
  }

  // Determine top winning class
  let predictedLevel: RiskLevel = '낮음';
  let bestWeight = -1;
  for (const key of ['낮음', '보통', '높음', '매우높음'] as RiskLevel[]) {
    if (classWeights[key] > bestWeight) {
      bestWeight = classWeights[key];
      predictedLevel = key;
    }
  }

  // 5. Continuous Risk Score (0 ~ 100)
  // Level weights: 낮음=12, 보통=40, 높음=70, 매우높음=95
  const baseScore =
    (probabilities.낮음 * 12 +
      probabilities.보통 * 40 +
      probabilities.높음 * 72 +
      probabilities.매우높음 * 96) /
    100;

  // Small environmental fine-tuning
  const drynessBonus = Math.max(0, (25 - humidity) * 0.4);
  const windBonus = Math.max(0, (windSpeed - 8) * 0.8);
  const score = Math.min(100, Math.max(0, Math.round(baseScore + drynessBonus + windBonus)));

  // 6. Simulation Physical Engine Multipliers
  let spreadMultiplier = 1.0;
  let flameIntensityScale = 1.0;
  let spottingProbabilityFactor = 1.0;
  let description = '';

  switch (predictedLevel) {
    case '낮음':
      spreadMultiplier = 0.35; // 매우 더딘 확산, 자연 소화 발생
      flameIntensityScale = 0.65; // 낮은 화염 높이, 옅은 흰 연기
      spottingProbabilityFactor = 0.0; // 비화 발생 없음
      description = '습도가 높고 풍속이 약하여 불길이 국소 지역에 머물며 자체 감쇠할 가능성이 높습니다.';
      break;

    case '보통':
      spreadMultiplier = 1.0; // 표준 확산 속도
      flameIntensityScale = 1.0; // 일반적인 화염 크기
      spottingProbabilityFactor = 0.8;
      description = '안정적인 일반 확산 조건입니다. 지형 경사를 따라 완만하게 화선이 형성됩니다.';
      break;

    case '높음':
      spreadMultiplier = 1.85; // 빠른 타원형 신장 확산
      flameIntensityScale = 1.45; // 거센 주황빛 화염, 짙은 연무
      spottingProbabilityFactor = 2.2; // 비화 빈도 대폭 증가
      description = '건조한 대기와 바람에 의해 화선이 풍하 방향으로 급격히 신장되며 능선 상승 기류를 탑니다.';
      break;

    case '매우높음':
      spreadMultiplier = 2.9; // 폭발적 화염 폭풍 (Firestorm)
      flameIntensityScale = 2.1; // 초대형 화염 기둥, 솟구치는 흑색 연기 기둥, 다량의 불티
      spottingProbabilityFactor = 4.0; // 원거리(15~35m) 불씨 도약 다발
      description = '극단적 건조와 강풍으로 인한 재난형 급확산 경보입니다. 광범위한 비화와 다발성 발화가 발생합니다.';
      break;
  }

  const nearestNeighbors = neighbors.slice(0, 3).map((n) => ({
    temperature: n.sample.temperature,
    humidity: n.sample.humidity,
    windSpeed: n.sample.windSpeed,
    risk: n.sample.risk,
    distance: parseFloat(n.dist.toFixed(3)),
  }));

  return {
    level: predictedLevel,
    score,
    probabilities,
    spreadMultiplier,
    flameIntensityScale,
    spottingProbabilityFactor,
    description,
    nearestNeighbors,
  };
}
