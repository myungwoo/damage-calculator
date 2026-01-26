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
public/                # 정적 파일
```

## 개발 규칙

### 코드 스타일
- 들여쓰기: 탭
- 세미콜론: 생략
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
```
