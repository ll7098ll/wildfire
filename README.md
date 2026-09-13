# 🔥 산불 3D 시뮬레이터 (Wildfire 3D Simulation & Control System)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)

**산불 3D 시뮬레이터**는 WebGL(Three.js)과 세포 자동자(Cellular Automata), 그리고 산불 확산 물리 수식(Rothermel Model 변형)을 융합하여 개발된 **고정밀 3D 실시간 광역 산불 발화 및 확산 관제 시뮬레이션 대시보드**입니다.

사용자는 실제 백두대간 산악 지형을 닮은 **$10\text{km} \times 10\text{km}$ ($100\text{ km}^2$, 10,000 ha)** 규모의 3D 초대형 산림 모델 위에서 임의 지점을 클릭하여 산불을 발화시키고, 영동 양간지풍·겨울 한파 건조·폭염 가뭄 등 극한 기상 인자(기온 $-10\sim 48^\circ\text{C}$, 습도 $5\sim 100\%$, 풍속 $0\sim 45\text{m/s}$)를 실시간으로 변경하며 불길이 능선과 골짜기를 타고 번져나가는 과정을 모니터링할 수 있습니다.

---

## 📌 주요 특징 (Key Features)

### 1. 100 km² 대형 산악 지형 & 16,000+ 수목 정밀 렌더링
* **실제 지리 스케일:** $10\text{km} \times 10\text{km}$ ($100\text{ km}^2$, 10,000 ha) 백두대간급 광역 산맥 모델 단일화
* **2D 경사도 노이즈 + Ridged Multifractal Noise + Domain Warping** 기반 절차적 지형 생성
* 해발 고도 1,450m급 주봉과 험준한 능선 및 깊은 협곡 완벽 재현 (단일 셀 폭 $\approx 78.7\text{m}$, 셀 면적 $\approx 6,200\text{m}^2 \approx 0.62\text{ha}$)
* `THREE.InstancedMesh` 최적화를 통해 **16,000그루 이상의 3D 침엽수·소나무**를 고도 및 경사도에 맞춰 실시간 렌더링
* 화선이 수목에 도달하면 단계별 연소 및 탄화(탄화목 색상 전이)를 거쳐 완전 소실

### 2. Rothermel 기반 고정밀 산불 전파 물리 엔진
* **세포 자동자(Cellular Automata) 128×128 그리드 (16,384개 셀)** 연산
* **지형 경사도 효과 (Slope Factor):**
  * 상향 화재(Uphill) 시 상승 열기류 및 화염 복사열로 윗쪽 식생이 예열되어 급격히 전파 속도 가속 ($k_{slope} = 1 + 3.2 \cdot \tan^{1.1}\theta$)
  * 하향 화재(Downhill) 시 확산 감속 및 자연 저지 효과 반영
* **풍향·풍속 벡터 효과 (Wind Factor):**
  * 풍향 벡터($\vec{W}$)와 화재 전파 방향 벡터($\vec{D}$)의 내적($\vec{W} \cdot \vec{D}$)을 산출하여 순풍 방향으로 화선 지수적 전파 촉진 및 역풍 억제
* **광범위 기상 조건 연동:**
  * 대기 기온($-10^\circ\text{C} \sim 48^\circ\text{C}$) 및 상대 습도($5\% \sim 100\%$) 연동 건조도 계수
  * 풍속($0.0 \sim 45.0\text{ m/s}$) 및 8방위($0^\circ \sim 360^\circ$) 정밀 풍향 제어
* **비화(Spotting Fire) 현상 시뮬레이션:**
  * 강풍 발생 시 상승 기류에 의해 불씨가 공중으로 치솟아 수백 미터에서 1.5km 이상 전방으로 도약 발화하는 현상 재현

### 3. AI 산불 위험도 예측 모델 & 산림청 100건 실증 데이터셋
* **다변수 머신러닝 기반 산불 위험도 예측 (Predictive Risk Model):**
  * 기온, 습도, 풍속 복합 인자를 평가하여 0~100점의 종합 위험도 지수 산출
  * 4단계 등급(낮음, 보통, 높음, 매우높음) 및 등급별 확률 분포 산출
  * 물리 확산 배율, 화염 강도 배율, 비화 계수 자동 산출
* **산림청(KFS) 100건 실증 기상 데이터 탐색기:**
  * 기상청/산림청 실측 데이터 기반 100개 샘플 기상 조건 탑재
  * 위험 등급별 필터링, 실시간 검색, 원클릭 3D 산불 발화 지원

### 4. 다층 Three.js 3D 파티클 & 다이내믹 라이팅 시스템
* **3D 십자 화염 기둥 (Crossed-Quad Instanced Mesh):** 화선 현장에 수백 개의 입체적 화염 배치
* **볼륨 화염 파티클 (4,200+ 개):** 강렬한 오렌지/옐로우 불꽃 분출
* **대기 연기 파티클 (4,800+ 개):** 바람 방향을 따라 날아가는 부드러운 다크 그레이 연기 기둥
* **비산 불씨 스파크 (1,600+ 개):** 공중으로 치솟아 흩어지는 빛나는 파티클
* **화선 추적 다이내믹 포인트 라이트:** 활성 화선의 중심 좌표를 실시간 추적하여 야간/황혼 시 주변 산맥에 실감 나는 화염 조명 투사

