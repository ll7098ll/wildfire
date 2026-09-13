# 🔬 산불 수리 물리 및 시뮬레이션 모델 (Wildfire Physical Simulation Model)

본 문서는 **산불 3D 시뮬레이터 (Wildfire 3D Simulation & Control System)**에 적용된 산불 발화, 확산, 지형·기상학적 상호작용 및 비화(Spotting) 메커니즘의 수학적 수식과 알고리즘을 상세히 설명합니다.

---

## 1. 개요 및 배경 이론

산림 화재는 지형 경사도, 풍향·풍속, 식생(가연물)의 밀도 및 함수율, 대기 온·습도 등 복잡한 비선형 환경 요인이 결합된 열화학적 연쇄 반응입니다.

본 시뮬레이터는 미국 산림청(USFS)의 **Rothermel 표면 화재 확산 모델(1972)**과 현대 산불 행동 예측 시스템(FARSITE, BehavePlus)의 경험적 확산 방정식을 **2차원 세포 자동자(2D Cellular Automata)** 격자 환경에 적합하도록 정규화 및 수치 최적화하여 구현하였습니다.

---

## 2. 격자 및 이웃 셀 공간 정의

시뮬레이터는 가로·세로 $10,000\text{m} \times 10,000\text{m}$ ($100\text{ km}^2$, 10,000 ha)의 실제 광역 산악 지형 영역을 $128 \times 128$개의 정사각형 셀(Cell)로 분할합니다.

* **그리드 크기 ($N$):** $128 \times 128 = 16,384\text{ cells}$
* **단일 셀 격자 간격 ($\Delta s$):**
  $$\Delta s = \frac{10,000\text{m}}{128 - 1} \approx 78.74\text{m}$$
* **단일 셀 면적 ($A_{cell}$):**
  $$A_{cell} = \Delta s^2 \approx 6,200\text{m}^2 \approx 0.62\text{ha}$$
* **전체 산악 지형 총면적:**
  $$A_{total} = 10\text{km} \times 10\text{km} = 100\text{ km}^2 = 10,000\text{ ha}$$

각 발화 셀은 **무어 이웃(Moore Neighborhood, 8방향)**에 위치한 미연소 이웃 셀로 화염 전파를 시도합니다:
* **직교 이웃 (상, 하, 좌, 우 4개):** 거리 $d = \Delta s \approx 78.74\text{m}$
* **대각 이웃 (대각선 4개):** 거리 $d = \sqrt{2} \cdot \Delta s \approx 111.35\text{m}$

---

## 3. 화재 확산 전파율 ($R$) 계산 수식

발화 셀 $(x_s, z_s)$에서 미연소 이웃 셀 $(x_t, z_t)$로의 기본 화재 전파율 $R$은 다음과 같이 3개 주요 물리 계수의 곱으로 결정됩니다:

$$R = \min\left(0.98, \; R_{base} \times \Phi_{wind} \times \Phi_{slope}\right)$$

### 3.1 기본 가연물 및 대기 건조도 계수 ($R_{base}$)

식생의 밀도($\text{Fuel} \in [0, 1]$), 상대 습도($H \in [5, 100]\%$), 대기 온도($T \in [-10, 48]^\circ\text{C}$)로부터 기본 발화 가능성을 산출합니다:

$$R_{base} = 0.15 \times \text{Fuel} \times \text{Dryness}(H) \times \text{TempFactor}(T)$$

* **건조도 계수 $\text{Dryness}(H)$:**
  $$\text{Dryness}(H) = \max\left(0.12, \; \frac{100 - 0.88 \cdot H}{100}\right)$$
  *(습도 5%의 극단적 건조 경보 시 약 0.956으로 폭발적 발화 유도, 습도 90% 이상 시 연소 억제)*
* **온도 계수 $\text{TempFactor}(T)$:**
  $$\text{TempFactor}(T) = \min\left(1.75, \; \max\left(0.40, \; \frac{T + 10}{36}\right)\right)$$
  *($-10^\circ\text{C}$ 영하 한파 시 최저 0.40으로 둔화, $40^\circ\text{C}$ 이상 폭염 시 1.4~1.75배 급증)*

---

### 3.2 지형 경사도 가속 계수 ($\Phi_{slope}$)

산불은 **오르막(Uphill) 방향으로 급격히 가속**됩니다. 화염의 고열 대류 기류가 위쪽 식생에 직접 닿아 미연소 연료를 사전에 가열(Convective Preheating)하기 때문입니다.

