# 🤝 기여 가이드 (Contributing Guide)

**산불 3D 시뮬레이터 (Wildfire 3D Simulation)** 프로젝트에 관심을 가져주셔서 감사합니다!  
본 프로젝트는 오픈소스 커뮤니티의 기여를 적극 환영하며, 본 문서는 원활한 협업을 위한 개발 환경 설정, 커밋 컨벤션 및 PR 절차를 안내합니다.

---

## 1. 개발 환경 준비

### 필수 도구
* **Node.js**: v18.0.0 이상
* **npm** (또는 bun / pnpm)
* **Git**

### 저장소 포크 및 복제

```bash
# 1. 개인 GitHub 계정으로 저장소를 Fork한 후 로컬에 Clone합니다.
git clone https://github.com/your-username/wildfire-3d-simulation.git
cd wildfire-3d-simulation

# 2. 업스트림 원격 저장소 추가
git remote add upstream https://github.com/original-owner/wildfire-3d-simulation.git

# 3. 의존성 설치
npm install

# 4. 로컬 개발 서버 구동 (기본 포트 3000)
npm run dev
```

---

## 2. 브랜치 전략 (Branching Strategy)

모든 작업은 `main` 브랜치가 아닌 작업 목적에 맞는 별도 브랜치에서 진행해 주시기 바랍니다.

* `feature/기능이름`: 새로운 기능 구현 (예: `feature/water-bomb-aircraft`)
* `fix/버그이름`: 버그 수정 (예: `fix/raycaster-offset-bug`)
* `docs/문서이름`: 문서 작성 및 보완 (예: `docs/rothermel-equation-update`)
* `perf/최적화이름`: 렌더링 또는 시뮬레이션 성능 개선 (예: `perf/particle-buffer-pooling`)

```bash
# 새 작업 브랜치 생성 및 이동
git checkout -b feature/awesome-feature
```

---

## 3. 커밋 메시지 컨벤션 (Commit Convention)

본 프로젝트는 **[Conventional Commits](https://www.conventionalcommits.org/)** 규칙을 준수합니다.

### 형식
```text
<타입>(<범위>): <제목>

[본문 (선택 사항)]

[꼬리말 (이슈 번호 등, 선택 사항)]
```

### 타입(Type) 정의
| 타입 | 설명 |
| :--- | :--- |
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 및 결함 수정 |
| `docs` | 문서 추가, 수정, 보완 |
| `style` | 코드 포맷팅, 세미콜론 누락 수정 등 (코드 동작 변경 없음) |
| `refactor`| 코드 리팩토링 (기능 추가나 버그 수정이 아닌 코드 개선) |
| `perf` | 렌더링 속도 또는 메모리 성능 개선 |
| `test` | 테스트 코드 추가 또는 수정 |
| `chore` | 빌드 스크립트, 패키지 의존성 설정 변경 |

### 예시
```text
feat(simulation): 소방 헬기 진화수 투하 알고리즘 추가
fix(three): 창 크기 조절 시 카메라 비율 왜곡 문제 해결
perf(terrain): 수목 인스턴스 행렬 갱신 로직 메모리 최적화
docs(readme): 설치 및 실행 가이드 최신화
```

---

## 4. 코딩 스타일 및 품질 가이드라인

1. **TypeScript 정적 타입 준수:**
   * `any` 타입 사용을 지양하고, 명시적인 인터페이스나 타입을 선언합니다.
   * `src/types.ts`에 정의된 기존 공통 타입을 최대한 활용합니다.

2. **Three.js 렌더 루프 내 메모리 할당 금지 (Zero-Allocation Loop):**
   * `animate()` 또는 `update()` 함수 내부에서 `new THREE.Vector3()`, `new THREE.Matrix4()` 등 객체를 반복 생성하지 마십시오.
   * 클래스 멤버 변수로 재사용할 객체(`dummyMatrix`, `tempColor`)를 사전에 선언해 사용합니다.

3. **React 가상 DOM 격리:**
   * 초당 60회 실행되는 Three.js 애니메이션 프레임마다 React `useState`를 직접 호출하지 마십시오. 반드시 쓰로틀링(Throttling)을 적용해야 합니다.

4. **검증 스크립트 실행:**
   * PR 제출 전 반드시 린트 및 빌드 검증을 통과해야 합니다.
   ```bash
   # 타입 체크 및 문법 검증
   npm run lint

   # 프로덕션 빌드 성공 여부 확인
   npm run build
   ```

---

## 5. 풀 리퀘스트 (Pull Request) 절차

1. 최신 `upstream/main`의 변경 사항을 로컬 브랜치에 rebase합니다.
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. 작업 브랜치를 개인 원격 저장소에 Push합니다.
   ```bash
   git push origin feature/awesome-feature
   ```
3. GitHub 저장소에서 PR을 오픈합니다.
   * 작업한 내용의 요약과 변경 이유를 명확히 작성합니다.
   * UI 변경 사항이 있는 경우 스크린샷이나 화면 녹화(GIF)를 첨부합니다.
4. 리뷰어의 피드백을 반영하여 브랜치를 업데이트합니다.

프로젝트에 기여해 주시는 모든 분들께 진심으로 감사드립니다!