### 5. 통합 GIS 재난 관제 콘솔 UI
* **상단 글로벌 텔레메트리 바:** 활성 화선 수, 실소실 면적(ha 및 $\text{km}^2$), 실시간 확산 속도(m/min), 경과 시간 모니터링
* **우측 통합 관제 독:** 기상 제어, Recharts 실시간 확산 동향 그래프, 시나리오 및 100건 데이터셋을 3개 탭으로 통합
* **하단 재생 컨트롤러:** 재생/일시정지, 지형 초기화, 1x/5x/15x/60x 배속 전환, 실시간 기상 상태 요약 칩
* **조명 & 카메라 시점 프리셋:** 주간(Day), 황혼(Dusk), 심야(Night) 및 3D 궤도(Orbit), 조감도(Top-Down), 화선 전면 추적(Track Front) 지원

---

## 🛠️ 기술 스택 (Tech Stack)

| 영역 | 기술 / 라이브러리 | 용도 |
| :--- | :--- | :--- |
| **Framework** | React 19, TypeScript 5.8 | 모던 웹 컴포넌트 아키텍처 및 정적 타입 안정성 |
| **3D Graphics** | Three.js (r186) | WebGL 3D 렌더링, InstancedMesh, 커스텀 파티클, 쉐이더 |
| **Styling** | Tailwind CSS v4 | 다크 테마 기반의 항공/방재 관제실 스타일 UI 디자인 |
| **Icons & UI** | Lucide React, Motion | 모던 아이콘 팩 및 부드러운 UI 상태 전환 애니메이션 |
| **Build Tool** | Vite 6.2 | 초고속 HMR 및 프로덕션 번들 최적화 |

---

## 📂 프로젝트 구조 (Directory Structure)

```text
├── docs/                        # 상세 개발 문서 풀세트
│   ├── ARCHITECTURE.md          # 시스템 아키텍처 및 렌더링 파이프라인
│   ├── SIMULATION_MODEL.md      # 산불 전파 물리 수학 공식 및 알고리즘
│   ├── API_AND_MODULES.md       # 클래스, 모듈 및 타입 인터페이스 레퍼런스
│   ├── CONTRIBUTING.md          # 오픈소스 기여 가이드 및 커밋 컨벤션
│   └── DEPLOYMENT.md            # 프로덕션 빌드 및 도커/정적 배포 가이드
├── src/
│   ├── components/
│   │   ├── IntegratedControlHub.tsx # 통합 GIS 재난 관제 허브 (기상/분석/시나리오/상태바)
│   │   └── FireStatsDashboard.tsx   # Recharts 실시간 피해 면적 및 화선 추이 차트
│   ├── simulation/
│   │   ├── fireSpreadEngine.ts      # Rothermel 및 세포 자동자 광역 산불 엔진
│   │   ├── terrainData.ts           # 100km² 지형 생성, 고도 배열, 1.6만 수목 배치
│   │   └── wildfireRiskModel.ts     # AI 다변수 산불 위험 예측 모델 & KFS 100건 데이터셋
│   ├── three/
│   │   ├── FireParticleSystem.ts    # 화염 메쉬, 볼륨 불꽃, 연기, 비산 불씨 파티클
│   │   └── SceneManager.ts          # Three.js 씬, 카메라, 조명, 레이캐스터
│   │   └── TerrainMesh.ts           # 100km² 지형 지오메트리, 정점 색상, 수목 인스턴스
│   ├── App.tsx                      # 메인 뷰포트 및 시뮬레이션 루프 조정기
│   ├── types.ts                     # 전역 타입 및 인터페이스 선언
│   ├── main.tsx                     # React 엔트리포인트
│   └── index.css                    # Tailwind CSS 글로벌 스타일
├── CHANGELOG.md                 # 버전별 릴리즈 변경 이력
├── LICENSE                      # MIT 라이선스 전문
├── package.json                 # 의존성 및 실행 스크립트 정의
├── tsconfig.json                # TypeScript 컴파일러 설정
└── vite.config.ts               # Vite 설정
```

---

## 🚀 빠른 시작 (Quick Start)

### 1. 요구 사항
* Node.js 18.0.0 이상
* npm 또는 yarn, bun 패키지 매니저
* WebGL 2.0 지원 모던 웹 브라우저 (Chrome, Edge, Safari, Firefox 등)

### 2. 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/your-username/wildfire-3d-simulation.git
cd wildfire-3d-simulation

# 2. 패키지 설치
npm install

# 3. 로컬 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하면 즉시 3D 산악 지형을 확인할 수 있습니다.

### 3. 프로덕션 빌드

```bash
# 프로덕션 번들 빌드
npm run build

# 빌드 결과물 로컬 미리보기
npm run preview
```

---

## 🎮 조작 방법 (Controls Guide)