경사각의 탄젠트 값($\tan \theta$)은 두 셀 간 고도 차이($\Delta h = h_t - h_s$)와 수평 거리($d$)로 계산됩니다:

$$\tan \theta = \frac{h_t - h_s}{d}$$

1. **상향 확산 ($\tan \theta > 0$, 오르막):**
   $$\Phi_{slope} = 1.0 + \min\left(4.50, \; 3.20 \cdot (\tan \theta)^{1.10}\right)$$
   *(급경사 능선에서는 평지 대비 최대 5.5배까지 전파 속도가 가속됨)*

2. **하향 확산 ($\tan \theta \le 0$, 내리막):**
   $$\Phi_{slope} = \max\left(0.35, \; \frac{1.0}{1.0 + 1.80 \cdot |\tan \theta|}\right)$$
   *(내리막길에서는 대류열이 지표면 반대편으로 방출되어 전파 속도가 최대 65% 감속됨)*

---

### 3.3 풍향·풍속 벡터 효과 ($\Phi_{wind}$)

풍향 $\phi$ (방위각 도, 0°는 북쪽을 향해 부는 바람)와 풍속 $W_{speed}$ ($0 \sim 45\text{ m/s}$)로부터 2D 풍속 단위 벡터 $\vec{W}$를 정의합니다:

$$\vec{W} = \begin{pmatrix} \sin\left(\frac{\phi \cdot \pi}{180}\right) \\ -\cos\left(\frac{\phi \cdot \pi}{180}\right) \end{pmatrix}$$

발화 셀에서 목표 셀로 향하는 확산 방향 단위 벡터 $\vec{D}$를 다음과 같이 구합니다:

$$\vec{D} = \frac{1}{d} \begin{pmatrix} (x_t - x_s) \cdot \Delta s \\ (z_t - z_s) \cdot \Delta s \end{pmatrix}$$

두 벡터의 내적(Dot Product)을 통해 풍향과 화선 전파 방향의 정렬도 $\cos \alpha$를 구합니다:

$$\cos \alpha = \vec{W} \cdot \vec{D} \quad (-1.0 \le \cos \alpha \le 1.0)$$

1. **순풍 ($\cos \alpha > 0$, 바람 부는 방향으로 확산):**
   $$\Phi_{wind} = 1.0 + \left(\frac{W_{speed}}{4.5}\right)^{1.25} \times (\cos \alpha) \times 2.80$$
   *(영동 양간지풍 $25\sim 35\text{m/s}$ 하에서 순풍 방향 화선은 평시 대비 20배 이상 맹렬히 추진)*

2. **역풍 ($\cos \alpha \le 0$, 바람을 거슬러 확산):**
   $$\Phi_{wind} = \max\left(0.18, \; \frac{1.0}{1.0 + \left(\frac{W_{speed}}{7.0}\right) \cdot |\cos \alpha|}\right)$$
   *(역풍이어도 복사열로 인해 미약한 역방향 확산은 지속되며 하한값 0.18 유지)*

---

## 4. 시간 이산화 및 확률적 점화 (Poisson Process)

각 프레임에서 경과 시간 $\Delta t$ (초) 동안 이웃 셀이 점화될 확률 $P_{ignition}$은 포아송 과정의 지수 감쇠 확률로 계산됩니다:

$$P_{ignition} = 1.0 - \exp\left(-R \times \Delta t \times 4.80\right)$$

* 난수 $u \sim U(0, 1)$가 $u < P_{ignition}$을 만족할 때 해당 셀의 상태가 `CellStatus.BURNING`으로 전환됩니다.
* 이 방식을 통해 1배속부터 60배속 가속 시에도 시간 적분의 물리적 보존성과 수치 안정성을 유지합니다.

---

## 5. 비화 (Spotting Fire, 원거리 불씨 도약) 모델

강풍($W_{speed} > 8\text{m/s}$)과 활성 화선이 결합하면 수관화(Crown Fire)에서 타오르는 불씨가 대기 중으로 솟구쳐 풍하측 원거리로 날아가는 **비화 현상**이 발생합니다.

* **비화 발생 확률 (초당):**
  $$P_{spot} = 0.012 \times \Delta t \times \left(\frac{W_{speed}}{10.0}\right)$$
