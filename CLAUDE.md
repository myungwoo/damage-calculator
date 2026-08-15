# Mapleland Damage Calculator

메이플랜드 데미지 계산기 웹 애플리케이션

## 기술 스택

- **프론트엔드**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI 라이브러리**: @headlessui/react, lucide-react
- **개발 도구**: ESLint, Prettier

## 프로젝트 구조

```
app/
  components/          # React 컴포넌트
    DamageCalculator.tsx   # 메인 계산기 컴포넌트
    MonsterDropdown.tsx    # 몬스터 선택 드롭다운
    NumberInput.tsx        # 숫자 입력 컴포넌트
    ThemeToggle.tsx        # 다크/라이트 모드 토글
  data/                # 정적 데이터
    monsterPresets.ts      # 몬스터 프리셋 데이터
    skillEffects.ts        # 스킬 효과 데이터
    weapons.ts             # 무기 데이터
  hooks/               # React 훅
    useCalculatorState.ts  # 계산기 상태 관리
  types/               # TypeScript 타입 정의
    calculator.ts
  utils/               # 유틸리티 함수
    calculatorUtils.ts     # 계산기 헬퍼 함수
    damageCalculator.ts    # 데미지 계산 로직
    fft.ts                 # FFT 알고리즘
  constants/           # 상수 정의
    calculator.ts
  page.tsx             # 메인 페이지
  layout.tsx           # 레이아웃
  globals.css          # 전역 스타일
tests/                 # 유닛 테스트 (node --test)
  helpers/
    reference.ts           # 방컷 확률 참조 구현 (O(n^2) DP, 몬테카를로)
  damageCalculator.test.ts
  fft.test.ts
public/                # 정적 파일
```

## 방컷 확률 계산

`damageCalculator.ts`의 `calculateKillProbabilitiesWithinNHits`가 핵심이다.
"누적 데미지 -> 확률" 배열을 만들고 몬스터 HP를 흡수 상태로 둔 뒤,
스킬 1회 분포를 FFT로 반복 컨볼루션해 `dist[HP]`(= N방 안에 죽을 누적 확률)를 읽는다.

계산에 반영한 게임 스펙:
- 다단히트(럭키 세븐 2타, 트리플 스로우 3타)의 명중 판정은 타격별로 독립
- 쉐도우 파트너는 본체 데미지 확정 후 그 고정 비율(만렙 50%, 내림)을 그대로 따라간다
  (크리티컬 여부도 본체를 따르므로 따로 굴리지 않는다)
- 럭키 세븐과 트리플 스로우는 표창 숙련도를 무시하고 LUK만으로 데미지가 정해진다
- 크리티컬 데미지는 합연산이지만, 샤프 아이즈만 "크리티컬 데미지 40% 증가"가
  +40%p가 아니라 +140%p로 적용된다

HP가 `MAX_HP_RESOLUTION`(16383)을 넘으면 HP와 데미지를 같은 비율로 축소해 계산한다.
이 값은 FFT 길이가 32768을 넘지 않는 최대치이며, 축소로 생기는 오차는 실측 0.1%p 이하다.
표시용 데미지 범위는 반드시 내림한 정수 데미지에서 유도해 확률 계산과 어긋나지 않게 한다.

## 개발 규칙

### 코드 스타일
`eslint.config.mjs`의 prettier 설정을 따른다.
- 들여쓰기: 스페이스 2칸
- 세미콜론: 사용
- 따옴표: 작은따옴표
- 주석: 한국어로 작성

### 문서 유지보수
- 코드 수정 시 CLAUDE.md도 함께 업데이트하여 최신 상태 유지
- 새로운 파일/모듈 추가 시 프로젝트 구조에 반영
- 새로운 명령어 추가 시 주요 명령어에 반영
- 변경 사항이 README.md에 영향이 있는 경우 함께 수정

### README.md 기조
- 인간 개발자를 위한 실용적인 내용
- 맨 위에 배지 배치
- 적절한 이모지 사용
- 기술적 세부사항은 CLAUDE.md에, 운영 가이드는 README.md에

### 커밋 메시지 형식
```
Type: 설명

(필요시 상세 설명)

Co-Authored By는 포함하지 마세요.
```

**Type 종류**: Fix, Feat, Refactor, Docs, Chore

### 예시
```
Fix: 크리티컬 데미지 계산 오류 수정
Feat: 몬스터 프리셋 선택 기능 추가
Refactor: 데미지 계산 로직 분리
```

## 주요 명령어

```bash
npm run dev      # 개발 서버 실행 (포트 3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
npm run lint:fix # ESLint 자동 수정
npm test         # 유닛 테스트 (tsconfig.test.json으로 컴파일 후 node --test)
```

테스트는 별도 러너 의존성 없이 `tsc -p tsconfig.test.json`으로 `.test-build`에 컴파일한 뒤
Node 내장 테스트 러너로 실행한다. 방컷 확률은 배포 코드와 독립적으로 작성한
참조 DP, 몬테카를로 시뮬레이션과 대조해 검증한다.
