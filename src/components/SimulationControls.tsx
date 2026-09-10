import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Droplets,
  Eye,
  FastForward,
  Flame,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Sunset,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';
import { CameraPreset, LightingMode, WeatherConditions } from '../types';

interface SimulationControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onChangeSpeed: (s: number) => void;
  onReset: () => void;
  weather: WeatherConditions;
  onUpdateWeather: (w: Partial<WeatherConditions>) => void;
  cameraPreset: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  lighting: LightingMode;
  onSelectLighting: (mode: LightingMode) => void;
  onApplyScenario: (scenarioKey: string) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isPlaying,
  onTogglePlay,
  speed,
  onChangeSpeed,
  onReset,
  weather,
  onUpdateWeather,
  cameraPreset,
  onSelectCamera,
  lighting,
  onSelectLighting,
  onApplyScenario,
}) => {
  const [isPlaybackCollapsed, setIsPlaybackCollapsed] = useState(false);
  const [isWeatherCollapsed, setIsWeatherCollapsed] = useState(false);

  // Convert wind degrees to cardinal direction name
  const getWindCardinal = (deg: number) => {
    const directions = ['북풍 (N)', '북동풍 (NE)', '동풍 (E)', '남동풍 (SE)', '남풍 (S)', '남서풍 (SW)', '서풍 (W)', '북서풍 (NW)'];
    const idx = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
    return directions[idx];
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap gap-3 items-end justify-between pointer-events-none">
      {/* Left Dock: Playback & Scenarios & Guidance */}
      <div className="flex flex-col gap-2 pointer-events-auto max-w-md w-full transition-all duration-300">
        {/* Click to ignite tip banner (shown only when expanded) */}
        {!isPlaybackCollapsed && (
          <div className="bg-orange-950/70 backdrop-blur-md border border-orange-700/50 text-orange-200 text-xs px-3 py-1.5 rounded-lg flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400 shrink-0 animate-pulse" />
              <span>
                <strong>발화 안내:</strong> 3D 산악 지형을 클릭하면 해당 위치에 즉시 산불이 점화됩니다.
              </span>
            </div>
          </div>
        )}

        {/* Playback Controls Box */}
        <div className="bg-stone-950/85 backdrop-blur-md border border-stone-800/80 rounded-xl p-3 shadow-2xl text-stone-100 flex flex-col gap-2.5 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                id="btn-play-pause"
                onClick={onTogglePlay}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-md cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold'
                    : 'bg-orange-600 hover:bg-orange-500 text-white font-semibold'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? '일시정지' : '시뮬레이션 재생'}</span>
              </button>

              <button
                id="btn-reset"
                onClick={onReset}
                title="시뮬레이션 초기화"
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors border border-stone-700/60 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed Multiplier */}
              <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-lg p-1">
                {[0.5, 1, 2, 4].map((s) => (
                  <button
                    key={s}
                    id={`btn-speed-${s}x`}
                    onClick={() => onChangeSpeed(s)}
                    className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                      speed === s
                        ? 'bg-stone-700 text-stone-100'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Left Dock Collapse/Expand Toggle */}
              <button
                id="btn-toggle-playback-collapse"
                onClick={() => setIsPlaybackCollapsed((p) => !p)}
                title={isPlaybackCollapsed ? '시뮬레이션 제어창 펼치기' : '시뮬레이션 제어창 접기'}
                className="p-1.5 rounded-lg bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700/60 cursor-pointer shrink-0"
              >
                {isPlaybackCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Preset Scenarios Buttons (Hidden when collapsed) */}
          {!isPlaybackCollapsed && (
            <div className="pt-2 border-t border-stone-800/80">
              <span className="text-xs text-stone-400 font-medium mb-1.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                추천 발화 시나리오
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="btn-scenario-valley"
                  onClick={() => onApplyScenario('valley')}
                  className="px-2.5 py-1.5 rounded-md bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs text-left transition-colors cursor-pointer truncate"
                >
                  💨 골짜기 강풍 확산
                </button>
                <button
                  id="btn-scenario-ridge"
                  onClick={() => onApplyScenario('ridge')}
                  className="px-2.5 py-1.5 rounded-md bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs text-left transition-colors cursor-pointer truncate"
                >
                  ⛰️ 능선 급상승 화재
                </button>
                <button
                  id="btn-scenario-spotting"
                  onClick={() => onApplyScenario('spotting')}
                  className="px-2.5 py-1.5 rounded-md bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs text-left transition-colors cursor-pointer truncate"
                >
                  🔥 비화(불씨 도약) 산불
                </button>
                <button
                  id="btn-scenario-multi"
                  onClick={() => onApplyScenario('multi')}
                  className="px-2.5 py-1.5 rounded-md bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs text-left transition-colors cursor-pointer truncate"
                >
                  ⚡ 낙뢰 다중 동시 발화
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Dock: Wind, Weather & Camera */}
      <div className="flex flex-col gap-2 pointer-events-auto max-w-[420px] w-full transition-all duration-300">
        {/* Camera & Lighting Bar (Always accessible, compact header) */}
        <div className="bg-stone-950/85 backdrop-blur-md border border-stone-800/80 rounded-xl px-3 py-2 shadow-2xl flex items-center justify-between gap-2 text-stone-200">
          {/* Camera Presets */}
          <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
            <span className="text-xs text-stone-400 mr-1 flex items-center gap-1 shrink-0 whitespace-nowrap font-medium">
              <Eye className="w-3.5 h-3.5" />
              시점:
            </span>
            <button
              id="btn-cam-orbit"
              onClick={() => onSelectCamera('orbit')}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                cameraPreset === 'orbit'
                  ? 'bg-stone-700 text-white font-medium shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              자유 궤도
            </button>
            <button
              id="btn-cam-track"
              onClick={() => onSelectCamera('track_front')}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                cameraPreset === 'track_front'
                  ? 'bg-stone-700 text-white font-medium shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              화선 추적
            </button>
            <button
              id="btn-cam-topdown"
              onClick={() => onSelectCamera('top_down')}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                cameraPreset === 'top_down'
                  ? 'bg-stone-700 text-white font-medium shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              조감도
            </button>
          </div>

          {/* Time of Day Lighting Mode & Weather Collapse Toggle */}
          <div className="flex items-center gap-1 border-l border-stone-800 pl-2 shrink-0 whitespace-nowrap">
            <button
              id="btn-light-dusk"
              title="황혼 (화염 극대화)"
              onClick={() => onSelectLighting('dusk')}
              className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                lighting === 'dusk' ? 'bg-orange-500/30 text-orange-400' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sunset className="w-4 h-4" />
            </button>
            <button
              id="btn-light-night"
              title="야간"
              onClick={() => onSelectLighting('night')}
              className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                lighting === 'night' ? 'bg-indigo-500/30 text-indigo-400' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              id="btn-light-day"
              title="주간"
              onClick={() => onSelectLighting('day')}
              className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                lighting === 'day' ? 'bg-amber-500/30 text-amber-300' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>

            {/* Right Dock Weather Collapse Button */}
            <button
              id="btn-toggle-weather-collapse"
              onClick={() => setIsWeatherCollapsed((w) => !w)}
              title={isWeatherCollapsed ? '기상 패널 펼치기' : '기상 패널 접기'}
              className="p-1 rounded-md bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700/50 ml-0.5 shrink-0"
            >
              {isWeatherCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Weather & Wind Control Panel (Collapsible) */}
        {!isWeatherCollapsed ? (
          <div className="bg-stone-950/85 backdrop-blur-md border border-stone-800/80 rounded-xl p-3.5 shadow-2xl text-stone-100 flex flex-col gap-3 transition-all duration-300">
            {/* Wind Speed & Direction */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-stone-300">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  풍향 / 풍속
                </span>
                <span className="font-mono text-sky-300">
                  {getWindCardinal(weather.wind.direction)} · {weather.wind.speed} m/s
                </span>
              </div>

              {/* Wind Direction Dial & Angle Slider */}
              <div className="flex items-center gap-3">
                {/* Compass Indicator */}
                <div className="relative w-11 h-11 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center shrink-0">
                  <div
                    className="w-0.5 h-7 bg-gradient-to-t from-transparent via-sky-400 to-red-400 rounded transition-transform"
                    style={{ transform: `rotate(${weather.wind.direction}deg)` }}
                  />
                  <span className="absolute -top-1 text-[8px] font-mono text-stone-400">N</span>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span>풍향 각도</span>
                    <span className="font-mono">{weather.wind.direction}°</span>
                  </div>
                  <input
                    id="slider-wind-dir"
                    type="range"
                    min="0"
                    max="359"
                    value={weather.wind.direction}
                    onChange={(e) =>
                      onUpdateWeather({
                        wind: { ...weather.wind, direction: parseInt(e.target.value, 10) },
                      })
                    }
                    className="w-full accent-sky-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Wind Speed Slider */}
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span>바람 세기</span>
                  <span className="font-mono">{weather.wind.speed} m/s</span>
                </div>
                <input
                  id="slider-wind-speed"
                  type="range"
                  min="0"
                  max="25"
                  value={weather.wind.speed}
                  onChange={(e) =>
                    onUpdateWeather({
                      wind: { ...weather.wind, speed: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full accent-sky-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Humidity & Temperature */}
            <div className="pt-2.5 border-t border-stone-800/80 flex flex-col gap-2.5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-stone-300">
                    <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    대기 습도 (건조도)
                  </span>
                  <span className="font-mono text-blue-300">{weather.humidity}%</span>
                </div>
                <input
                  id="slider-humidity"
                  type="range"
                  min="10"
                  max="85"
                  value={weather.humidity}
                  onChange={(e) => onUpdateWeather({ humidity: parseInt(e.target.value, 10) })}
                  className="w-full accent-blue-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Spotting toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-stone-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  불씨 비화(Spotting) 현상
                </span>
                <button
                  id="btn-toggle-spotting"
                  onClick={() => onUpdateWeather({ spottingEnabled: !weather.spottingEnabled })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    weather.spottingEnabled ? 'bg-orange-500' : 'bg-stone-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      weather.spottingEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Minimized Weather Badge Summary */
          <div
            onClick={() => setIsWeatherCollapsed(false)}
            className="bg-stone-950/80 backdrop-blur-md border border-stone-800/70 hover:border-stone-700 rounded-xl px-3 py-2 shadow-xl text-stone-300 flex items-center justify-between cursor-pointer transition-all text-xs"
          >
            <div className="flex items-center gap-2">
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {getWindCardinal(weather.wind.direction)} {weather.wind.speed}m/s · 습도 {weather.humidity}%
              </span>
            </div>
            <span className="text-[11px] text-stone-500 hover:text-stone-300 font-medium flex items-center gap-0.5">
              펼치기 <ChevronUp className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