* **도약 거리 ($D_{spot}$, 셀 단위 및 실거리 m):**
  $$D_{spot} = 3 + \left\lfloor \text{random}() \times (W_{speed} \times 0.45) \right\rfloor \text{ cells}$$
  * $100\text{ km}^2$ 광역 지형 기준, $30\text{m/s}$ 급 양간지풍 시 $3 \sim 18$개 셀, 즉 **약 $240\text{m} \sim 1,420\text{m}$ (1.4km 이상)** 전방 산맥으로 불씨가 도약 발화합니다.
* **착탄 좌표 계산:**
  $$x_{spot} = x_s + \text{round}\left(W_x \cdot D_{spot} + \epsilon_x\right)$$
  $$z_{spot} = z_s + \text{round}\left(W_z \cdot D_{spot} + \epsilon_z\right)$$
  *(여기서 $\epsilon_x, \epsilon_z \sim [-1, 1]$은 난류 분산 오차)*

---

## 6. 셀 연소 수명 주기 및 온도 곡선

각 셀은 다음과 같은 4단계 유한 상태 머신(FSM)을 따릅니다:

```text
[UNBURNED]  ──(점화 조건 만족)──▶  [IGNITING / BURNING]  ──(연료 소진)──▶  [BURNED]
(초기 식생)                         (화염 분출 & 열 방출)                   (재 & 탄화목)
```

1. **연소 진행도 누적:**
   $$\Delta \text{Progress} = (0.055 + W_{speed} \times 0.0018) \times \Delta t$$
2. **연소 온도 곡선 ($T_{flame} \in [0, 1]$):**
   $$T_{flame} = \sin\left(\min(1.0, \; \text{Progress})^{0.75} \times \pi\right) \times 0.85 + 0.15$$
3. **완전 소진:**
   * $\text{Progress} \ge 1.0$ 도달 시 `CellStatus.BURNED`, 가연물 $\text{Fuel} = 0$, $T = 0$으로 전환되어 영구적으로 비활성화됩니다.

---

## 7. AI 다변수 산불 위험도 예측 모델 (Predictive Risk Scoring)

`src/simulation/wildfireRiskModel.ts`에 내장된 위험도 산출 함수는 기상 인자 $T, H, W$를 가중 결합하여 정규화된 위험 지수 $S_{risk} \in [0, 100]$을 산출합니다:

$$S_{risk} = 100 \times \left(0.40 \cdot f_W(W_{speed}) + 0.35 \cdot f_H(H) + 0.25 \cdot f_T(T)\right)$$

* **풍속 기여도 $f_W$:** $f_W = \min\left(1.0, \; \left(\frac{W_{speed}}{35}\right)^{1.2}\right)$
* **습도 기여도 $f_H$:** $f_H = \max\left(0.0, \; \frac{100 - H}{95}\right)$
* **온도 기여도 $f_T$:** $f_T = \min\left(1.0, \; \max\left(0.0, \; \frac{T + 10}{58}\right)\right)$

### 위험 등급 분류
* **낮음 (Low):** $S_{risk} < 25$
* **보통 (Moderate):** $25 \le S_{risk} < 50$
* **높음 (High):** $50 \le S_{risk} < 75$
* **매우 높음 (Extreme):** $S_{risk} \ge 75$

---

## 8. 거시적 관제 지표 (HUD Metrics) 산출 공식

| 지표 | 계산 공식 | 단위 |
| :--- | :--- | :--- |
| **소실 피해 면적 (ha)** | $\text{Burned Area}_{ha} = N_{burned} \times A_{cell} \times \frac{1}{10,000}$ | $\text{ha}$ (헥타르) |
| **소실 피해 면적 ($\text{km}^2$)** | $\text{Burned Area}_{km^2} = \text{Burned Area}_{ha} / 100$ | $\text{km}^2$ |
| **산림 소실률 (Loss Rate)** | $\text{Loss Rate} = \frac{N_{burned}}{N_{total\_forest}} \times 100$ | $\%$ |
| **화선 전파 속도 (Spread Rate)** | $V = \overline{\Delta N_{ignited}} \times \Delta s \times 6.5$ | $\text{m/min}$ |
| **화선 중심 좌표 (Front Center)** | $\vec{C}_{front} = \frac{1}{M} \sum_{i=1}^{M} \vec{P}_i$ | 월드 좌표 $(X, Y, Z)$ |
