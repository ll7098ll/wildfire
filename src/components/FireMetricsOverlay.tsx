import React, { useState } from 'react';
import { Activity, AlertTriangle, ChevronDown, ChevronUp, Flame, ShieldAlert, Timer, Trees, Wind } from 'lucide-react';
import { SimulationStats, WeatherConditions } from '../types';

interface FireMetricsOverlayProps {
  stats: SimulationStats;
  weather: WeatherConditions;
}

export const FireMetricsOverlay: React.FC<FireMetricsOverlayProps> = ({ stats, weather }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isAlarm = stats.activeFires > 0;

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      {/* Title & Status Indicator */}
      <div className="bg-stone-950/85 backdrop-blur-md border border-stone-800/80 rounded-xl p-3.5 shadow-2xl text-stone-100 transition-all duration-300">
        <div className={`flex items-center justify-between ${isCollapsed ? '' : 'mb-3 border-b border-stone-800/60 pb-2.5'}`}>
          <div className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${isAlarm ? 'text-orange-500 animate-pulse' : 'text-stone-500'}`} />
            <h1 className="font-semibold text-base tracking-tight">산불 3D 실시간 관제</h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium flex items-center gap-1.5 ${
                isAlarm
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAlarm ? 'bg-red-500' : 'bg-emerald-400'}`} />
              {isAlarm ? '화선 확산 중' : '정상 / 대기'}
            </span>

            {/* Collapse/Expand Toggle Button */}
            <button
              id="btn-toggle-metrics-collapse"
              onClick={() => setIsCollapsed((prev) => !prev)}
              title={isCollapsed ? '관제 대시보드 펼치기' : '관제 대시보드 접기'}
              className="pointer-events-auto p-1 rounded-md bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700/50"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="transition-all duration-300">
            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Active Flames */}
              <div className="bg-stone-900/60 border border-stone-800/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
                  <span>활성 화선 셀</span>
                  <Activity className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div className="text-xl font-mono font-bold text-orange-400">
                  {stats.activeFires.toLocaleString()}
                  <span className="text-xs font-normal text-stone-400 ml-1">pts</span>
                </div>
              </div>

              {/* Burned Area */}
              <div className="bg-stone-900/60 border border-stone-800/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
                  <span>피해 면적</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div className="text-xl font-mono font-bold text-red-400">
                  {stats.burnedAreaHa}
                  <span className="text-xs font-normal text-stone-400 ml-1">ha</span>
                </div>
              </div>

              {/* Spread Velocity */}
              <div className="bg-stone-900/60 border border-stone-800/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
                  <span>화선 전파 속도</span>
                  <Wind className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-mono font-bold text-amber-300">
                  {stats.spreadRateMMin}
                  <span className="text-xs font-normal text-stone-400 ml-1">m/min</span>
                </div>
              </div>

              {/* Forest Loss Rate */}
              <div className="bg-stone-900/60 border border-stone-800/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
                  <span>산림 소실률</span>
                  <Trees className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-mono font-bold text-stone-200">
                  {stats.burnedPercentage}
                  <span className="text-xs font-normal text-stone-400 ml-0.5">%</span>
                </div>
              </div>
            </div>

            {/* Progress Bar of Forest Loss */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-stone-400 mb-1">
                <span>산림 잔여율</span>
                <span>{Math.max(0, 100 - stats.burnedPercentage)}% 잔여</span>
              </div>
              <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 h-full transition-all duration-300"
                  style={{ width: `${stats.burnedPercentage}%` }}
                />
              </div>
            </div>

            {/* Elapsed Timer & Spotting Notice */}
            <div className="mt-3 pt-2.5 border-t border-stone-800/60 flex items-center justify-between text-xs text-stone-400">
              <div className="flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-stone-400" />
                <span>시뮬레이션 시간:</span>
                <span className="font-mono text-stone-200 font-semibold">{formatTime(stats.elapsedSeconds)}</span>
              </div>
              {weather.wind.speed > 10 && weather.spottingEnabled && isAlarm && (
                <div className="flex items-center gap-1 text-red-400 font-medium animate-bounce">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>강풍 비화 경보</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
