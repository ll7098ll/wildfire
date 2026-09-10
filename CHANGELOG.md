# 📋 변경 이력 (Changelog)

본 프로젝트는 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/) 형식을 따르며, [Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

---

## [1.0.0] - 2026-09-10

### 🚀 최초 릴리즈 (Initial Release)

#### 3D 렌더링 및 비주얼 (3D Graphics & Visuals)
* **절차적 3D 산악 지형:** 2D Gradient Noise, FBM, Ridged Multifractal Noise 및 도메인 왜곡(Domain Warping)을 통해 백두대간 양식의 산맥, 220m 고도차의 7대 주봉 및 협곡 구현.
* **16,000+ 대규모 수목 인스턴싱:** `THREE.InstancedMesh` 최적화를 통해 드로우 콜 1회로 고밀도 침엽수 및 소나무 산림 렌더링.
* **식생 연소 및 탄화 이펙트:** 화선 접근 시 수목의 크기 축소 및 갈색/검정 탄화목 색상 전이.
* **다층 Three.js 파티클 시스템:**
  * 십자 쿼드(Crossed-Quad) 3D 입체 화염 기둥 (500개)
  * 볼륨 불꽃 파티클 (4,200개)
  * 풍향에 반응하는 대기 연기 파티클 (4,800개)
  * 공중으로 솟구치는 비산 불씨(Embers, 1,600개)
* **동적 조명 및 대기 효과:** ACESFilmicToneMapping, PCF 그림자 맵, 화선 중심을 추적하는 실시간 포인트 라이트 3기 및 낮(Day)/황혼(Dusk)/밤(Night) 일조 모드.

#### 물리 시뮬레이션 엔진 (Physics Simulation Engine)
* **Rothermel 기반 세포 자동자 (128×128 그리드):** $1,000\text{m} \times 1,000\text{m}$ 구역의 16,384개 격자 셀 상태 전이 연산.
* **지형 경사도 대류 예열 가속 (Slope Factor):** 오르막 방향 화선 지수 가속 및 내리막 방향 감속 모델링.
* **풍향·풍속 벡터 내적 추진 (Wind Factor):** 풍향 방위각과 화재 전파 벡터의 내적을 통한 순풍 추진 및 역풍 저항.
* **기상 환경 가연물 건조도:** 상대 습도(10~90%) 및 기온(15~42℃) 연동 함수율 계산.
* **비화(Spotting Fire) 확률 모델:** 강풍 조건 시 불씨가 공중으로 도약하여 전방 풍하측 식생에 비산 발화하는 현상 재현.

#### 관제 대시보드 및 인터랙션 (HUD & Controls)
* **실시간 화재 메트릭스 HUD:** 활성 화선 수, 소실 피해 면적(ha), 화선 전파 속도(m/min), 산림 소실률(%), 경과 시간 실시간 표시.
* **인터랙티브 클릭 발화:** Three.js 레이캐스팅(Raycasting) 기반 마우스 클릭 즉시 발화 및 호버 조준선 펄스 UI.
* **카메라 프리셋:** 자유 궤도(Orbit), 화선 전면(Track Front), 위성(Top-Down) 시점 전환.
* **4가지 사전 정의 시나리오:**
  * 💨 골짜기 강풍 확산 시나리오
  * ⛰️ 능선 급상승 산불 시나리오
  * 🔥 비화(불씨 도약) 산불 시나리오
  * ⚡ 낙뢰 3대 연봉 동시 발화 시나리오

#### 개발 문서 (Documentation)
* `README.md`: 프로젝트 개요, 주요 특징, 기술 스택, 빠른 시작 및 조작 안내.
* `docs/ARCHITECTURE.md`: 시스템 아키텍처, 렌더 루프 분리, 메모리 및 GC 최적화.
* `docs/SIMULATION_MODEL.md`: Rothermel 수식 유도, 경사도/풍속/건조도/비화 물리 모델.
* `docs/API_AND_MODULES.md`: 전역 타입, 클래스, 모듈 및 UI 컴포넌트 레퍼런스.
* `docs/CONTRIBUTING.md`: 오픈소스 기여 가이드, 커밋 컨벤션, PR 규칙.
* `docs/DEPLOYMENT.md`: 프로덕션 빌드, GitHub Pages, Vercel, Docker(Nginx) 배포 가이드.
