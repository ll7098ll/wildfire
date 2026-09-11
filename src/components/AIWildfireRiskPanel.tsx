import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Droplets,
  Flame,
  HelpCircle,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';
import { RiskLevel, WeatherConditions } from '../types';
import {
  predictWildfireRisk,
  WILDFIRE_TRAINING_DATASET,
  DatasetItem,
} from '../simulation/wildfireRiskModel';

interface AIWildfireRiskPanelProps {
  weather: WeatherConditions;
  onUpdateWeather: (w: Partial<WeatherConditions>) => void;
  onIgniteSample: (temperature: number, humidity: number, windSpeed: number) => void;
}

export const AIWildfireRiskPanel: React.FC<AIWildfireRiskPanelProps> = ({
  weather,
  onUpdateWeather,
  onIgniteSample,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'dataset'>('control');
  const [datasetFilter, setDatasetFilter] = useState<RiskLevel | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Prediction Evaluation from current weather conditions
  const prediction = useMemo(() => {
    return predictWildfireRisk(weather.temperature, weather.humidity, weather.wind.speed);
  }, [weather.temperature, weather.humidity, weather.wind.speed]);

  // Color mappings based on risk level
  const getRiskBadgeStyles = (level: RiskLevel) => {
    switch (level) {
      case '낮음':
        return {
          bg: 'bg-emerald-500/20',
          text: 'text-emerald-400',
          border: 'border-emerald-500/40',
          barColor: 'bg-emerald-500',
          pulse: false,
          label: '낮음 (Low)',
        };
      case '보통':
        return {
          bg: 'bg-amber-500/20',
          text: 'text-amber-400',
          border: 'border-amber-500/40',
          barColor: 'bg-amber-500',
          pulse: false,
          label: '보통 (Moderate)',
        };
      case '높음':
        return {
          bg: 'bg-orange-500/25',
          text: 'text-orange-400',
          border: 'border-orange-500/50',
          barColor: 'bg-orange-500',
          pulse: true,
          label: '높음 (High)',
        };
      case '매우높음':
        return {
          bg: 'bg-rose-500/30',
          text: 'text-rose-400',
          border: 'border-rose-500/60',
          barColor: 'bg-rose-500',
          pulse: true,
          label: '매우높음 (Extreme)',
        };
    }
  };

  const badgeStyle = getRiskBadgeStyles(prediction.level);

  // Quick preset samples directly from the 100-dataset
  const testPresets: Array<{
    title: string;
    level: RiskLevel;
    temp: number;
    hum: number;
    wind: number;
  }> = [
    { title: '습윤 저위험', level: '낮음', temp: 10, hum: 84, wind: 0.7 },
    { title: '일반 산림', level: '보통', temp: 18, hum: 55, wind: 2.8 },
    { title: '건조 강풍', level: '높음', temp: 25, hum: 26, wind: 6.6 },
    { title: '재난형 돌풍', level: '매우높음', temp: 32, hum: 11, wind: 13.0 },
  ];

  // Filtered dataset for verification tab
  const filteredDataset = useMemo(() => {
    return WILDFIRE_TRAINING_DATASET.filter((item) => {
      if (datasetFilter !== '전체' && item.risk !== datasetFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.temperature.toString().includes(q) ||
          item.humidity.toString().includes(q) ||
          item.windSpeed.toString().includes(q) ||
          item.risk.includes(q)
        );
      }
      return true;
    });
  }, [datasetFilter, searchQuery]);

  return (
    <aside aria-label="AI 산불위험도 분석" className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-none max-w-sm w-full font-sans transition-all duration-300">
      <div className="bg-stone-950/90 backdrop-blur-md border border-stone-800/90 rounded-2xl p-4 shadow-2xl text-stone-100 transition-all duration-300 pointer-events-auto">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-stone-800/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-400">
              <BrainCircuit className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                AI 산불위험도 예측
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-normal">
                  100건 학습
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">기상 조건 입력 시 번지는 양상 자동 동기화</p>
            </div>
          </div>

          <button
            id="btn-toggle-ai-risk-panel"
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'AI 패널 펼치기' : 'AI 패널 접기'}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors border border-stone-800 cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="mt-3 flex flex-col gap-3.5">
            {/* Tab Selector */}
            <div className="flex rounded-lg bg-stone-900/80 p-0.5 border border-stone-800">
              <button
                id="tab-ai-controls"
                onClick={() => setActiveTab('control')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === 'control'
                    ? 'bg-stone-800 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>수치 입력 및 예측</span>
              </button>
              <button
                id="tab-ai-dataset"
                onClick={() => setActiveTab('dataset')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === 'dataset'
                    ? 'bg-stone-800 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Database className="w-3 h-3" />
                <span>학습 데이터 검증 (100건)</span>
              </button>
            </div>

            {activeTab === 'control' ? (
              <>
                {/* Real-time AI Risk Prediction Card */}
                <div
                  className={`rounded-xl p-3 border transition-all duration-300 ${badgeStyle.bg} ${badgeStyle.border}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-stone-300 flex items-center gap-1 font-medium">
                      <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                      실시간 판별 위험도
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 shadow-sm ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} ${
                        badgeStyle.pulse ? 'animate-pulse' : ''
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.barColor}`} />
                      {badgeStyle.label}
                    </span>
                  </div>

                  {/* Risk Score Progress Gauge */}
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-stone-300">종합 산불 위험 지수</span>
                    <span className="font-mono font-bold text-stone-100 text-sm">
                      {prediction.score}
                      <span className="text-stone-400 text-xs font-normal"> / 100</span>
                    </span>
                  </div>
                  <div className="w-full bg-stone-900/90 h-2 rounded-full overflow-hidden border border-stone-800">
                    <div
                      className={`h-full transition-all duration-300 ${badgeStyle.barColor}`}
                      style={{ width: `${prediction.score}%` }}
                    />
                  </div>

                  {/* Class Probabilities Mini Bars */}
                  <div className="mt-2.5 pt-2 border-t border-stone-800/60 grid grid-cols-4 gap-1 text-center">
                    {(['낮음', '보통', '높음', '매우높음'] as RiskLevel[]).map((lvl) => {
                      const prob = prediction.probabilities[lvl];
                      const isWinning = prediction.level === lvl;
                      return (
                        <div
                          key={lvl}
                          className={`px-1 py-1 rounded ${
                            isWinning ? 'bg-stone-900/90 font-semibold border border-stone-700/60' : 'opacity-70'
                          }`}
                        >
                          <div className="text-[10px] text-stone-400 leading-none">{lvl}</div>
                          <div className="text-xs font-mono mt-0.5 text-stone-200">{prob}%</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Physical Behavior Briefing */}
                  <div className="mt-2.5 bg-stone-950/60 rounded-lg p-2 border border-stone-800/80 text-[11px] text-stone-300 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-orange-300 font-medium mb-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span>3D 확산 물리 양상:</span>
                      <span className="font-mono text-stone-300 text-[10px]">
                        속도 x{prediction.spreadMultiplier.toFixed(1)} · 화염 x{prediction.flameIntensityScale.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-stone-400">{prediction.description}</p>
                  </div>
                </div>

                {/* Weather Input Form (Numbers & Sliders) */}
                <div className="flex flex-col gap-2.5 bg-stone-900/60 border border-stone-800/70 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-stone-200">
                    <span className="flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-red-400" />
                      기상 수치 직접 입력
                    </span>
                    <span className="text-[10px] text-stone-400">숫자 입력 또는 슬라이더 조절</span>
                  </div>

                  {/* 1. Temperature */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-stone-300">
                      <span className="flex items-center gap-1 text-[11px]">
                        <span>온도 (Temperature)</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          id="input-number-temp"
                          type="number"
                          min="0"
                          max="45"
                          step="1"
                          value={weather.temperature}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) onUpdateWeather({ temperature: Math.min(45, Math.max(0, val)) });
                          }}
                          className="w-14 bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-amber-300 focus:outline-none focus:border-orange-500"
                        />
                        <span className="font-mono text-stone-400 text-xs">°C</span>
                      </div>
                    </div>
                    <input
                      id="slider-ai-temp"
                      type="range"
                      min="5"
                      max="40"
                      value={weather.temperature}
                      onChange={(e) => onUpdateWeather({ temperature: parseInt(e.target.value, 10) })}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* 2. Humidity */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-stone-300">
                      <span className="flex items-center gap-1 text-[11px]">
                        <span>습도 (Humidity)</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          id="input-number-humidity"
                          type="number"
                          min="5"
                          max="100"
                          step="1"
                          value={weather.humidity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) onUpdateWeather({ humidity: Math.min(100, Math.max(5, val)) });
                          }}
                          className="w-14 bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-blue-300 focus:outline-none focus:border-orange-500"
                        />
                        <span className="font-mono text-stone-400 text-xs">%</span>
                      </div>
                    </div>
                    <input
                      id="slider-ai-hum"
                      type="range"
                      min="10"
                      max="95"
                      value={weather.humidity}
                      onChange={(e) => onUpdateWeather({ humidity: parseInt(e.target.value, 10) })}
                      className="w-full accent-blue-500 h-1.5 bg-stone-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* 3. Wind Speed */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-stone-300">
                      <span className="flex items-center gap-1 text-[11px]">
                        <span>풍속 (Wind Speed)</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          id="input-number-wind"
                          type="number"
                          min="0"
                          max="25"
                          step="0.1"
                          value={weather.wind.speed}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val))
                              onUpdateWeather({
                                wind: { ...weather.wind, speed: Math.min(25, Math.max(0, val)) },
                              });
                          }}
                          className="w-14 bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-sky-300 focus:outline-none focus:border-orange-500"
                        />
                        <span className="font-mono text-stone-400 text-xs">m/s</span>
                      </div>
                    </div>
                    <input
                      id="slider-ai-wind"
                      type="range"
                      min="0.5"
                      max="16.0"
                      step="0.1"
                      value={weather.wind.speed}
                      onChange={(e) =>
                        onUpdateWeather({
                          wind: { ...weather.wind, speed: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full accent-sky-500 h-1.5 bg-stone-800 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Fast Test Presets from Training Data */}
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      학습 데이터셋 대표 프리셋
                    </span>
                    <span className="text-[10px] text-stone-500">클릭 시 즉시 대입</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {testPresets.map((preset) => {
                      const isCurrent =
                        weather.temperature === preset.temp &&
                        weather.humidity === preset.hum &&
                        weather.wind.speed === preset.wind;
                      return (
                        <button
                          key={preset.title}
                          id={`btn-preset-${preset.level}`}
                          onClick={() => {
                            onUpdateWeather({
                              temperature: preset.temp,
                              humidity: preset.hum,
                              wind: { ...weather.wind, speed: preset.wind },
                            });
                          }}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-stone-800 border-orange-500/70 text-white shadow-md'
                              : 'bg-stone-900/80 hover:bg-stone-800/90 border-stone-800 text-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-medium mb-0.5">
                            <span className="truncate">{preset.title}</span>
                            <span
                              className={`text-[9px] font-bold px-1 rounded ${
                                preset.level === '낮음'
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : preset.level === '보통'
                                  ? 'bg-amber-950 text-amber-400'
                                  : preset.level === '높음'
                                  ? 'bg-orange-950 text-orange-400'
                                  : 'bg-rose-950 text-rose-400'
                              }`}
                            >
                              {preset.level}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-stone-400">
                            {preset.temp}°C / {preset.hum}% / {preset.wind}m/s
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* One-click Ignite in 3D Mountain with current parameters */}
                <button
                  id="btn-ignite-current-ai"
                  onClick={() => onIgniteSample(weather.temperature, weather.humidity, weather.wind.speed)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Flame className="w-4 h-4 text-amber-200 fill-amber-200 animate-pulse" />
                  <span>현재 기상·위험도 조건으로 산불 발화 및 확산 비교</span>
                </button>
              </>
            ) : (
              /* Dataset Explorer Tab (100 Training Samples) */
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-1.5">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 text-stone-400 absolute left-2 top-2" />
                    <input
                      id="input-dataset-search"
                      type="text"
                      placeholder="수치 검색 (예: 32, 매우높음)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-7 pr-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-stone-600"
                    />
                  </div>

                  {/* Filter by Level */}
                  <select
                    id="select-dataset-filter"
                    value={datasetFilter}
                    onChange={(e) => setDatasetFilter(e.target.value as any)}
                    className="bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-xs text-stone-200 cursor-pointer focus:outline-none"
                  >
                    <option value="전체">전체 (100)</option>
                    <option value="낮음">낮음 (25)</option>
                    <option value="보통">보통 (25)</option>
                    <option value="높음">높음 (25)</option>
                    <option value="매우높음">매우높음 (25)</option>
                  </select>
                </div>

                <div className="text-[11px] text-stone-400 flex items-center justify-between">
                  <span>아래 항목 클릭 시 즉시 수치 대입 및 3D 확산 연동:</span>
                  <span className="font-mono text-stone-300">{filteredDataset.length}건</span>
                </div>

                {/* Table / List of Samples */}
                <div className="max-h-60 overflow-y-auto rounded-lg border border-stone-800/80 bg-stone-900/60 divide-y divide-stone-800/60 text-xs">
                  {filteredDataset.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onUpdateWeather({
                          temperature: item.temperature,
                          humidity: item.humidity,
                          wind: { ...weather.wind, speed: item.windSpeed },
                        });
                      }}
                      className="p-2 flex items-center justify-between hover:bg-stone-800/80 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-stone-500 w-5">#{item.id}</span>
                        <span className="font-mono text-stone-200 group-hover:text-white">
                          {item.temperature}°C, {item.humidity}%, {item.windSpeed}m/s
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          item.risk === '낮음'
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                            : item.risk === '보통'
                            ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                            : item.risk === '높음'
                            ? 'bg-orange-950/60 border-orange-500/40 text-orange-400'
                            : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                        }`}
                      >
                        {item.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
