import React, { useEffect, useRef, useState } from 'react';
import { FireSpreadEngine } from './simulation/fireSpreadEngine';
import { generateTerrainData, getTerrainConfig, GRID_SIZE } from './simulation/terrainData';
import { FireParticleSystem } from './three/FireParticleSystem';
import { SceneManager } from './three/SceneManager';
import { TerrainMesh } from './three/TerrainMesh';
import { CameraPreset, LightingMode, SimulationStats, TerrainScaleMode, WeatherConditions } from './types';
import { IntegratedControlHub } from './components/IntegratedControlHub';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const engineRef = useRef<FireSpreadEngine | null>(null);
  const terrainMeshRef = useRef<TerrainMesh | null>(null);
  const fireParticlesRef = useRef<FireParticleSystem | null>(null);

  // Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1.0);
  const [showUI, setShowUI] = useState<boolean>(true);
  const scaleMode: TerrainScaleMode = '100x';

  const [weather, setWeather] = useState<WeatherConditions>({
    humidity: 28,
    temperature: 32,
    wind: {
      speed: 12,
      direction: 45, // North-East
    },
    spottingEnabled: true,
  });

  const [stats, setStats] = useState<SimulationStats>({
    activeFires: 0,
    burnedAreaHa: 0,
    burnedAreaKm2: 0,
    totalForestHa: 8200,
    totalAreaKm2: 100,
    burnedPercentage: 0,
    spreadRateMMin: 0,
    elapsedSeconds: 0,
    peakIntensity: 0,
    scaleMode: '100x',
  });

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('orbit');
  const [lighting, setLighting] = useState<LightingMode>('day');
  const [userIgnitionAlert, setUserIgnitionAlert] = useState<string | null>(null);

  // Keep refs for loop values to avoid stale closures
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;

  // Initialize Three.js and Simulation Engine
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up any existing children to prevent duplicate canvases (StrictMode safe)
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const config = getTerrainConfig('100x');
    const { grid, heights, treePositions } = generateTerrainData(config);
    const terrainMesh = new TerrainMesh(grid, heights, treePositions, config);
    terrainMeshRef.current = terrainMesh;

    const fireParticles = new FireParticleSystem('100x');
    fireParticlesRef.current = fireParticles;

    const engine = new FireSpreadEngine(grid, config);
    engineRef.current = engine;

    // Do NOT auto-ignite on mount: wait for the user to click the mountain!
    const handleIgniteClick = (worldX: number, worldZ: number) => {
      if (engineRef.current) {
        const count = engineRef.current.igniteWorld(worldX, worldZ, 2);
        if (count > 0) {
          setIsPlaying(true);
          setUserIgnitionAlert(`발화 발생! (좌표: X ${Math.round(worldX)}m, Z ${Math.round(worldZ)}m)`);
          setTimeout(() => setUserIgnitionAlert(null), 3500);
        }
      }
    };

    const sceneManager = new SceneManager(
      containerRef.current,
      terrainMesh,
      fireParticles,
      handleIgniteClick
    );
    sceneManagerRef.current = sceneManager;

    // Immediate initial layout sync
    const initW = containerRef.current.clientWidth || window.innerWidth || 1200;
    const initH = containerRef.current.clientHeight || window.innerHeight || 800;
    sceneManager.handleResize(initW, initH);

    let lastTime = performance.now();
    let animId: number;
    let uiThrottle = 0;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);

      const rawDt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const effectiveDt = rawDt * speedRef.current;

      if (isPlayingRef.current && engineRef.current) {
        const currentStats = engineRef.current.update(effectiveDt, weatherRef.current);

        // Update terrain colors and trees
        terrainMeshRef.current?.updateFromGrid(engineRef.current.getGrid());

        // Throttle UI React state updates (~5 FPS for optimal UI responsiveness without main thread lag)
        uiThrottle += rawDt;
        if (uiThrottle >= 0.20) {
          setStats(currentStats);
          uiThrottle = 0;
        }
      }

      // Collect active fires coordinates for 3D particles & dynamic lighting
      const firePoints = engineRef.current ? engineRef.current.getActiveFireCoordinates() : [];
      const fireFrontCenter = engineRef.current ? engineRef.current.getFireFrontCenter() : { x: 0, y: 15, z: 0 };

      // Update Three.js scene & particles
      try {
        sceneManager.update(rawDt, firePoints, fireFrontCenter, weatherRef.current);
      } catch (e) {
        console.error('Three.js render loop error:', e);
      }
    };

    animId = requestAnimationFrame(animate);

    // Resize observer & window listener
    const handleWindowResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || window.innerWidth;
        const h = containerRef.current.clientHeight || window.innerHeight;
        sceneManager.handleResize(w, h);
      }
    };
    window.addEventListener('resize', handleWindowResize);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          sceneManager.handleResize(width, height);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      sceneManager.dispose();
      if (containerRef.current && sceneManager.renderer.domElement && sceneManager.renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(sceneManager.renderer.domElement);
      }
    };
  }, []);

  // Update camera preset in Three.js
  const handleSelectCamera = (preset: CameraPreset) => {
    setCameraPreset(preset);
    if (sceneManagerRef.current && engineRef.current) {
      sceneManagerRef.current.setCameraPreset(preset, engineRef.current.getFireFrontCenter());
    }
  };

  // Update lighting mode in Three.js
  const handleSelectLighting = (mode: LightingMode) => {
    setLighting(mode);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setLightingMode(mode);
    }
  };

  // Weather update handler
  const handleUpdateWeather = (newWeather: Partial<WeatherConditions>) => {
    setWeather((prev) => ({ ...prev, ...newWeather }));
  };

  // Reset simulation
  const handleReset = () => {
    if (!engineRef.current || !terrainMeshRef.current || !fireParticlesRef.current) return;
    const config = getTerrainConfig('100x');
    const { grid } = generateTerrainData(config);
    engineRef.current.reset(grid, config);
    terrainMeshRef.current.resetTrees();
    terrainMeshRef.current.updateFromGrid(grid);
    fireParticlesRef.current.clear();
    setStats({
      activeFires: 0,
      burnedAreaHa: 0,
      burnedAreaKm2: 0,
      totalForestHa: stats.totalForestHa,
      totalAreaKm2: 100,
      burnedPercentage: 0,
      spreadRateMMin: 0,
      elapsedSeconds: 0,
      peakIntensity: 0,
      scaleMode: '100x',
    });
    setUserIgnitionAlert('100 km² 대형 산악 지형이 초기화되었습니다. 산의 원하는 위치를 클릭하여 산불을 시작하세요.');
    setTimeout(() => setUserIgnitionAlert(null), 3500);
    setIsPlaying(true);
  };

  // Preset Scenarios
  const handleApplyScenario = (scenarioKey: string) => {
    if (!engineRef.current || !terrainMeshRef.current || !fireParticlesRef.current) return;

    const config = getTerrainConfig('100x');
    // Reset grid first
    const { grid } = generateTerrainData(config);
    engineRef.current.reset(grid, config);
    terrainMeshRef.current.resetTrees();
    terrainMeshRef.current.updateFromGrid(grid);
    fireParticlesRef.current.clear();

    if (scenarioKey === 'valley') {
      // 골짜기 강풍 확산
      setWeather({
        humidity: 20,
        temperature: 34,
        wind: { speed: 20, direction: 45 },
        spottingEnabled: true,
      });
      engineRef.current.ignite(42, 88, 3);
      setUserIgnitionAlert('💨 골짜기 협곡 강풍 확산 시나리오 발화 완료!');
    } else if (scenarioKey === 'ridge') {
      // 능선 급상승 화재: 오르막 바람과 경사도 가속
      setWeather({
        humidity: 16,
        temperature: 36,
        wind: { speed: 12, direction: 140 },
        spottingEnabled: false,
      });
      engineRef.current.ignite(78, 52, 3);
      setUserIgnitionAlert('⛰️ 능선 급상승 산불 시나리오 발화 완료!');
    } else if (scenarioKey === 'spotting') {
      // 양간지풍 비화(불씨 도약) 산불: 시속 28m/s 강풍
      setWeather({
        humidity: 14,
        temperature: 28,
        wind: { speed: 28, direction: 225 },
        spottingEnabled: true,
      });
      engineRef.current.ignite(32, 64, 3);
      setUserIgnitionAlert('🔥 영동 양간지풍 비화(불씨 도약) 산불 시나리오 발화 완료!');
    } else if (scenarioKey === 'multi') {
      // 낙뢰 다중 동시 발화
      setWeather({
        humidity: 24,
        temperature: 30,
        wind: { speed: 15, direction: 270 },
        spottingEnabled: true,
      });
      engineRef.current.ignite(36, 40, 2);
      engineRef.current.ignite(92, 94, 2);
      engineRef.current.ignite(98, 36, 2);
      setUserIgnitionAlert('⚡ 낙뢰 3대 연봉 동시 발화 시나리오 시작!');
    }

    setTimeout(() => setUserIgnitionAlert(null), 3500);
    setIsPlaying(true);
  };

  // AI Sample Ignite Trigger
  const handleIgniteSample = (temperature: number, humidity: number, windSpeed: number) => {
    if (!engineRef.current || !terrainMeshRef.current || !fireParticlesRef.current) return;

    const config = getTerrainConfig('100x');
    // Reset mountain state
    const { grid } = generateTerrainData(config);
    engineRef.current.reset(grid, config);
    terrainMeshRef.current.resetTrees();
    terrainMeshRef.current.updateFromGrid(grid);
    fireParticlesRef.current.clear();

    // Update weather with the provided conditions
    setWeather((prev) => ({
      ...prev,
      temperature,
      humidity,
      wind: {
        ...prev.wind,
        speed: windSpeed,
      },
      spottingEnabled: windSpeed >= 7.0,
    }));

    // Ignite in central mountain valley
    engineRef.current.ignite(64, 64, 3);
    setUserIgnitionAlert(
      `🔥 기상 조건 (${temperature}°C / 습도 ${humidity}% / 풍속 ${windSpeed}m/s) 기준 100km² 광역 산불 발화 완료!`
    );
    setTimeout(() => setUserIgnitionAlert(null), 4000);
    setIsPlaying(true);
  };

  return (
    <main className="relative w-full h-full min-h-screen overflow-hidden bg-stone-950 select-none font-sans">
      {/* Three.js 3D WebGL Canvas Container */}
      <div id="threejs-wildfire-viewport" ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair overflow-hidden block" />

      {/* Top Floating User Instruction Banner (Active when waiting for user click) */}
      {stats.activeFires === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-300">
          <div className="bg-stone-950/90 backdrop-blur-md border border-orange-500/60 shadow-[0_0_24px_rgba(249,115,22,0.3)] text-stone-100 px-5 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
            </span>
            <div className="text-center">
              <p className="text-sm font-semibold text-orange-200">
                ⛰️ 100km² (10,000 ha) 산악 지형의 원하는 위치를 클릭하여 산불을 시작하세요!
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                10km × 10km 초대형 산악 능선과 골짜기를 클릭하면 즉시 화선이 발화되어 실시간으로 전파됩니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Ignition Confirmation Toast */}
      {userIgnitionAlert && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-200">
          <div className="bg-orange-600/95 backdrop-blur-md text-white font-medium text-xs px-4 py-2 rounded-xl shadow-xl border border-orange-400/50 flex items-center gap-2 animate-bounce">
            <span>🔥</span>
            <span>{userIgnitionAlert}</span>
          </div>
        </div>
      )}

      {/* Integrated Unified Control & AI Hub */}
      <IntegratedControlHub
        stats={stats}
        weather={weather}
        onUpdateWeather={handleUpdateWeather}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        speed={speed}
        onChangeSpeed={setSpeed}
        onReset={handleReset}
        cameraPreset={cameraPreset}
        onSelectCamera={handleSelectCamera}
        lighting={lighting}
        onSelectLighting={handleSelectLighting}
        onApplyScenario={handleApplyScenario}
        onIgniteSample={handleIgniteSample}
        showUI={showUI}
        onToggleUI={() => setShowUI((v) => !v)}
      />
    </main>
  );
}