| 동작 | 조작 방법 | 설명 |
| :--- | :--- | :--- |
| **산불 발화** | `마우스 좌클릭` | 3D 지형의 임의 지점을 클릭하면 $100\text{ km}^2$ 광역 산맥 해당 위치에 즉시 산불이 점화됩니다. |
| **시점 회전** | `마우스 좌클릭 드래그` | 산악 지형을 중심으로 카메라를 360도 회전합니다. |
| **화면 이동 (Pan)** | `마우스 우클릭 드래그` | 카메라의 시점 위치를 평면 이동합니다. |
| **확대/축소 (Zoom)** | `마우스 휠 스크롤` | 지형을 확대하거나 축소하여 화선을 정밀 관찰합니다. |
| **일시정지 / 재생** | 하단 `재생/정지` 버튼 | 시뮬레이션 확산 연산을 멈추거나 재개합니다. |
| **속도 배속** | 하단 `1x ~ 60x` 버튼 | 1배속(실시간), 5x, 15x, 60x(1초당 1분 경과)로 가속 시뮬레이션합니다. |
| **기상 제어** | 우측 관제 독 `기상 제어` | 기온(-10~48℃), 습도(5~100%), 풍속(0~45m/s), 8방위 풍향 및 비화 토글을 조작합니다. |
| **대표 기상 프리셋** | 기상 제어 상단 버튼 | 양간지풍(28m/s), 겨울 한파(-6℃), 폭염 가뭄(42℃), 태풍급 강풍(42m/s) 원터치 설정. |
| **AI 위험 분석** | 우측 관제 독 `피해 분석` | 종합 위험 지수(0~100), 위험 등급, Recharts 실시간 피해 면적 및 화선 추이 차트 제공. |
| **시나리오 & DB** | 우측 관제 독 `시나리오·DB` | 4대 위기 시나리오 및 산림청(KFS) 100건 실측 기상 데이터 검색 및 원클릭 발화. |
| **카메라 프리셋** | 상단 우측 카메라 버튼 | 3D 궤도(Orbit), 조감도(Top-Down), 화선 전면 추적(Track Front) 시점으로 전환합니다. |
| **조명 모드** | 상단 우측 태양/달 아이콘 | 주간(Day), 황혼(Dusk), 심야(Night)로 환경 조명을 전환합니다. |
| **관제창 접기/숨기기** | 상단 우측 버튼 | 우측 독 접기 또는 전체 HUD를 숨겨 순수 3D 뷰포트로 전환합니다. |

---

## 🔬 핵심 수리 물리 알고리즘 개요

산불 전파 확률 $P_{spread}$는 미국의 산불 연구 표준인 **Rothermel 표면 화재 확산 모델**의 원리를 웹 환경의 세포 자동자에 맞게 경량화·정규화하여 계산됩니다.

$$P_{spread} = \min(0.98, \; R_{base} \times \Phi_{wind} \times \Phi_{slope})$$

1. **기본 가연물 및 건조도 계수 ($R_{base}$):**
   $$R_{base} = 0.15 \times \text{Fuel} \times \text{Dryness}(H) \times \text{TempFactor}(T)$$
2. **풍향·풍속 가속 계수 ($\Phi_{wind}$):**
   $$\Phi_{wind} = 1.0 + \left(\frac{W_{speed}}{4.5}\right)^{1.25} \times (\vec{W} \cdot \vec{D}) \times 2.8 \quad (\vec{W} \cdot \vec{D} > 0)$$
3. **지형 경사도 가속 계수 ($\Phi_{slope}$):**
   $$\Phi_{slope} = 1.0 + \min\left(4.2, \; 3.2 \cdot \left(\frac{\Delta h}{d}\right)^{1.1}\right) \quad (\Delta h > 0)$$

자세한 수식 유도 및 매개변수 설명은 [산불 시뮬레이션 모델 문서 (docs/SIMULATION_MODEL.md)](docs/SIMULATION_MODEL.md)를 참고하세요.

---

## 📚 추가 개발 문서 (Documentation)

* 🏛️ [시스템 아키텍처 (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md) : 렌더링 파이프라인, 프레임 루프, 상태 관리 및 최적화 기법
* 📐 [산불 수리 물리 모델 (docs/SIMULATION_MODEL.md)](docs/SIMULATION_MODEL.md) : 세포 자동자 규칙, Rothermel 공식, 비화 확률 모델
* 🧩 [API 및 모듈 레퍼런스 (docs/API_AND_MODULES.md)](docs/API_AND_MODULES.md) : 주요 클래스, 함수, 컴포넌트, TypeScript 타입 명세
* 🤝 [기여 가이드 (docs/CONTRIBUTING.md)](docs/CONTRIBUTING.md) : 코드 스타일, Git 브랜치 전략 및 커밋 규칙
* 🚢 [배포 가이드 (docs/DEPLOYMENT.md)](docs/DEPLOYMENT.md) : 정적 호스팅, Docker 컨테이너 및 Nginx 설정법

---

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 사용, 수정, 배포할 수 있습니다.
