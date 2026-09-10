# 🏛️ 시스템 아키텍처 (System Architecture)

본 문서는 **산불 3D 시뮬레이터 (Wildfire 3D Simulation & Control System)**의 전체 소프트웨어 구조, 모듈 간 상호작용, 렌더링 파이프라인 및 고성능 연산 최적화 설계를 기술합니다.

---

## 1. 시스템 개요 및 설계 철학

산불 시뮬레이터는 **실시간 고화질 3D WebGL 렌더링**과 **16,384개 셀의 비선형 격자 연산(Cellular Automata)**을 단일 브라우저 스레드 환경에서 60 FPS로 부드럽게 유지하는 것을 최우선 목표로 설계되었습니다.

이를 위해 다음 핵심 원칙을 채택하였습니다:
1. **명령형 3D 엔진(Three.js)과 선언적 UI(React)의 철저한 분리**
   * React의 불필요한 가상 DOM 리렌더링이 Three.js 렌더 루프에 간섭하지 않도록 제어.
2. **이중 빈도(Dual-Rate) 루프 아키텍처**
   * WebGL 3D 렌더링 및 파티클 시스템: **60 FPS**
   * UI 메트릭 및 통계 갱신: **~15 FPS 쓰로틀링 (Throttle)**
3. **가비지 컬렉션(GC) 억제 및 메모리 재사용**
   * 매 프레임 Vector3, Matrix4, Color 인스턴스 생성을 금지하고 사전 할당된 객체(`dummyMatrix`, `dummyColor`) 재사용.
4. **InstancedMesh 기반 16,000+ 수목 고속 렌더링**
   * 드로우 콜(Draw Call)을 1회로 압축하여 대규모 수목과 산림을 렌더링.

---

## 2. 계층별 아키텍처 구조 (Layered Architecture)

```text
+-----------------------------------------------------------------------------------+
|                              1. Presentation Layer                                |
|  [FireMetricsOverlay] (HUD)                  [SimulationControls] (User Controls) |
+-----------------------------------------------------------------------------------+
                                         │ React Props / Callbacks
+-----------------------------------------------------------------------------------+
|                        2. Coordinator Layer (React Root)                          |
|                                    App.tsx                                        |
|  - requestAnimationFrame 메인 루프     - React State <-> Engine Ref 동기화          |
|  - UI Throttle (~15 FPS) 제어          - Raycasting 발화 이벤트 브릿지             |
+-----------------------------------------------------------------------------------+
                  │                                            │
                  ▼                                            ▼
+------------------------------------+       +--------------------------------------+
|     3. Simulation Engine Layer     |       |       4. 3D WebGL Render Layer       |
|       (FireSpreadEngine.ts)        |       |        (Three.js Scene Graph)        |
|------------------------------------|       |--------------------------------------|
| - 128x128 Cellular Automata 격자   |       | - SceneManager.ts (카메라/조명/컨트롤)|
| - Rothermel 연소 및 확산 물리 수식   | ───▶ | - TerrainMesh.ts (정점 색상/수목)    |
| - 풍향/경사도/건조도/비화 계산       |       | - FireParticleSystem.ts (불/연기/불씨)|
| - Active Fire Coordinates 추출     |       | - OrbitControls & Raycaster          |
+------------------------------------+       +--------------------------------------+
                  │
                  ▼
+-----------------------------------------------------------------------------------+
|                         5. Procedural Geometry & Data                             |
|                                (terrainData.ts)                                   |
| - FBM & Ridged Multifractal Noise 지형 고도 (Heights Array)                        |
| - Bilinear Interpolation 수목 표면 흡착 위치 (16,000+ Trees)                       |
+-----------------------------------------------------------------------------------+
```

---

## 3. 핵심 모듈별 역할 및 책임

### 3.1 `App.tsx` (루트 조정기)
* Three.js 캔버스 컨테이너를 React 수명 주기(`useEffect`)에 바인딩합니다.
* `requestAnimationFrame` 루프를 실행하여 매 프레임 경과 시간($dt$)을 계산하고 엔진과 렌더러를 동기화합니다.
* React 상태(`weather`, `isPlaying`, `speed`)를 `useRef`로 미러링하여 클로저 지연(Stale Closure) 없이 최신 파라미터를 렌더 루프에 공급합니다.

### 3.2 `FireSpreadEngine.ts` (산불 시뮬레이션 엔진)
* $128 \times 128$ 크기의 `TerrainCell[][]` 2차원 배열 상태를 관리합니다.
* 활성 발화 지점 집합(`activeFires: Set<string>`)을 통해 전체 16,384개 셀 중 현재 불타는 셀만 O(1)로 순회하여 연산 효율을 극대화합니다.
* 매 틱마다 불꽃이 소진된 셀을 `CellStatus.BURNED`로 전이시키고, 이웃 8개 셀로의 발화 확률을 계산하여 확산합니다.
* 비화(Spotting) 발생 시 풍하측(Downwind) 셀을 무작위 샘플링하여 신규 발화합니다.

