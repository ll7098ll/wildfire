import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FireSpreadEngine } from './simulation/fireSpreadEngine';
import { generateTerrainData, GRID_SIZE } from './simulation/terrainData';
import { FireParticleSystem } from './three/FireParticleSystem';
import { SceneManager } from './three/SceneManager';
import { TerrainMesh } from './three/TerrainMesh';
import { CameraPreset, LightingMode, SimulationStats, WeatherConditions } from './types';
import { FireMetricsOverlay } from './components/FireMetricsOverlay';
import { SimulationControls } from './components/SimulationControls';

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
    totalForestHa: 0,
    burnedPercentage: 0,
    spreadRateMMin: 0,
    elapsedSeconds: 0,
    peakIntensity: 0,
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

    const { grid, heights, treePositions } = generateTerrainData();
    const terrainMesh = new TerrainMesh(grid, heights, treePositions);
    terrainMeshRef.current = terrainMesh;

    const fireParticles = new FireParticleSystem();
    fireParticlesRef.current = fireParticles;

    const engine = new FireSpreadEngine(grid);
    engineRef.current = engine;

    // Do NOT auto-ignite on mount: wait for the user to click the mountain!
    const handleIgniteClick = (worldX: number, worldZ: number) => {
      if (engineRef.current) {
        const count = engineRef.current.igniteWorld(worldX, worldZ, 2);
        if (count > 0) {
          setIsPlaying(true);
          setUserIgnitionAlert(`발화 발생! (좌표: X ${Math.round(worldX)}, Z ${Math.round(worldZ)})`);
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
        terrainMesh.updateFromGrid(engineRef.current.getGrid());

        // Throttle UI React state updates (~15 FPS for high UI performance)
        uiThrottle += rawDt;
        if (uiThrottle > 0.066) {
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
    const { grid } = generateTerrainData();
    engineRef.current.reset(grid);
    terrainMeshRef.current.resetTrees();
    terrainMeshRef.current.updateFromGrid(grid);
    fireParticlesRef.current.clear();
    // Do NOT auto-ignite on reset: preserve peaceful mountain until user clicks!
    setStats({
      activeFires: 0,
      burnedAreaHa: 0,
      totalForestHa: stats.totalForestHa,
      burnedPercentage: 0,
      spreadRateMMin: 0,
      elapsedSeconds: 0,
      peakIntensity: 0,
    });
    setUserIgnitionAlert('산림 지형이 초기화되었습니다. 산의 원하는 위치를 클릭하여 산불을 시작하세요.');
    setTimeout(() => setUserIgnitionAlert(null), 3500);
    setIsPlaying(true);
  };

  // Preset Scenarios
  const handleApplyScenario = (scenarioKey: string) => {
    if (!engineRef.current || !terrainMeshRef.current || !fireParticlesRef.current) return;

    // Reset grid first
    const { grid } = generateTerrainData();
    engineRef.current.reset(grid);
    terrainMeshRef.current.resetTrees();
    terrainMeshRef.current.updateFromGrid(grid);
    fireParticlesRef.current.clear();

    if (scenarioKey === 'valley') {
      // 골짜기 강풍 확산
      setWeather({
        humidity: 22,
        temperature: 34,
        wind: { speed: 18, direction: 45 },
        spottingEnabled: true,
      });
      engineRef.current.ignite(42, 88, 3);
      setUserIgnitionAlert('💨 골짜기 협곡 강풍 확산 시나리오 발화 완료!');
    } else if (scenarioKey === 'ridge') {
      // 능선 급상승 화재: 오르막 바람과 경사도 가속
      setWeather({
        humidity: 18,
        temperature: 36,
        wind: { speed: 10, direction: 140 },
        spottingEnabled: false,
      });
      engineRef.current.ignite(78, 52, 3);
      setUserIgnitionAlert('⛰️ 능선 급상승 산불 시나리오 발화 완료!');
    } else if (scenarioKey === 'spotting') {
      // 비화(불씨 도약) 산불: 시속 22m/s 강풍
      setWeather({
        humidity: 15,
        temperature: 37,
        wind: { speed: 22, direction: 90 },
        spottingEnabled: true,
      });
      engineRef.current.ignite(32, 64, 3);
      setUserIgnitionAlert('🔥 비화(불씨 도약) 산불 시나리오 발화 완료!');
    } else if (scenarioKey === 'multi') {
      // 낙뢰 다중 동시 발화
      setWeather({
        humidity: 25,
        temperature: 31,
        wind: { speed: 14, direction: 220 },
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
                산악 지형의 원하는 위치를 클릭하여 산불을 시작하세요!
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                확대된 대형 산맥 지형 클릭 시 해당 지점에서 화선이 발화되어 번져나갑니다
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

      {/* Master UI Collapse/Expand Float Button */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto">
        <button
          id="btn-toggle-all-ui"
          onClick={() => setShowUI((v) => !v)}
          title={showUI ? '모든 메뉴 창 숨기기' : '모든 메뉴 창 펼치기'}
          className="bg-stone-950/85 hover:bg-stone-900 backdrop-blur-md border border-stone-800 text-stone-300 hover:text-white px-3 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium transition-all cursor-pointer"
        >
          {showUI ? <EyeOff className="w-3.5 h-3.5 text-stone-400" /> : <Eye className="w-3.5 h-3.5 text-orange-400" />}
          <span>{showUI ? '메뉴 숨기기' : '메뉴 전체 표시'}</span>
        </button>
      </div>

      {/* Real-time Fire Metrics HUD (Collapsible) */}
      {showUI && <FireMetricsOverlay stats={stats} weather={weather} />}

      {/* Bottom Controls Bar (Collapsible) */}
      {showUI && (
        <SimulationControls
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          speed={speed}
          onChangeSpeed={setSpeed}
          onReset={handleReset}
          weather={weather}
          onUpdateWeather={handleUpdateWeather}
          cameraPreset={cameraPreset}
          onSelectCamera={handleSelectCamera}
          lighting={lighting}
          onSelectLighting={handleSelectLighting}
          onApplyScenario={handleApplyScenario}
        />
      )}
    </main>
  );
}
