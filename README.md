![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

# 🗡️ 메이플랜드 데미지 계산기

메이플랜드 나이트로드(표창)용 데미지 · 방컷 확률 계산기.

## ✨ 특징

- 📊 **정확한 방컷 확률** — 근사나 시뮬레이션이 아니라 FFT 컨볼루션으로 확률분포를 직접 계산한다
- ☠️ **베놈 도트 데미지 반영** — 중첩 규칙과 1초 틱까지 원작 유출 코드 기준으로 모델링했다
- 🐌 **몬스터 프리셋 273종** — 원작 Mob.wz 기준 독 속성 · 보스 여부 포함
- 🌗 다크 / 라이트 모드
- 💾 저장 슬롯 3개 (localStorage)

## 🚀 시작하기

```bash
npm install
npm run dev      # http://localhost:3000
```

## 📜 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (포트 3000) |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 |
| `npm run lint:fix` | ESLint 자동 수정 |
| `npm test` | 유닛 테스트 |

테스트는 별도 러너 없이 Node 내장 테스트 러너로 돌아간다.
방컷 확률은 배포 코드와 독립적으로 작성한 참조 DP · 몬테카를로와 대조해 검증한다.

## ☠️ 베놈에 대해

베놈은 데미지 라인이 아니라 몬스터 HP를 직접 깎는 스킬이라 계산 방식이 다르다.

- 몹 방어력 · 크리티컬 · 스킬 데미지%의 영향을 **받지 않는다**
- 타격마다 발동 판정을 굴리므로 **쉐도우 파트너가 발동 기회를 2배로** 만든다
- 이 데미지만으로는 몬스터를 **잡을 수 없다** (HP 1에서 멈춘다)
- 틱 1회 데미지는 **30000에서 잘린다** (메이플랜드 고유 사양, 원작에는 없는 제한)
- 보스 · 독 무효 · 독 반감 몬스터에는 걸리지 않는다
- 1초마다 틱이 들어가서 같은 방수라도 공격 속도에 따라 결과가 달라진다.
  베놈을 켜면 **분당 공격 횟수** 입력이 나타난다 (트리플 스로우 기준 100회/분)

일부 세부 동작(첫 틱 위상, 총 틱 수)은 실측이 어려워 가정을 두고 계산한다.
자세한 근거와 가정은 `CLAUDE.md`에 정리했다.

## ⚠️ 호환성

몬스터 프리셋의 `id`를 원작 Mob.wz 몹 ID로 바꿨다.
저장 데이터에는 몬스터 id가 아니라 수치가 들어가므로 기존 저장 슬롯은 그대로 열린다.
베놈 관련 항목만 저장 데이터에 없어서 기본값(사용 안 함)으로 채워진다.
