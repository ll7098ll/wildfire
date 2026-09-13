import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Flame,
  Trees,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SimulationStats } from '../types';

interface FireStatsDashboardProps {
  stats: SimulationStats;
  isPlaying: boolean;
  compact?: boolean;
}

interface MetricPoint {
  time: string;
  seconds: number;
  activeFires: number;
  burnedPercentage: number;
  spreadRate: number;
}

export const FireStatsDashboard: React.FC<FireStatsDashboardProps> = React.memo(({
  stats,
  isPlaying,
  compact = false,
}) => {
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [activeMetric, setActiveMetric] = useState<'both' | 'fires' | 'burned'>('both');
  const lastRecordedSec = useRef<number>(-1);

  // Accumulate time-series metrics smoothly (1 sample per second of simulation)
  useEffect(() => {
    const currentSec = Math.floor(stats.elapsedSeconds);
    if (currentSec !== lastRecordedSec.current) {
      lastRecordedSec.current = currentSec;

      const mins = Math.floor(currentSec / 60);
      const secs = currentSec % 60;
      const timeLabel = `${mins}:${secs.toString().padStart(2, '0')}`;

      const newPoint: MetricPoint = {
        time: timeLabel,
        seconds: currentSec,
        activeFires: stats.activeFires,
        burnedPercentage: parseFloat(stats.burnedPercentage.toFixed(2)),
        spreadRate: parseFloat(stats.spreadRateMMin.toFixed(1)),
      };

      setHistory((prev) => {
        const updated = [...prev, newPoint];
        if (updated.length > 35) {
          return updated.slice(updated.length - 35);
        }
        return updated;
      });
    }
  }, [stats.elapsedSeconds, stats.activeFires, stats.burnedPercentage, stats.spreadRateMMin]);

  // Reset graph history when simulation resets
  useEffect(() => {
    if (stats.elapsedSeconds === 0) {
      setHistory([
        {
          time: '0:00',
          seconds: 0,
          activeFires: 0,
          burnedPercentage: 0,
          spreadRate: 0,
        },
      ]);
      lastRecordedSec.current = -1;
    }
  }, [stats.elapsedSeconds]);

  const peakFires = history.reduce((max, p) => Math.max(max, p.activeFires), 0);

  return (
    <div className="flex flex-col gap-2.5 font-sans text-stone-100">
      {/* Metric Selector Badges */}
      <div className="grid grid-cols-2 gap-2">
        {/* Active Fires Badge */}
        <div
          onClick={() => setActiveMetric((m) => (m === 'fires' ? 'both' : 'fires'))}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeMetric === 'fires' || activeMetric === 'both'
              ? 'bg-orange-500/10 border-orange-500/30'
              : 'bg-stone-900/40 border-stone-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>활성 화선</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-orange-400">
              {stats.activeFires}
              <span className="text-[10px] text-stone-400 font-normal ml-1">개</span>
            </span>
            <span className="text-[10px] font-mono text-stone-400">
              최대 {peakFires}
            </span>
          </div>
        </div>

        {/* Burned Percentage Badge */}
        <div
          onClick={() => setActiveMetric((m) => (m === 'burned' ? 'both' : 'burned'))}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeMetric === 'burned' || activeMetric === 'both'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-stone-900/40 border-stone-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
            <span className="flex items-center gap-1">
              <Trees className="w-3.5 h-3.5 text-red-400" />
              <span>소실률</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-red-400">
              {stats.burnedPercentage.toFixed(1)}
              <span className="text-[10px] text-stone-400 font-normal ml-0.5">%</span>
            </span>
            <span className="text-[10px] font-mono text-stone-400">
              {stats.scaleMode === '100x'
                ? `${(stats.burnedAreaKm2 ?? stats.burnedAreaHa / 100).toFixed(2)} km²`
                : `${stats.burnedAreaHa.toFixed(1)} ha`}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Filter Selector */}
      <div className="flex items-center justify-between gap-1 p-0.5 bg-stone-900/90 rounded-lg border border-stone-800 text-[10px]">
        <button
          onClick={() => setActiveMetric('both')}
          className={`flex-1 py-1 rounded font-medium cursor-pointer transition-colors ${
            activeMetric === 'both'
              ? 'bg-stone-800 text-white font-semibold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          통합 추이
        </button>
        <button
          onClick={() => setActiveMetric('fires')}
          className={`flex-1 py-1 rounded font-medium cursor-pointer transition-colors ${
            activeMetric === 'fires'
              ? 'bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          화선수 (개)
        </button>
        <button
          onClick={() => setActiveMetric('burned')}
          className={`flex-1 py-1 rounded font-medium cursor-pointer transition-colors ${
            activeMetric === 'burned'
              ? 'bg-red-500/20 text-red-300 font-semibold border border-red-500/30'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          소실률 (%)
        </button>
      </div>

      {/* Recharts Area Chart Container */}
      <div className="h-44 w-full bg-stone-950/70 rounded-xl p-1.5 border border-stone-800/80">
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFiresUnified" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorBurnedUnified" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="time"
                tick={{ fill: '#78716c', fontSize: 9 }}
                stroke="#44403c"
                tickLine={false}
              />

              {(activeMetric === 'both' || activeMetric === 'fires') && (
                <YAxis
                  yAxisId="fires"
                  orientation="left"
                  tick={{ fill: '#fb923c', fontSize: 9 }}
                  stroke="#78716c"
                  tickLine={false}
                  domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.25))]}
                />
              )}

              {(activeMetric === 'both' || activeMetric === 'burned') && (
                <YAxis
                  yAxisId="burned"
                  orientation="right"
                  tick={{ fill: '#f87171', fontSize: 9 }}
                  stroke="#78716c"
                  tickLine={false}
                  domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.15))]}
                  unit="%"
                />
              )}

              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(12, 10, 9, 0.95)',
                  borderColor: '#44403c',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  color: '#f5f5f4',
                  padding: '8px 12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
                }}
                labelStyle={{ color: '#a8a29e', fontWeight: 600, marginBottom: 4 }}
                formatter={(value: any, name: string) => {
                  if (name === 'activeFires') return [`${value} 개`, '활성 화선'];
                  if (name === 'burnedPercentage') return [`${value} %`, '산림 소실률'];
                  return [value, name];
                }}
              />

              {(activeMetric === 'both' || activeMetric === 'fires') && (
                <Area
                  yAxisId="fires"
                  type="monotone"
                  dataKey="activeFires"
                  stroke="#f97316"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFiresUnified)"
                  isAnimationActive={false}
                />
              )}

              {(activeMetric === 'both' || activeMetric === 'burned') && (
                <Area
                  yAxisId="burned"
                  type="monotone"
                  dataKey="burnedPercentage"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray={activeMetric === 'both' ? '3 3' : undefined}
                  fillOpacity={1}
                  fill="url(#colorBurnedUnified)"
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-stone-500 font-mono">
            산불 데이터 수집 대기 중...
          </div>
        )}
      </div>

      {/* Real-time Propagation Rate Indicator */}
      <div className="bg-stone-900/60 border border-stone-800/80 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-stone-300">
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          <span>화선 전파 속도 (ROS)</span>
        </span>
        <span className="font-mono text-amber-300 font-bold">
          {stats.spreadRateMMin.toFixed(1)}
          <span className="text-[10px] text-stone-400 font-normal ml-0.5">m/min</span>
        </span>
      </div>
    </div>
  );
});