### 3.3 `SceneManager.ts` (3D 씬 매니저)
* Three.js의 `PerspectiveCamera`, `WebGLRenderer`, `Scene`, `OrbitControls`를 총괄 관리합니다.
* 낮(Day), 황혼(Dusk), 밤(Night)에 따른 방향광(DirectionalLight), 환경광(AmbientLight), 안개(Fog) 색상 및 강도를 동적으로 전환합니다.
* 현재 가장 활발한 화선의 중심 좌표(`fireFrontCenter`)를 3개의 동적 포인트 라이트로 조명하여 실시간 화재 현장감을 연출합니다.
* 화면 클릭 좌표를 3D 지형 표면 좌표로 변환하는 마우스 레이캐스팅(Raycasting) 및 조준선(Reticle) 렌더링을 처리합니다.

### 3.4 `TerrainMesh.ts` (지형 및 수목 렌더러)
* $128 \times 128$ 정점의 `PlaneGeometry`를 X축 -90도 회전시켜 산악 지형을 구축합니다.
* `geometry.attributes.color`의 정점 컬러 버퍼를 시뮬레이션 격자의 연소 상태(`CellStatus`)에 맞추어 `needsUpdate = true`로 점진적 탄화 색상을 블렌딩합니다.
* 16,000여 개의 수목은 단 1개의 `InstancedMesh`로 생성되며, 불에 탄 셀 위에 위치한 수목은 스케일을 축소하고 어둡게 탄화시킵니다.

### 3.5 `FireParticleSystem.ts` (화염/연기/불씨 파티클)
* **십자 쿼드(Crossed Quads) 화염 메쉬:** 500개의 입체 화염 기둥을 `InstancedMesh`로 배치.
* **화염 파티클 (4,200개):** `THREE.Points` 기반으로 불꽃의 탄생, 상승, 색상 페이드아웃 처리.
* **연기 파티클 (4,800개):** 반투명 텍스처를 사용하여 풍향 벡터를 따라 흩어지는 짙은 연기 기둥 구현.
* **비산 불씨 (1,600개):** 가벼운 무게와 난류(Turbulence)를 반영하여 공중으로 솟구치는 반딧불이 형태의 파티클.

---

## 4. 좌표계 매핑 및 데이터 흐름

시뮬레이터는 세 가지 상호 호환 좌표계를 사용합니다:

```text
[그리드 좌표계 (Grid)]          [월드 좌표계 (Three.js World)]         [화면 정규화 좌표계 (NDC)]
  x ∈ [0, 127]                    X ∈ [-500.0, +500.0]                  X_ndc ∈ [-1.0, +1.0]
  z ∈ [0, 127]                    Y ∈ [0.0, +220.0]                     Y_ndc ∈ [-1.0, +1.0]
                                  Z ∈ [-500.0, +500.0]
```

### 변환 공식
1. **그리드 좌표 $\rightarrow$ 월드 좌표:**
   $$X_{world} = (x_{grid} - 63.5) \times \Delta s \quad (\Delta s = 1000 / 127 \approx 7.87\text{m})$$
   $$Z_{world} = (z_{grid} - 63.5) \times \Delta s$$
2. **월드 좌표 $\rightarrow$ 그리드 좌표:**
   $$x_{grid} = \text{round}\left(\frac{X_{world}}{\Delta s} + 63.5\right)$$
   $$z_{grid} = \text{round}\left(\frac{Z_{world}}{\Delta s} + 63.5\right)$$
3. **마우스 클릭 $\rightarrow$ 월드 좌표 (Raycasting):**
   * 마우스 포인터 $(x, y) \rightarrow \text{NDC}(-1 \sim 1) \rightarrow \text{Raycaster} \rightarrow \text{TerrainMesh}$ 정밀 교차점 산출.

---

## 5. 성능 및 메모리 최적화 전략

| 기법 | 적용 대상 | 효과 |
| :--- | :--- | :--- |
| **InstancedMesh 병합** | 16,000+ 수목, 500개 화염 기둥 | 드로우 콜(Draw Call)을 32,000+회에서 단 2회로 감축 |
| **Active Fire Hash Set** | `activeFires = Set<string>` | 비발화 상태의 16,000개 셀 검사를 건너뛰어 $O(N)$ 연산 제거 |
| **UI State Throttling** | React `setStats` | 초당 60회의 React 재평가를 초당 15회로 제한하여 UI 쓰레드 래그 방지 |
| **절차적 캔버스 텍스처** | 화염, 연기, 불씨 텍스처 | 외부 이미지 애셋 로딩 대기 시간 및 네트워크 병목 제거 |
| **TypedArray 버퍼 재사용** | 파티클 좌표/속도/수명 배열 | GC(Garbage Collector)의 Stop-the-World 일시정지 완전 차단 |
| **PCF Shadow Map 최적화** | 방향광 그림자 (DirectionalLight) | 2048x2048 해상도 섀도 버퍼에 적절한 바이어스를 적용하여 렌더링 유지 |
