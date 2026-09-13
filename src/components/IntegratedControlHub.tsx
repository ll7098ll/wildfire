import React, { useState, useMemo } from 'react';
import {
  Activity,
  BarChart2,
  Compass,
  Droplets,
  Eye,
  EyeOff,
  Flame,
  Moon,
  Mountain,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sliders,
  Sun,
  Sunset,
  Thermometer,
  Timer,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { CameraPreset, LightingMode, RiskLevel, SimulationStats, WeatherConditions } from '../types';
import {
  predictWildfireRisk,
  WILDFIRE_TRAINING_DATASET,
} from '../simulation/wildfireRiskModel';
import { FireStatsDashboard } from './FireStatsDashboard';

interface IntegratedControlHubProps {
  stats: SimulationStats;
  weather: WeatherConditions;
  onUpdateWeather: (w: Partial<WeatherConditions>) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onChangeSpeed: (s: number) => void;
  onReset: () => void;
  cameraPreset: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  lighting: LightingMode;
  onSelectLighting: (mode: LightingMode) => void;
  onApplyScenario: (scenarioKey: string) => void;
  onIgniteSample: (temperature: number, humidity: number, windSpeed: number) => void;
  showUI: boolean;
  onToggleUI: () => void;
}

export const IntegratedControlHub: React.FC<IntegratedControlHubProps> = React.memo(({
  stats,
  weather,
  onUpdateWeather,
  isPlaying,
  onTogglePlay,
  speed,
  onChangeSpeed,
  onReset,
  cameraPreset,
  onSelectCamera,
  lighting,
  onSelectLighting,
  onApplyScenario,
  onIgniteSample,
  showUI,
  onToggleUI,
}) => {
  // Navigation tabs: 'weather' (default for quick control), 'analytics', 'scenarios'
  const [activeTab, setActiveTab] = useState<'weather' | 'analytics' | 'scenarios'>('weather');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [datasetFilter, setDatasetFilter] = useState<RiskLevel | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // AI Prediction Evaluation from current weather conditions
  const prediction = useMemo(() => {
    return predictWildfireRisk(weather.temperature, weather.humidity, weather.wind.speed);
  }, [weather.temperature, weather.humidity, weather.wind.speed]);

  const isAlarm = stats.activeFires > 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getWindCardinal = (deg: number) => {
    const directions = [
      { name: '북풍 (N)', angle: 0 },
      { name: '북동풍 (NE)', angle: 45 },
      { name: '동풍 (E)', angle: 90 },
      { name: '남동풍 (SE)', angle: 135 },
      { name: '남풍 (S)', angle: 180 },
      { name: '남서풍 (SW)', angle: 225 },
      { name: '서풍 (W)', angle: 270 },
      { name: '북서풍 (NW)', angle: 315 },
    ];
    const idx = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
    return directions[idx].name;
  };

  const getBeaufortDescription = (speedMs: number) => {
    if (speedMs < 1.5) return { label: '고요·미풍', color: 'text-stone-400' };
    if (speedMs < 5.5) return { label: '남실바람', color: 'text-emerald-400' };
    if (speedMs < 11.0) return { label: '된바람', color: 'text-sky-400' };
    if (speedMs < 17.0) return { label: '강풍주의보급', color: 'text-amber-400' };
    if (speedMs < 28.0) return { label: '양간지풍·돌풍', color: 'text-orange-400' };
    return { label: '극단적 태풍급 강풍', color: 'text-rose-400 font-bold' };
  };

  const getRiskBadgeStyles = (level: RiskLevel) => {
    switch (level) {
      case '낮음':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-400',
          border: 'border-emerald-500/35',
          barColor: 'bg-emerald-500',
          label: '낮음 (Low)',
        };
      case '보통':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-400',
          border: 'border-amber-500/35',
          barColor: 'bg-amber-500',
          label: '보통 (Moderate)',
        };
      case '높음':
        return {
          bg: 'bg-orange-500/20',
          text: 'text-orange-400',
          border: 'border-orange-500/40',
          barColor: 'bg-orange-500',
          label: '높음 (High)',
        };
      case '매우높음':
        return {
          bg: 'bg-rose-500/25',
          text: 'text-rose-400',
          border: 'border-rose-500/50',
          barColor: 'bg-rose-500',
          label: '매우높음 (Extreme)',
        };
    }
  };

  const badgeStyle = getRiskBadgeStyles(prediction.level);
  const beaufort = getBeaufortDescription(weather.wind.speed);

  // Filtered dataset
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

  if (!showUI) {
    return (
      <div className="absolute top-4 right-4 z-40">
        <button
          id="btn-show-ui"
          onClick={onToggleUI}
          className="bg-stone-950/90 hover:bg-stone-900 border border-stone-800 text-stone-200 px-3 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md cursor-pointer transition-all"
        >
          <Eye className="w-4 h-4 text-orange-400" />
          <span>관제 UI 표시</span>
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none font-sans">
      {/* 1. TOP HEADER: Global Fire Telemetry & Environment Switcher */}
      <header className="absolute top-3.5 left-4 right-4 z-30 flex items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Branding & Real-time Disaster Telemetry Bar */}
        <div className="bg-stone-950/95 backdrop-blur-md border border-stone-800/90 rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-colors ${isAlarm ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-stone-800 text-stone-400'}`}>
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white leading-none">3D 산불 확산 물리 시뮬레이터</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-900 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                  <Mountain className="w-3 h-3 text-amber-400" />
                  100 km² (10,000 ha)
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold flex items-center gap-1.5 ${
                    isAlarm
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isAlarm ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                  {isAlarm ? '화선 확산 중' : '모의 대기 중'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-stone-400 mt-1 font-mono">
                <span className="flex items-center gap-1 text-stone-300">
                  <Timer className="w-3 h-3 text-stone-400" />
                  {formatTime(stats.elapsedSeconds)}
                </span>
                <span className="text-stone-600">·</span>
                <span className="text-orange-300 font-semibold">{stats.activeFires}개 화선</span>
                <span className="text-stone-600">·</span>
                <span className="text-amber-200">
                  소실 {stats.burnedAreaHa.toFixed(1)} ha ({stats.burnedAreaKm2.toFixed(2)} km²)
                </span>
                <span className="text-stone-600">·</span>
                <span className="text-rose-300 font-semibold">
                  확산속도 {stats.spreadRateMMin.toFixed(1)} m/min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Camera Presets, Lighting, and Panel Toggles */}
        <div className="bg-stone-950/95 backdrop-blur-md border border-stone-800/90 rounded-2xl px-3 py-1.5 shadow-2xl flex items-center gap-2">
          {/* Camera Presets */}
          <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-xl p-0.5">
            <button
              id="cam-orbit"
              onClick={() => onSelectCamera('orbit')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                cameraPreset === 'orbit' ? 'bg-stone-800 text-white font-semibold shadow-sm' : 'text-stone-400 hover:text-stone-200'
              }`}
              title="3D 자유 궤도 시점"
            >
              3D 궤도
            </button>
            <button
              id="cam-topdown"
              onClick={() => onSelectCamera('top_down')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                cameraPreset === 'top_down' ? 'bg-stone-800 text-white font-semibold shadow-sm' : 'text-stone-400 hover:text-stone-200'
              }`}
              title="수직 조감도 (Top-down GIS Map)"
            >
              조감도
            </button>
            <button
              id="cam-track"
              onClick={() => onSelectCamera('track_front')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                cameraPreset === 'track_front' ? 'bg-stone-800 text-orange-400 font-semibold shadow-sm' : 'text-stone-400 hover:text-stone-200'
              }`}
              title="화선 전면 자동 추적"
            >
              화선 추적
            </button>
          </div>

          <div className="h-4 w-px bg-stone-800" />

          {/* Lighting Mode Selector */}
          <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-xl p-0.5">
            <button
              id="light-day"
              onClick={() => onSelectLighting('day')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                lighting === 'day' ? 'bg-amber-500/20 text-amber-300' : 'text-stone-400 hover:text-stone-200'
              }`}
              title="주간 모드 (맑은 태양광)"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              id="light-dusk"
              onClick={() => onSelectLighting('dusk')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                lighting === 'dusk' ? 'bg-orange-500/20 text-orange-300' : 'text-stone-400 hover:text-stone-200'
              }`}
              title="황혼 모드 (노을빛 화염 강조)"
            >
              <Sunset className="w-3.5 h-3.5" />
            </button>
            <button
              id="light-night"
              onClick={() => onSelectLighting('night')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                lighting === 'night' ? 'bg-indigo-500/20 text-indigo-300' : 'text-stone-400 hover:text-stone-200'
              }`}
              title="야간 모드 (심야 화재)"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-stone-800" />

          {/* Panel Visibility Toggle */}
          <button
            id="btn-toggle-panel"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPanelOpen
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                : 'bg-stone-900 text-stone-300 hover:text-white border border-stone-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isPanelOpen ? '관제창 접기' : '관제창 열기'}</span>
          </button>

          {/* Minimize UI */}
          <button
            id="btn-hide-ui"
            onClick={onToggleUI}
            title="UI 숨기기"
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. RIGHT INTEGRATED CONTROL & ANALYTICS DOCK (Single Unified Window) */}
      {isPanelOpen && (
        <aside className="absolute top-18 right-4 bottom-22 z-20 flex flex-col pointer-events-auto w-[420px] max-w-[calc(100vw-32px)] transition-all duration-300">
          <div className="bg-stone-950/95 backdrop-blur-md border border-stone-800/90 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden text-stone-100">
            {/* Header with Unified Navigation Tabs */}
            <div className="p-3 border-b border-stone-800/80 bg-stone-900/50">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-400" />
                  <span className="font-bold text-sm text-stone-100">통합 관제 & 시뮬레이션</span>
                </div>
                <button
                  id="btn-close-dock"
                  onClick={() => setIsPanelOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
                  title="패널 닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 3 Main Tabs: Weather, Analytics, Scenarios */}
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-stone-900 border border-stone-800/90 text-xs">
                <button
                  id="tab-weather"
                  onClick={() => setActiveTab('weather')}
                  className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'weather'
                      ? 'bg-stone-800 text-white shadow-sm font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>기상 제어</span>
                </button>
                <button
                  id="tab-analytics"
                  onClick={() => setActiveTab('analytics')}
                  className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'analytics'
                      ? 'bg-stone-800 text-white shadow-sm font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>피해 분석</span>
                </button>
                <button
                  id="tab-scenarios"
                  onClick={() => setActiveTab('scenarios')}
                  className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'scenarios'
                      ? 'bg-stone-800 text-white shadow-sm font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>시나리오·DB</span>
                </button>
              </div>
            </div>

            {/* Tab Body (Scrollable with clean spacing) */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar pr-2">
              {/* ================= TAB 1: EXPANDED WEATHER CONTROLS ================= */}
              {activeTab === 'weather' && (
                <div className="flex flex-col gap-3">
                  {/* Weather Presets */}
                  <div className="flex flex-col gap-1.5 bg-stone-900/60 border border-stone-800/80 rounded-xl p-2.5">
                    <span className="text-[11px] font-semibold text-stone-300">대표 기상 프리셋</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() =>
                          onUpdateWeather({
                            temperature: 26,
                            humidity: 15,
                            wind: { speed: 28, direction: 225 },
                            spottingEnabled: true,
                          })
                        }
                        className="text-left px-2 py-1.5 rounded-lg bg-stone-950/80 hover:bg-stone-800 border border-orange-500/30 text-[11px] transition-colors cursor-pointer text-orange-200"
                      >
                        <span className="font-semibold block text-orange-400">💨 영동 양간지풍</span>
                        <span className="text-[10px] text-stone-400">28m/s 강풍 · 습도 15%</span>
                      </button>
                      <button
                        onClick={() =>
                          onUpdateWeather({
                            temperature: -6,
                            humidity: 14,
                            wind: { speed: 14, direction: 315 },
                            spottingEnabled: true,
                          })
                        }
                        className="text-left px-2 py-1.5 rounded-lg bg-stone-950/80 hover:bg-stone-800 border border-sky-500/30 text-[11px] transition-colors cursor-pointer text-sky-200"
                      >
                        <span className="font-semibold block text-sky-400">❄️ 겨울 한파 건조</span>
                        <span className="text-[10px] text-stone-400">-6°C · 14m/s · 건조 14%</span>
                      </button>
                      <button
                        onClick={() =>
                          onUpdateWeather({
                            temperature: 42,
                            humidity: 9,
                            wind: { speed: 18, direction: 180 },
                            spottingEnabled: true,
                          })
                        }
                        className="text-left px-2 py-1.5 rounded-lg bg-stone-950/80 hover:bg-stone-800 border border-rose-500/30 text-[11px] transition-colors cursor-pointer text-rose-200"
                      >
                        <span className="font-semibold block text-rose-400">🔥 폭염 가뭄 특보</span>
                        <span className="text-[10px] text-stone-400">42°C · 습도 9% · 남풍</span>
                      </button>
                      <button
                        onClick={() =>
                          onUpdateWeather({
                            temperature: 22,
                            humidity: 32,
                            wind: { speed: 42, direction: 90 },
                            spottingEnabled: true,
                          })
                        }
                        className="text-left px-2 py-1.5 rounded-lg bg-stone-950/80 hover:bg-stone-800 border border-amber-500/30 text-[11px] transition-colors cursor-pointer text-amber-200"
                      >
                        <span className="font-semibold block text-amber-400">🌪️ 태풍급 극한 강풍</span>
                        <span className="text-[10px] text-stone-400">42m/s 돌풍 · 동풍</span>
                      </button>
                    </div>
                  </div>

                  {/* Atmospheric Sliders & Direct Inputs */}
                  <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-3 flex flex-col gap-3.5">
                    <span className="text-xs font-semibold text-stone-200 border-b border-stone-800/60 pb-1.5 flex items-center justify-between">
                      <span>기상 파라미터 제어 (실시간 연동)</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${badgeStyle.bg} ${badgeStyle.text} border ${badgeStyle.border}`}>
                        {prediction.level}
                      </span>
                    </span>

                    {/* 1. Temperature (-10°C to 48°C) */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs text-stone-300">
                        <span className="flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                          <span>기온 (Temperature)</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="-10"
                            max="48"
                            value={weather.temperature}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) onUpdateWeather({ temperature: Math.min(48, Math.max(-10, val)) });
                            }}
                            className="w-16 bg-stone-950 border border-stone-700 rounded px-2 py-0.5 text-right font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-400"
                          />
                          <span className="font-mono text-stone-400 text-xs">°C</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="48"
                        value={weather.temperature}
                        onChange={(e) => onUpdateWeather({ temperature: parseInt(e.target.value, 10) })}
                        className="w-full accent-amber-400 h-1.5 bg-stone-800 rounded cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                        <span>-10°C (혹한)</span>
                        <span>18°C (보통)</span>
                        <span>48°C (폭염)</span>
                      </div>
                    </div>

                    {/* 2. Humidity (5% to 100%) */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs text-stone-300">
                        <span className="flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-blue-400" />
                          <span>상대 습도 (Humidity)</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="5"
                            max="100"
                            value={weather.humidity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) onUpdateWeather({ humidity: Math.min(100, Math.max(5, val)) });
                            }}
                            className="w-16 bg-stone-950 border border-stone-700 rounded px-2 py-0.5 text-right font-mono text-xs text-blue-300 focus:outline-none focus:border-blue-400"
                          />
                          <span className="font-mono text-stone-400 text-xs">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={weather.humidity}
                        onChange={(e) => onUpdateWeather({ humidity: parseInt(e.target.value, 10) })}
                        className="w-full accent-blue-400 h-1.5 bg-stone-800 rounded cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                        <span className="text-rose-400">5% (초건조 경보)</span>
                        <span>50%</span>
                        <span>100% (다습)</span>
                      </div>
                    </div>

                    {/* 3. Wind Speed (0 to 45 m/s) */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs text-stone-300">
                        <span className="flex items-center gap-1.5">
                          <Wind className="w-3.5 h-3.5 text-sky-400" />
                          <span>풍속 (Wind Speed)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold ${beaufort.color}`}>{beaufort.label}</span>
                          <input
                            type="number"
                            min="0"
                            max="45"
                            step="0.5"
                            value={weather.wind.speed}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) onUpdateWeather({ wind: { ...weather.wind, speed: Math.min(45, Math.max(0, val)) } });
                            }}
                            className="w-16 bg-stone-950 border border-stone-700 rounded px-2 py-0.5 text-right font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-400"
                          />
                          <span className="font-mono text-stone-400 text-xs">m/s</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="45"
                        step="0.5"
                        value={weather.wind.speed}
                        onChange={(e) => onUpdateWeather({ wind: { ...weather.wind, speed: parseFloat(e.target.value) } })}
                        className="w-full accent-sky-400 h-1.5 bg-stone-800 rounded cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                        <span>0 m/s (고요)</span>
                        <span>15 m/s (강풍)</span>
                        <span>30 m/s (폭풍)</span>
                        <span className="text-rose-400">45 m/s (태풍)</span>
                      </div>
                    </div>
                  </div>

                  {/* Wind Direction & Spotting Controls */}
                  <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-stone-800/60 pb-1.5">
                      <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-rose-400" />
                        <span>풍향 (0° ~ 360°)</span>
                      </span>
                      <span className="font-mono text-rose-300 font-semibold text-xs">
                        {getWindCardinal(weather.wind.direction)} ({weather.wind.direction}°)
                      </span>
                    </div>

                    {/* Cardinal 8-Direction Quick Selector */}
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: '북 (0°)', deg: 0 },
                        { label: '북동 (45°)', deg: 45 },
                        { label: '동 (90°)', deg: 90 },
                        { label: '남동 (135°)', deg: 135 },
                        { label: '남 (180°)', deg: 180 },
                        { label: '남서 (225°)', deg: 225 },
                        { label: '서 (270°)', deg: 270 },
                        { label: '북서 (315°)', deg: 315 },
                      ].map((item) => (
                        <button
                          key={item.deg}
                          onClick={() => onUpdateWeather({ wind: { ...weather.wind, direction: item.deg } })}
                          className={`py-1 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
                            Math.abs(weather.wind.direction - item.deg) < 22.5 ||
                            (item.deg === 0 && weather.wind.direction >= 337.5)
                              ? 'bg-rose-500/25 border-rose-500/50 text-rose-300 font-bold'
                              : 'bg-stone-950/80 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Wind Direction Range Slider */}
                    <input
                      type="range"
                      min="0"
                      max="359"
                      value={weather.wind.direction}
                      onChange={(e) => onUpdateWeather({ wind: { ...weather.wind, direction: parseInt(e.target.value, 10) } })}
                      className="w-full accent-rose-500 h-1.5 bg-stone-800 rounded cursor-pointer mt-1"
                    />

                    {/* Spotting Fire Toggle */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                      <div>
                        <div className="text-xs text-stone-200 font-medium">비화 (불씨 도약) 시뮬레이션</div>
                        <div className="text-[10px] text-stone-400">강풍 시 불티가 200m~1.5km 날아가 신규 발화</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={weather.spottingEnabled}
                        onChange={(e) => onUpdateWeather({ spottingEnabled: e.target.checked })}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* One-Click Fire Ignite Button */}
                  <button
                    onClick={() => onIgniteSample(weather.temperature, weather.humidity, weather.wind.speed)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Flame className="w-4 h-4 text-amber-200 fill-amber-200 animate-pulse" />
                    <span>현재 기상 조건으로 산불 발화 및 확산 시작</span>
                  </button>
                </div>
              )}

              {/* ================= TAB 2: ANALYTICS & RISK PROFILE ================= */}
              {activeTab === 'analytics' && (
                <div className="flex flex-col gap-3">
                  {/* Embedded Recharts Real-Time Spread Trend */}
                  <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-orange-400" />
                        <span>실시간 확산 동향 그래프</span>
                      </span>
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          isPlaying && stats.activeFires > 0 ? 'bg-orange-500 animate-ping' : 'bg-stone-500'
                        }`}
                      />
                    </div>
                    <FireStatsDashboard stats={stats} isPlaying={isPlaying} />
                  </div>

                  {/* 100km² Mountain Scale Specification Card */}
                  <div className="bg-stone-900/60 border border-stone-800/80 rounded-xl p-2.5 text-xs">
                    <div className="flex items-center justify-between text-stone-200 font-semibold mb-1">
                      <span className="flex items-center gap-1.5">
                        <Mountain className="w-4 h-4 text-amber-400" />
                        <span>100 km² 대형 산맥 지형 스펙</span>
                      </span>
                      <span className="font-mono text-amber-300 font-bold">10,000 ha (100배)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-400 mt-1.5 font-mono">
                      <div className="bg-stone-950/70 p-2 rounded-lg border border-stone-800/80">
                        <span className="text-stone-500 block text-[10px]">지형 가로×세로</span>
                        <span className="text-stone-200 font-medium">10,000m × 10,000m</span>
                      </div>
                      <div className="bg-stone-950/70 p-2 rounded-lg border border-stone-800/80">
                        <span className="text-stone-500 block text-[10px]">최고 주봉 고도</span>
                        <span className="text-stone-200 font-medium">1,450m (백두대간급)</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Wildfire Risk Predictor Card */}
                  <div className={`rounded-xl p-3 border transition-all ${badgeStyle.bg} ${badgeStyle.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-stone-300 font-medium">인공지능 판별 위험 등급</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 shadow-sm ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.barColor}`} />
                        {badgeStyle.label}
                      </span>
                    </div>

                    {/* Risk Score Progress */}
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

                    {/* Probability Breakdown */}
                    <div className="mt-2.5 pt-2 border-t border-stone-800/60 grid grid-cols-4 gap-1 text-center">
                      {(['낮음', '보통', '높음', '매우높음'] as RiskLevel[]).map((lvl) => {
                        const prob = prediction.probabilities[lvl];
                        const isWinning = prediction.level === lvl;
                        return (
                          <div
                            key={lvl}
                            className={`px-1 py-1 rounded ${
                              isWinning
                                ? 'bg-stone-900/90 font-bold border border-stone-700/80 text-white'
                                : 'opacity-60 text-stone-300'
                            }`}
                          >
                            <div className="text-[10px] text-stone-400">{lvl}</div>
                            <div className="font-mono text-xs font-semibold">{prob}%</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Physics Multipliers */}
                    <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-stone-400 font-mono">
                      <span>확산 배율: <strong className="text-stone-200 font-semibold">{prediction.spreadMultiplier.toFixed(2)}x</strong></span>
                      <span>화염 세기: <strong className="text-stone-200 font-semibold">{prediction.flameIntensityScale.toFixed(2)}x</strong></span>
                      <span>비화 계수: <strong className="text-stone-200 font-semibold">{prediction.spottingProbabilityFactor.toFixed(1)}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 3: SCENARIOS & KFS DATASET ================= */}
              {activeTab === 'scenarios' && (
                <div className="flex flex-col gap-3">
                  {/* Mountain Wildfire Preset Scenarios */}
                  <div className="bg-stone-900/60 border border-stone-800/80 rounded-xl p-3 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-stone-200">산악 지형 대표 발화 시나리오</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onApplyScenario('valley')}
                        className="text-left p-2 rounded-lg bg-stone-950/80 hover:bg-stone-800 border border-stone-800 text-xs transition-colors cursor-pointer"
                      >
                        <span className="font-semibold block text-orange-400">골짜기 강풍 확산</span>
                        <span className="text-[10px] text-stone-400">협곡 바람 터널 효과</span>
                      </button>
                      <button
                        onClick={() => onApplyScenario('ridge')}
                        className="text-left p-2 rounded-lg bg-stone-950/80 hover:bg-stone-800 border border-stone-800 text-xs transition-colors cursor-pointer"
                      >
                        <span className="font-semibold block text-amber-400">능선 급상승 산불</span>
                        <span className="text-[10px] text-stone-400">오르막 경사 가속</span>
                      </button>
                      <button
                        onClick={() => onApplyScenario('spotting')}
                        className="text-left p-2 rounded-lg bg-stone-950/80 hover:bg-stone-800 border border-stone-800 text-xs transition-colors cursor-pointer"
                      >
                        <span className="font-semibold block text-rose-400">양간지풍 비화(불티)</span>
                        <span className="text-[10px] text-stone-400">원거리 도약 화재</span>
                      </button>
                      <button
                        onClick={() => onApplyScenario('multi')}
                        className="text-left p-2 rounded-lg bg-stone-950/80 hover:bg-stone-800 border border-stone-800 text-xs transition-colors cursor-pointer"
                      >
                        <span className="font-semibold block text-yellow-400">낙뢰 동시 다중 발화</span>
                        <span className="text-[10px] text-stone-400">3개 연봉 동시 점화</span>
                      </button>
                    </div>
                  </div>

                  {/* KFS 100-Sample Wildfire Weather Dataset Explorer */}
                  <div className="bg-stone-900/60 border border-stone-800/80 rounded-xl p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-200">
                        산림청 실증 기상 데이터 (100건)
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {filteredDataset.length}건
                      </span>
                    </div>

                    {/* Filter and Search */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-stone-500" />
                        <input
                          type="text"
                          placeholder="검색..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-7 pr-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                      <select
                        value={datasetFilter}
                        onChange={(e) => setDatasetFilter(e.target.value as any)}
                        className="bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-stone-200 focus:outline-none font-mono cursor-pointer"
                      >
                        <option value="전체">전체 등급</option>
                        <option value="낮음">낮음</option>
                        <option value="보통">보통</option>
                        <option value="높음">높음</option>
                        <option value="매우높음">매우높음</option>
                      </select>
                    </div>

                    {/* Sample List */}
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                      {filteredDataset.slice(0, 30).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onIgniteSample(item.temperature, item.humidity, item.windSpeed)}
                          className="flex items-center justify-between p-2 rounded-lg bg-stone-950/70 hover:bg-stone-900 border border-stone-800/70 text-xs cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-stone-500">#{item.id}</span>
                            <span className="text-amber-300">{item.temperature}°C</span>
                            <span className="text-blue-300">습도 {item.humidity}%</span>
                            <span className="text-sky-300">{item.windSpeed}m/s</span>
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
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* 3. BOTTOM DOCK: Playback, Speed, Reset & Real-Time Weather Pill */}
      <footer className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-center pointer-events-none">
        <div className="bg-stone-950/95 backdrop-blur-md border border-stone-800/90 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3.5 pointer-events-auto">
          {/* Play/Pause Button */}
          <button
            id="btn-play-pause"
            onClick={onTogglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                : 'bg-orange-600 hover:bg-orange-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? '일시정지' : '시뮬레이션 재생'}</span>
          </button>

          {/* Reset Mountain Button */}
          <button
            id="btn-reset"
            onClick={onReset}
            title="100 km² 산악 지형 및 산불 초기화"
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors border border-stone-800 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-stone-800" />

          {/* Simulation Speed Multipliers */}
          <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1">
            {[1, 5, 15, 60].map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
                  speed === s ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
                title={s === 60 ? '1초당 실제 1분 경과 가속' : `${s}배속`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-stone-800" />

          {/* Weather Status Chip */}
          <div className="text-xs text-stone-300 font-mono hidden md:flex items-center gap-2.5 bg-stone-900/70 px-3 py-1.5 rounded-xl border border-stone-800/80">
            <span className="text-amber-300 font-semibold">{weather.temperature}°C</span>
            <span className="text-stone-600">|</span>
            <span className="text-blue-300 font-semibold">습도 {weather.humidity}%</span>
            <span className="text-stone-600">|</span>
            <span className="text-sky-300 font-semibold">{weather.wind.speed.toFixed(1)}m/s</span>
            <span className="text-stone-600">|</span>
            <span className="text-rose-300 font-semibold">{getWindCardinal(weather.wind.direction)}</span>
            <span className="text-stone-600">|</span>
            <span className={`${badgeStyle.text} font-bold`}>{prediction.level}</span>
          </div>
        </div>
      </footer>
    </div>
  );
});
