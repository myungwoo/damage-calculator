import {
  Monster,
  Stats,
  Equipment,
  Skills,
  DamageResult,
  isLucky7Effect,
  isAvengerEffect,
  isDrainEffect,
  isJavelinEffect,
  isCriticalThrowEffect,
  isShadowPartnerEffect,
  isSharpEyesEffect,
  isTripleThrowEffect,
  AttackSkillType,
} from '../types/calculator';
import { getSkillEffect } from '../data/skillEffects';
import { throwingStars } from '../data/weapons';
import {
  fftForward,
  fftConvolveWithSpectrum,
  nextPowerOfTwo,
  Spectrum,
} from './fft';
import {
  VenomConfig,
  calculateVenomSurvivals,
  calculateVenomTickDamage,
} from './venom';
import {
  DEFAULT_ATTACKS_PER_MINUTE,
  POISON_BLOCKING_ATTRIBUTES,
  VENOM_EXCLUDED_SKILLS,
} from '../data/venom';

/**
 * 방컷 확률 계산에 쓰는 몬스터 HP 해상도 상한.
 * 이보다 HP가 크면 HP와 데미지를 같은 비율로 축소해 계산한다.
 *
 * 16383으로 잡으면 컨볼루션 결과 길이가 32767이라 FFT 길이가 32768로 떨어진다.
 * 16384부터는 FFT 길이가 65536으로 두 배가 되어 계산량도 두 배가 되므로,
 * 정확도 손실 없이 쓸 수 있는 가장 큰 값이다.
 */
export const MAX_HP_RESOLUTION = 16383;

/**
 * 데미지 라인 하나가 가질 수 있는 값의 범위.
 *
 * 원작은 타격마다 마지막에 `damage = max(1.0, min(99999.0, damage))`로 자른 뒤
 * 정수로 절삭한다. 상한만 메이플랜드에서 199999로 올라갔다.
 *
 * 하한은 쉐도우 파트너 타격에도 똑같이 걸린다. 방어력에 눌려 본체 데미지가 음수가
 * 되는 조합에서도 0이 아니라 1이 들어간다.
 */
export const MIN_DAMAGE_PER_LINE = 1;
export const MAX_DAMAGE_PER_LINE = 199999;

/** 데미지 라인 하나를 원작과 같은 순서(클램프 -> 절삭)로 정수화한다. */
const toDamageLine = (damage: number): number =>
  Math.floor(
    Math.max(MIN_DAMAGE_PER_LINE, Math.min(MAX_DAMAGE_PER_LINE, damage))
  );

/**
 * 방컷 확률 계산에 넘기는 데미지 라인 정보.
 *
 * min / max는 **스킬 데미지% 적용 전, 방어력 감산 후** 실수 지지구간이다.
 * defenseBand는 그 안에서 방어력 난수가 차지하는 폭이고, 나머지가 스탯 롤 몫이다.
 *
 * 라인 값은 아래 식으로 만들어진다. 배율을 생략하면 `trunc(d)`가 되므로
 * min / max를 그냥 최종 데미지 범위로 줘도 된다.
 */
export interface DamageRangeInput {
  min: number;
  max: number;
  defenseBand?: number;
  /** 스킬 데미지 배율. 트리플 스로우 30이면 1.5 */
  skillMultiplier?: number;
  /** 크리티컬 가산 배율 `(critParam - 100) / 100`. 일반 라인은 0 */
  criticalAdd?: number;
}

/**
 * 라인 데미지 한 값.
 *
 *   damage = trunc(스킬배율 * d + 크리가산 * trunc(d))
 *
 * 원작은 크리티컬 가산항을 **스킬% 적용 전 값을 정수화한 뒤** 곱한다
 * (`damage += (critParam - 100) * 0.01 * (int)highDamage`).
 * 그래서 크리티컬 라인은 d에 대해 매끈한 직선이 아니라 계단이고,
 * 가산 배율만큼 폭이 벌어져 **닿지 않는 정수 데미지가 생긴다.**
 *
 * d에 대해 단조 증가하는 것은 그대로라 난수 순환의 구간 자르기는 그대로 쓸 수 있다.
 */
export const damageLineValue = (
  base: number,
  skillMultiplier: number,
  criticalAdd: number
): number =>
  Math.trunc(skillMultiplier * base + criticalAdd * Math.trunc(base));

/**
 * 폭 alpha와 beta인 독립 균등분포 두 개의 합에 대한 CDF.
 *
 * 원작 라인 데미지는 `스탯롤 - 방어롤`이라 균등분포 둘의 차이고,
 * 부호만 뒤집으면 합과 같은 사다리꼴이 된다.
 * 반환하는 함수는 지지구간 시작점을 0으로 옮긴 좌표에서 P(Z < z)를 준다.
 *
 * 둘 중 하나가 0이면 사다리꼴이 삼각형이 아니라 직사각형(= 균등)으로 무너진다.
 */
export const trapezoidCdf = (
  alpha: number,
  beta: number
): ((z: number) => number) => {
  const total = alpha + beta;
  if (total <= 0) return (z) => (z > 0 ? 1 : 0);

  const narrow = Math.min(alpha, beta);
  const wide = Math.max(alpha, beta);
  const twiceArea = 2 * alpha * beta;

  return (z) => {
    if (z <= 0) return 0;
    if (z >= total) return 1;
    // 올라가는 구간
    if (narrow > 0 && z < narrow) return (z * z) / twiceArea;
    // 평평한 구간
    if (z <= wide) return (z - narrow / 2) / wide;
    // 내려가는 구간
    const remaining = total - z;
    return 1 - (remaining * remaining) / twiceArea;
  };
};

/** 스킬 1회당 본체 타격 수 (럭키 세븐 2, 트리플 스로우 3, 그 외 1) */
export const getHitCount = (skillType: AttackSkillType): number =>
  skillType === 'tripleThrow' ? 3 : skillType === 'lucky7' ? 2 : 1;

export const calculateTotalStats = (
  stats: Stats
): { totalStr: number; totalDex: number; totalLuk: number } => {
  return {
    totalStr: stats.str + stats.additionalStr,
    totalDex: stats.dex + stats.additionalDex,
    totalLuk: stats.luk + stats.additionalLuk,
  };
};

export const calculateTotalAttack = (equipment: Equipment): number => {
  const selectedStar = throwingStars.find(
    (star) => star.id === equipment.selectedWeaponId
  );
  if (!selectedStar) {
    throw new Error('Invalid throwing star selected');
  }
  return (
    equipment.weaponAttack +
    selectedStar.attack +
    equipment.gloveAttack +
    equipment.otherAttack +
    equipment.buff
  );
};

export const calculatePureLuk = (
  level: number,
  str: number,
  dex: number
): number => {
  const totalPureStats =
    20 + level * 5 + (level >= 70 ? 5 : 0) + (level >= 120 ? 5 : 0);
  return Math.max(0, totalPureStats - str - dex - 4); // 4 = INT
};

export const calculateRequiredHitRatio = (
  monsterLevel: number,
  characterLevel: number,
  monsterAvoid: number
): number => {
  return (
    ((55 + Math.max(0, monsterLevel - characterLevel)) * monsterAvoid) / 15
  );
};

export const calculateHitProbability = (
  hitRatio: number | undefined,
  monsterLevel: number,
  characterLevel: number,
  monsterAvoid: number
): number => {
  const effectiveHitRatio = hitRatio ?? 999999;
  const requiredHitRatio = calculateRequiredHitRatio(
    monsterLevel,
    characterLevel,
    monsterAvoid
  );
  // 회피율이 0인 몬스터는 필요 명중률도 0이라 항상 명중한다.
  // (0으로 나누면 NaN이 확률 계산 전체로 번진다)
  if (requiredHitRatio <= 0) {
    return 1;
  }
  return Math.max(
    0,
    Math.min(1, (effectiveHitRatio * 2 - requiredHitRatio) / requiredHitRatio)
  );
};

/**
 * 회피 확률 하한 / 상한.
 *
 * 원작 `CalcDamage::CheckPDamageMiss`는 `nJob / 100 == 4`(도적)면 5~95%,
 * 그 밖의 직업은 2~80%로 자른다. 이 계산기는 나이트로드 전용이라 도적 값만 쓴다.
 * (직업군 번호는 같은 파일의 마법사 분기 `nJob / 100 == 2`와 `QWUser`의 AP 요구치
 * — 3·4가 LUK — 로 교차확인했다. 4는 해적이 아니라 도적이다.)
 */
export const AVOID_PROBABILITY_MIN = 0.05;
export const AVOID_PROBABILITY_MAX = 0.95;

/**
 * 몹 레벨 페널티까지 먹인 캐릭터 회피율.
 *
 * 원작은 회피율을 999에서 자르고, 몹 레벨이 캐릭터보다 높으면 그 차이만큼 깎는다.
 * 깎아서 0 이하가 되면 0으로 둔다. 페널티 폭이 물리는 레벨차의 절반(정수 나눗셈),
 * 마법은 레벨차 전부라 `levelPenaltyDivisor`로만 갈린다.
 */
const calculateEffectiveAvoid = (
  avoid: number,
  monsterLevel: number,
  characterLevel: number,
  levelPenaltyDivisor: number
): number => {
  const capped = Math.min(999, Math.max(0, Math.trunc(avoid)));
  if (characterLevel >= monsterLevel) {
    return capped;
  }
  const penalized =
    capped - Math.trunc((monsterLevel - characterLevel) / levelPenaltyDivisor);
  return penalized > 0 ? penalized : 0;
};

/**
 * 몬스터의 **물리 공격**(몸박 포함)을 캐릭터가 회피할 확률.
 *
 * 원작 `CalcDamage::CheckPDamageMiss`를 그대로 옮겼다.
 *
 * ```
 * calc = 유효회피율 / (몹명중률 * 4.5) * 100      // 퍼센트
 * 회피 = calc > U[0, 100)
 * ```
 *
 * 몹 명중률이 0이면 원작은 0으로 나눠 무한대가 되고 그대로 상한에 잘린다.
 * 즉 명중률 0인 몹도 100%가 아니라 상한만큼만 피한다.
 */
export const calculateAvoidProbability = (
  avoid: number | undefined,
  monsterLevel: number,
  characterLevel: number,
  monsterAccuracy: number
): number => {
  const effectiveAvoid = calculateEffectiveAvoid(
    avoid ?? 0,
    monsterLevel,
    characterLevel,
    2
  );
  const accuracy = Math.min(999, Math.max(0, Math.trunc(monsterAccuracy)));
  const rate =
    accuracy <= 0
      ? Number.POSITIVE_INFINITY
      : effectiveAvoid / (accuracy * 4.5);
  return Math.min(AVOID_PROBABILITY_MAX, Math.max(AVOID_PROBABILITY_MIN, rate));
};

/**
 * 몬스터의 **마법 공격**을 캐릭터가 회피할 확률.
 *
 * 원작 `CalcDamage::CheckMDamageMiss`는 물리와 구조가 아예 다르다.
 * 비율을 퍼센트로 바꿔 굴리는 대신 회피율 자체를 굴려서 몹 명중률과 비교하고,
 * 레벨 페널티도 절반이 아니라 전액이며 상·하한 클램프가 없다.
 *
 * ```
 * 회피 = U[0.1 * 유효회피율, 유효회피율] >= 몹명중률
 * ```
 */
export const calculateMagicAvoidProbability = (
  avoid: number | undefined,
  monsterLevel: number,
  characterLevel: number,
  monsterAccuracy: number
): number => {
  const effectiveAvoid = calculateEffectiveAvoid(
    avoid ?? 0,
    monsterLevel,
    characterLevel,
    1
  );
  const accuracy = Math.min(999, Math.max(0, Math.trunc(monsterAccuracy)));
  // 회피율이 0이면 굴린 값도 항상 0이라, 몹 명중률이 0일 때만 회피한다.
  if (effectiveAvoid <= 0) {
    return accuracy <= 0 ? 1 : 0;
  }
  if (accuracy <= effectiveAvoid * 0.1) {
    return 1;
  }
  if (accuracy >= effectiveAvoid) {
    return 0;
  }
  return (effectiveAvoid - accuracy) / (effectiveAvoid * 0.9);
};

/**
 * 페이크(쉐도우 쉬프터)까지 반영한 회피 확률.
 *
 * 회피 판정과 페이크 판정은 서로 다른 난수를 쓰고, **어느 쪽이든 단독으로 피해를
 * 0으로 만든다.** 그래서 어느 쪽을 먼저 굴리든 결과가 같다 —
 * `a + (1 - a) * p`와 `p + (1 - p) * a`가 모두 `1 - (1 - a) * (1 - p)`다.
 * 순서는 화면에 MISS가 뜨는지 분신이 뜨는지만 가른다.
 */
export const combineAvoidWithShadowShifter = (
  avoidProbability: number,
  shadowShifterProbability: number
): number => 1 - (1 - avoidProbability) * (1 - shadowShifterProbability);

/** 회피 확률 한 종류(물리 또는 마법)의 요약. */
export interface AvoidBreakdownEntry {
  /** 회피율만으로 계산한 확률 */
  base: number;
  /** 페이크까지 반영한 확률 */
  withShadowShifter: number;
  /** 회피율이 1 오를 때 `base`가 늘어나는 폭 */
  baseGainPerAvoid: number;
  /** 회피율이 1 오를 때 `withShadowShifter`가 늘어나는 폭 */
  shadowShifterGainPerAvoid: number;
}

export interface AvoidBreakdown {
  physical: AvoidBreakdownEntry;
  magic: AvoidBreakdownEntry;
}

/**
 * 물리 / 마법 회피 확률과 회피율 1당 증가폭을 한 번에 낸다.
 *
 * 증가폭은 미분이 아니라 **회피율을 실제로 1 올려 본 차이**다. 원작 공식이
 * 상·하한에서 잘리고 마법 쪽은 구간별로 꺾이기 때문에, 기울기를 그대로 쓰면
 * 상한에 걸린 구간에서 "올려도 안 오르는데 오른다"고 적히게 된다.
 *
 * `shadowShifterProbability`는 0~1이다. 페이크를 끄면 0을 넘긴다.
 */
export const calculateAvoidBreakdown = (
  avoid: number | undefined,
  monsterLevel: number,
  characterLevel: number,
  monsterAccuracy: number,
  shadowShifterProbability: number
): AvoidBreakdown => {
  const currentAvoid = avoid ?? 0;

  const summarize = (
    probability: (value: number) => number
  ): AvoidBreakdownEntry => {
    const base = probability(currentAvoid);
    const nextBase = probability(currentAvoid + 1);
    const withShadowShifter = combineAvoidWithShadowShifter(
      base,
      shadowShifterProbability
    );
    const nextWithShadowShifter = combineAvoidWithShadowShifter(
      nextBase,
      shadowShifterProbability
    );

    return {
      base,
      withShadowShifter,
      baseGainPerAvoid: nextBase - base,
      shadowShifterGainPerAvoid: nextWithShadowShifter - withShadowShifter,
    };
  };

  return {
    physical: summarize((value) =>
      calculateAvoidProbability(
        value,
        monsterLevel,
        characterLevel,
        monsterAccuracy
      )
    ),
    magic: summarize((value) =>
      calculateMagicAvoidProbability(
        value,
        monsterLevel,
        characterLevel,
        monsterAccuracy
      )
    ),
  };
};

const calculateStatAttack = (
  stats: Stats,
  totalAttack: number,
  masteryMultiplier: number
) => {
  const { totalLuk, totalDex, totalStr } = calculateTotalStats(stats);

  return {
    min:
      ((totalLuk * 3.6 * 0.9 * masteryMultiplier + totalDex + totalStr) *
        totalAttack) /
      100,
    max: ((totalLuk * 3.6 + totalDex + totalStr) * totalAttack) / 100,
  };
};

/**
 * 방어력 감산까지 끝낸, **스킬 데미지% 적용 전** 데미지 축.
 *
 * 원작은 이 값을 `highDamage`로 따로 들고 있다가 크리티컬 가산항에 쓴다.
 * 스킬%와 크리티컬을 여기서 곱해 버리면 그 구조를 표현할 수 없어서 축을 분리한다.
 */
const calculateBaseDamageRange = (
  statAttack: { min: number; max: number },
  stats: Stats,
  monster: Monster,
  skillType: AttackSkillType,
  totalAttack: number
): DamageRangeInput => {
  const levelDifference = Math.max(0, monster.level - stats.level);
  const levelMultiplier = 1 - 0.01 * levelDifference;

  const { totalLuk } = calculateTotalStats(stats);

  // 스킬별 데미지 계산
  let baseMax, baseMin;
  if (skillType === 'lucky7' || skillType === 'tripleThrow') {
    // 럭키 세븐과 트리플 스로우는 스탯 공격력(= 표창 숙련도, DEX, STR)의
    // 영향을 받지 않고 LUK만으로 데미지가 결정된다.
    // 따라서 최소/최대 비율이 자벨린 레벨과 무관하게 항상 1:2로 고정된다.
    baseMax = (totalLuk * 5 * totalAttack) / 100;
    baseMin = (totalLuk * 2.5 * totalAttack) / 100;
  } else {
    // 어벤져와 드레인은 스탯 공격력의 영향을 받음
    baseMax = statAttack.max;
    baseMin = statAttack.min;
  }

  return {
    min: baseMin * levelMultiplier - monster.physicalDefense * 0.6,
    max: baseMax * levelMultiplier - monster.physicalDefense * 0.5,
    // 원작은 U[PDD*0.5, PDD*0.6]을 스탯 롤과 독립으로 뺀다.
    // 그 난수 폭이 데미지 분포를 균등이 아니라 사다리꼴로 만든다.
    defenseBand: monster.physicalDefense * 0.1,
  };
};

/**
 * N방 안에 몬스터를 잡을 확률을 구한다.
 *
 * "누적 데미지 -> 확률" 배열을 만들고, 몬스터 HP 이상인 누적 데미지를 전부
 * 인덱스 monsterHp(= 사망)로 몰아넣어 흡수 상태로 둔다. 이 분포를 스킬 시전
 * 횟수만큼 컨볼루션하면 dist[monsterHp]가 곧 "N방 안에 죽을 누적 확률"이 된다.
 *
 * 베놈을 켜면 여기에 누적 베놈 데미지 W가 더해진다. 베놈은 몬스터를 죽이지
 * 못하고 HP를 1에서 멈추게 하므로, 실제 사망 조건은
 *   "누적 공격 데미지 + 누적 베놈 데미지 >= HP" 이면서
 *   "HP를 넘긴 시점의 공격이 데미지를 1 이상 넣었을 것"
 * 이 된다. 뒤 조건은 명중률 100%면 항상 참이라 앞 조건만 보면 되고,
 * 명중률이 낮을 때의 오차는 (1 - 명중률)^타격수로 묶인다.
 *
 * 베놈이 굴리는 난수는 공격 데미지 난수와 완전히 독립이라, 누적 베놈 데미지의
 * 생존함수만 따로 구해 두면 공격 쪽 FFT 파이프라인은 그대로 두고 마지막에
 * 내적 한 번으로 합류시킬 수 있다.
 */
export const calculateKillProbabilitiesWithinNHits = (
  skillType: AttackSkillType,
  /** 클램프 전 실수 데미지 범위. [1, 199999] 클램프는 여기서 건다. */
  basicDamage: DamageRangeInput,
  criticalDamage: DamageRangeInput,
  shadowMultiplier: number,
  criticalChance: number,
  monsterHp: number,
  stats: Stats,
  monster: Monster,
  maxHits: number = 20,
  venomConfig: VenomConfig | null = null,
  rngCycling: boolean = false
) => {
  // 명중률 계산
  const hitProb = calculateHitProbability(
    stats.hitRatio,
    monster.level,
    stats.level,
    monster.avoid
  );

  // 몬스터의 체력이 너무 큰 경우 MAX_HP_RESOLUTION으로 변경
  // 비율에 맞춰서 데미지도 변경
  // 실수 부분 반올림에 따른 오차는 감안해야 함 (실측 최대 0.06%p)
  let damageScale = 1;
  if (monsterHp > MAX_HP_RESOLUTION) {
    damageScale = MAX_HP_RESOLUTION / monsterHp;
    monsterHp = MAX_HP_RESOLUTION;
  }

  /**
   * 데미지 난수(스탯 롤) 폭. 방어력 난수 폭을 뺀 나머지가 스탯 롤 몫이다.
   *
   *   라인 데미지 = trunc(clamp(1, 199999, 스탯롤 - 방어롤))
   *   스탯롤 ~ U 폭 alpha,  방어롤 ~ U 폭 beta,  둘은 독립
   *   -> 합쳐진 분포는 균등이 아니라 사다리꼴이고, 지지구간이 [min, max]다.
   */
  const statSpan = (raw: DamageRangeInput) =>
    Math.max(0, raw.max - raw.min - Math.max(0, raw.defenseBand ?? 0));

  // 베놈은 축소 후 HP 축 위에서 계산해야 공격 데미지와 눈금이 맞는다.
  const venomSurvivals = venomConfig
    ? calculateVenomSurvivals(venomConfig, monsterHp, damageScale, maxHits)
    : null;

  const size = monsterHp + 1;
  // 컨볼루션 결과 길이(2 * size - 1)를 담을 수 있는 FFT 길이.
  // 모든 컨볼루션이 같은 길이를 쓰므로 스펙트럼을 재사용할 수 있다.
  const fftSize = nextPowerOfTwo(2 * size - 1);

  //------------------ 내부 함수들 -------------------
  /**
   * "데미지 분포"(누적 데미지 -> 확률)에 미리 변환해 둔 스킬 1회 분포의
   * 스펙트럼을 합성(컨볼루션)해 "합산 데미지 분포"를 구한다.
   * 예: distA 와 distB를 합치면,
   *  모든 a, b 에 대해 damage = a+b, prob = distA[a]*distB[b]
   *  을 모든 (a,b)에 대해 더한 값
   *
   * monsterHp를 넘는 누적 데미지는 전부 인덱스 monsterHp(= 사망)로 몰아넣어
   * 흡수 상태로 만든다. 데미지는 줄어들지 않으므로 중간에 몰아넣든
   * 마지막에 몰아넣든 결과는 같다.
   */
  const convolveDistFFT = (
    dist: Float64Array,
    spectrum: Spectrum
  ): Float64Array => {
    const arrC = fftConvolveWithSpectrum(dist, spectrum, 2 * size - 1);
    let overflow = 0;
    for (let i = size; i < arrC.length; i++) {
      overflow += arrC[i];
    }
    const truncated = new Float64Array(size);
    truncated.set(arrC.subarray(0, size));
    truncated[monsterHp] += overflow;
    return truncated;
  };

  //------------------ 본 로직 -------------------

  // 1. "한 번의 스킬 시전"으로 발생할 수 있는 데미지의 이산 확률분포를 구한다.
  //    - 본체 Hit 2회 → 각 Hit별로 크리티컬/일반 구분 → 데미지 합
  //    - 쉐도우 파트너 ON 시 파트너 타격 2회가 추가(본체와 동일한 크리티컬 여부),
  //      단 데미지는 본체 데미지에 multiplier를 곱한 고정값

  const criticalProb = criticalChance / 100;

  /**
   * 본체 데미지(축소 전 정수) 하나를 파트너까지 더하고, 축소한 뒤
   * HP 흡수 상태로 눌러 담는다.
   *
   * 클램프와 파트너 계산은 반드시 축소 전 값에서 끝내야 한다. 축소된 눈금에
   * 하한 1을 강제하면 1 눈금이 원본 1/damageScale 데미지라 오히려 부풀어 오른다.
   */
  const addDamage = (dist: Float64Array, damage: number, weight: number) => {
    if (weight <= 0) return;
    // 쉐도우 파트너는 본체 데미지가 확정된 뒤 그 데미지의 고정 비율(만렙 50%,
    // 내림)을 그대로 따라간다. 크리티컬 여부도 본체를 따르므로 독립적으로
    // 굴리지 않고 본체 데미지에서 바로 계산한다.
    //
    // 파트너도 독립된 데미지 라인이라 [1, 199999] 클램프를 받는다.
    // 본체가 1이면 파트너는 0이 아니라 1이 들어간다.
    const partner =
      shadowMultiplier > 0
        ? Math.max(
            MIN_DAMAGE_PER_LINE,
            Math.min(MAX_DAMAGE_PER_LINE, Math.floor(damage * shadowMultiplier))
          )
        : 0;
    const total = damage + partner;
    dist[Math.min(Math.round(total * damageScale), monsterHp)] += weight;
  };

  /**
   * 데미지 난수가 [uFrom, uTo) 구간일 때의 질량 weight를 분포에 더한다.
   *
   * 그 구간에서 스탯 롤은 폭 `alpha`의 균등분포이고, 방어 롤은 폭 `beta`의
   * 균등분포다. 둘의 차는 사다리꼴이라 CDF가 닫힌 식으로 나온다.
   * 여기서 정수 절삭과 [1, 199999] 클램프를 한 번에 처리한다.
   *
   *   데미지 1  <- 데미지가 2 미만인 모든 경우 (클램프 + 절삭이 겹친다)
   *   데미지 d  <- [d, d + 1)
   *   데미지 상한 <- 상한 이상인 모든 경우
   */
  const addDamageSlice = (
    dist: Float64Array,
    raw: DamageRangeInput,
    uFrom: number,
    uTo: number,
    weight: number
  ) => {
    if (weight <= 0 || uTo <= uFrom) return;

    const skill = raw.skillMultiplier ?? 1;
    const critAdd = raw.criticalAdd ?? 0;
    const beta = Math.max(0, raw.defenseBand ?? 0);
    const fullAlpha = statSpan(raw);
    const alpha = fullAlpha * (uTo - uFrom);
    // 이 구간에서 가능한 최솟값. 스탯 롤이 uFrom 지점부터 시작한다.
    const origin = raw.min + fullAlpha * uFrom;
    const cdf = trapezoidCdf(alpha, beta);
    /** P(d < x) */
    const below = (x: number) => cdf(x - origin);
    const ceiling = origin + alpha + beta;

    const put = (damage: number, mass: number) =>
      addDamage(
        dist,
        Math.max(MIN_DAMAGE_PER_LINE, Math.min(MAX_DAMAGE_PER_LINE, damage)),
        weight * mass
      );

    // d의 정수 구간마다 trunc(d)가 상수라, 그 안에서는 기울기 skill인 직선이다.
    // 구간을 넘어갈 때마다 라인 값이 critAdd만큼 건너뛴다.
    const step = skill + critAdd;
    const first = Math.max(Math.floor(origin), 0);
    const last = Math.min(
      Math.floor(ceiling),
      Math.floor(MAX_DAMAGE_PER_LINE / Math.max(step, 1e-9)) + 1
    );

    // d가 first 아래면 라인 값이 하한을 넘지 못한다
    put(MIN_DAMAGE_PER_LINE, below(first));
    put(MAX_DAMAGE_PER_LINE, 1 - below(last + 1));

    for (let bucket = first; bucket <= last; bucket++) {
      const low = Math.max(origin, bucket);
      const high = Math.min(ceiling, bucket + 1);
      if (high <= low) continue;
      const offset = critAdd * bucket;
      const valueFrom = Math.floor(skill * low + offset);
      const valueTo = Math.floor(skill * high + offset);
      for (let value = valueFrom; value <= valueTo; value++) {
        // 라인 값이 value가 되는 d 구간
        const dFrom = Math.max(low, (value - offset) / skill);
        const dTo = Math.min(high, (value + 1 - offset) / skill);
        if (dTo <= dFrom) continue;
        put(value, below(dTo) - below(dFrom));
      }
    }
  };

  /**
   * 타격 1회 분포. 데미지 난수를 [uFrom, uTo)로 제한하고
   * 일반 / 크리티컬 가중치를 지정해 만든다. 두 가중치의 합이 1이면 확률분포가 된다.
   *
   * 명중 판정은 타격별로 독립이므로 실패 질량은 항상 그대로 얹는다.
   */
  const buildHitDist = (
    uFrom: number,
    uTo: number,
    basicWeight: number,
    critWeight: number
  ): Float64Array => {
    const dist = new Float64Array(size);
    dist[0] += 1 - hitProb;
    addDamageSlice(dist, basicDamage, uFrom, uTo, basicWeight * hitProb);
    addDamageSlice(dist, criticalDamage, uFrom, uTo, critWeight * hitProb);
    return dist;
  };

  // 2. 타격 수만큼 단일 히트 분포를 합성해 "스킬 1회" 분포를 만든다.
  //    럭키 세븐은 2회 타격이고, 트리플 스로우는 3회 타격
  const hitCount = getHitCount(skillType);

  /**
   * 난수 순환을 반영할지.
   *
   * 원작은 공격 1회당 난수를 7칸만 뽑아 돌려 쓴다. 트리플 스로우 3라인에서는
   * 그 결과로 한 라인의 데미지 난수가 다른 라인의 크리티컬 판정을 그대로 결정한다
   * (메이플랜드 실측 40시전 40/40). 타격이 하나뿐인 스킬은 겹칠 상대가 없고,
   * 크리티컬 확률이 0이나 100%면 결합이 있어도 분포가 달라지지 않는다.
   */
  const coupled =
    rngCycling && hitCount === 3 && criticalProb > 0 && criticalProb < 1;

  let singleSkillDist: Float64Array;
  if (coupled) {
    // 라인 A는 완전 독립, 라인 B의 데미지 난수가 라인 C의 크리티컬을 결정한다.
    //   P(1시전) = A * [ p * (B|난수<p) * (C=크리) + (1-p) * (B|난수>=p) * (C=일반) ]
    // 크리티컬 판정이 "난수 < 크리확률"이라 B를 자르는 지점이 곧 크리확률이다.
    const p = criticalProb;
    const lineA = buildHitDist(0, 1, 1 - p, p);
    const lineBLow = buildHitDist(0, p, 1 - p, p);
    const lineBHigh = buildHitDist(p, 1, 1 - p, p);
    const lineCCrit = buildHitDist(0, 1, 0, 1);
    const lineCBasic = buildHitDist(0, 1, 1, 0);

    const low = convolveDistFFT(lineBLow, fftForward(lineCCrit, fftSize));
    const high = convolveDistFFT(lineBHigh, fftForward(lineCBasic, fftSize));

    const pair = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      pair[i] = p * low[i] + (1 - p) * high[i];
    }
    singleSkillDist = convolveDistFFT(lineA, fftForward(pair, fftSize));
  } else {
    const singleHitDistMain = buildHitDist(
      0,
      1,
      1 - criticalProb,
      criticalProb
    );
    const singleHitSpectrum = fftForward(singleHitDistMain, fftSize);
    singleSkillDist = singleHitDistMain;
    for (let i = 1; i < hitCount; i++) {
      singleSkillDist = convolveDistFFT(singleSkillDist, singleHitSpectrum);
    }
  }

  // 3. 스킬 1회 분포를 반복 합성해 N회 시전 후의 누적 데미지 분포를 구한다.
  //    같은 분포를 계속 곱하므로 정방향 변환은 한 번만 해 두고 재사용한다.
  const singleSkillSpectrum = fftForward(singleSkillDist, fftSize);

  /**
   * 시전 useIndex + 1회 시점의 사망 확률.
   * 베놈이 없으면 흡수 상태(dist[monsterHp])가 그대로 답이고,
   * 있으면 남은 HP를 베놈 누적이 마저 채울 확률을 더한다.
   */
  const killProbability = (dist: Float64Array, useIndex: number): number => {
    const survival = venomSurvivals?.[useIndex];
    if (!survival) return dist[monsterHp];
    let total = dist[monsterHp];
    for (let damage = 0; damage < monsterHp; damage++) {
      const mass = dist[damage];
      if (mass === 0) continue;
      total += mass * survival[monsterHp - damage];
    }
    return total;
  };

  const skillUseProbabilities = [];

  let distN: Float64Array = singleSkillDist;
  skillUseProbabilities.push(killProbability(distN, 0));

  while (
    skillUseProbabilities.length < maxHits &&
    skillUseProbabilities[skillUseProbabilities.length - 1] < 0.999999
  ) {
    distN = convolveDistFFT(distN, singleSkillSpectrum);
    skillUseProbabilities.push(
      killProbability(distN, skillUseProbabilities.length)
    );
  }

  let prev = 0;
  const result = [];
  for (let i = 0; i < skillUseProbabilities.length; i++) {
    const current = (skillUseProbabilities[i] - prev) * 100;
    if (current >= 0.005) {
      result.push({
        hit: i + 1,
        prob: current.toFixed(2),
        accProb: (skillUseProbabilities[i] * 100).toFixed(2),
      });
    }
    prev = skillUseProbabilities[i];
  }
  return result;
};

export const calculateDamage = (
  monster: Monster,
  stats: Stats,
  equipment: Equipment,
  skills: Skills
): DamageResult => {
  // Get skill effects
  const attackSkill = getSkillEffect(skills.type, skills.level);
  const criticalSkill = getSkillEffect('criticalThrow', skills.criticalThrow);
  const javelinSkill = getSkillEffect('javelin', skills.javelin);
  const shadowSkill = getSkillEffect('shadowPartner', skills.shadowPartner);
  const sharpEyesSkill = getSkillEffect('sharpEyes', skills.sharpEyes);

  if (!attackSkill || !criticalSkill || !javelinSkill || !shadowSkill) {
    throw new Error('Failed to get skill effects');
  }

  // Calculate total attack
  const totalAttack = calculateTotalAttack(equipment);
  // Calculate stat attack
  const statAttack = calculateStatAttack(
    stats,
    totalAttack,
    isJavelinEffect(javelinSkill) ? javelinSkill.masteryPercent / 100 : 0.1
  );

  // Calculate skill damage multiplier
  let skillDamageMultiplier = 0;
  if (
    attackSkill &&
    (isLucky7Effect(attackSkill) ||
      isAvengerEffect(attackSkill) ||
      isDrainEffect(attackSkill) ||
      isTripleThrowEffect(attackSkill))
  ) {
    skillDamageMultiplier = attackSkill.damage / 100;
  }

  // Calculate critical multiplier and chance
  let criticalMultiplier = isCriticalThrowEffect(criticalSkill)
    ? criticalSkill.criticalDamage / 100
    : 1;
  let criticalChance = isCriticalThrowEffect(criticalSkill)
    ? criticalSkill.criticalChance
    : 0;

  // Apply Sharp Eyes effects
  //
  // 크리티컬 데미지는 기본적으로 합연산이라, 크리티컬 스로우의 "크리티컬 데미지
  // 200%"는 배율에 +100%p만 더한다(totalMultiplier = 스킬% + 크리% - 100%).
  // 하지만 샤프 아이즈는 게임 스펙상 "크리티컬 데미지 40% 증가"가
  // +40%p가 아니라 +140%p를 그대로 더하는 형태로 적용된다.
  // 다른 크리티컬 증가 옵션은 이렇게 동작하지 않으므로 샤프 아이즈에만 100을 더한다.
  if (
    skills.sharpEyesEnabled &&
    sharpEyesSkill &&
    isSharpEyesEffect(sharpEyesSkill)
  ) {
    criticalChance += sharpEyesSkill.criticalChance;
    criticalMultiplier += (100 + sharpEyesSkill.damage) / 100;
  }

  // 스킬% 적용 전 데미지 축. 일반 라인과 크리티컬 라인이 같은 축을 공유하고,
  // 크리티컬 가산항은 이 축의 정수화된 값을 쓴다.
  const baseDamage = calculateBaseDamageRange(
    statAttack,
    stats,
    monster,
    skills.type,
    totalAttack
  );
  const criticalAdd = criticalMultiplier - 1;

  // 방컷 확률에는 이 축을 그대로 넘긴다.
  // 클램프에 눌리는 구간은 난수가 한 값에 뭉치는 확률질량이고,
  // 크리티컬 가산항은 계단이라, 미리 정수 범위로 눌러 담으면 둘 다 표현할 수 없다.
  const basicLine: DamageRangeInput = {
    ...baseDamage,
    skillMultiplier: skillDamageMultiplier,
    criticalAdd: 0,
  };
  const criticalLine: DamageRangeInput = {
    ...baseDamage,
    skillMultiplier: skillDamageMultiplier,
    criticalAdd,
  };

  const toLine = (base: number, add: number) =>
    Math.max(
      MIN_DAMAGE_PER_LINE,
      Math.min(
        MAX_DAMAGE_PER_LINE,
        damageLineValue(base, skillDamageMultiplier, add)
      )
    );
  const basicDamage = {
    min: toLine(baseDamage.min, 0),
    max: toLine(baseDamage.max, 0),
  };
  const criticalDamage = {
    min: toLine(baseDamage.min, criticalAdd),
    max: toLine(baseDamage.max, criticalAdd),
  };

  // Calculate shadow partner damage
  let shadowMultiplier = 0;
  if (skills.shadowPartnerEnabled && isShadowPartnerEffect(shadowSkill)) {
    shadowMultiplier = shadowSkill.skillDamage / 100;
  }

  // 스탯 공격력은 데미지 라인이 아니라 중간값이라 [1, 199999] 클램프를 걸지 않는다.
  statAttack.min = Math.max(Math.floor(statAttack.min), 0);
  statAttack.max = Math.max(Math.floor(statAttack.max), 0);

  // Calculate shadow partner damage ranges
  // 파트너 타격도 독립된 데미지 라인이라 같은 클램프를 받는다.
  const shadowLine = (damage: number) =>
    shadowMultiplier > 0 ? toDamageLine(damage * shadowMultiplier) : 0;

  const shadowBasic = {
    min: shadowLine(basicDamage.min),
    max: shadowLine(basicDamage.max),
  };

  const shadowCritical = {
    min: shadowLine(criticalDamage.min),
    max: shadowLine(criticalDamage.max),
  };

  // Calculate final damage ranges (본체 + 쉐도우 파트너, 타격 1회 기준)
  let totalMin = basicDamage.min + shadowBasic.min;
  let totalMax = criticalDamage.max + shadowCritical.max;

  // 베놈 설정
  //
  // 원작에서 베놈은 표창을 든 나이트로드의 거의 모든 공격에 타격마다 굴러가고,
  // 쉐도우 파트너 타격도 각각 따로 판정한다. 다만 보스와 독 무효/반감 몬스터에는
  // 아예 걸리지 않고, 드레인에는 붙지 않는다.
  //
  // 명중 실패한 타격도 판정을 굴리는지는 유출 코드로 확정할 수 없다.
  // 실사용 대부분이 명중률 100%라 단순화를 위해 항상 굴리는 것으로 둔다.
  const venomBlockedByMonster =
    monster.isBoss === true ||
    POISON_BLOCKING_ATTRIBUTES.includes(monster.poisonAttribute ?? 0);
  const shadowPartnerActive =
    skills.shadowPartnerEnabled && shadowMultiplier > 0;
  const { totalStr, totalDex, totalLuk } = calculateTotalStats(stats);

  let venomConfig: VenomConfig | null = null;
  if (
    skills.venomEnabled &&
    skills.venom > 0 &&
    !VENOM_EXCLUDED_SKILLS.includes(skills.type) &&
    !venomBlockedByMonster
  ) {
    venomConfig = {
      level: skills.venom,
      totalStr,
      totalDex,
      totalLuk,
      rollsPerUse: getHitCount(skills.type) * (shadowPartnerActive ? 2 : 1),
      attackPeriodSeconds:
        60 / (skills.attacksPerMinute || DEFAULT_ATTACKS_PER_MINUTE),
    };
  }
  const venomTickDamage = venomConfig
    ? calculateVenomTickDamage(venomConfig)
    : null;
  if (!venomTickDamage) {
    venomConfig = null;
  }

  // Calculate kill probabilities
  const killProbabilities = calculateKillProbabilitiesWithinNHits(
    skills.type,
    basicLine,
    criticalLine,
    shadowMultiplier,
    criticalChance,
    monster.hp,
    stats,
    monster,
    20,
    venomConfig,
    skills.rngCyclingEnabled
  );

  // Calculate critical probability
  const criticalProb = criticalChance / 100;

  // Calculate expected damage
  const expectedBasicDamage =
    ((basicDamage.min + basicDamage.max) / 2) * (1 + shadowMultiplier);
  const expectedCriticalDamage =
    ((criticalDamage.min + criticalDamage.max) / 2) * (1 + shadowMultiplier);
  let totalExpected = Math.floor(
    expectedBasicDamage * (1 - criticalProb) +
      expectedCriticalDamage * criticalProb
  );

  // Calculate HP absorption range for Drain skill
  let hpAbsorption = { min: 0, max: 0, expected: 0 };
  if (isDrainEffect(attackSkill)) {
    const rawAbsorptionMin = Math.floor(
      (totalMin * attackSkill.absorptionPercent) / 100
    );
    const rawAbsorptionMax = Math.floor(
      (totalMax * attackSkill.absorptionPercent) / 100
    );
    const expectedAbsorption = Math.floor(
      (totalExpected * attackSkill.absorptionPercent) / 100
    );

    hpAbsorption = {
      min: Math.min(rawAbsorptionMin, monster.hp),
      max: Math.min(rawAbsorptionMax, monster.hp),
      expected: Math.min(expectedAbsorption, monster.hp),
    };
  }

  // Apply Lucky7 double damage
  if (skills.type === 'lucky7') {
    totalMin = totalMin * 2;
    totalMax = totalMax * 2;
    totalExpected = totalExpected * 2;
  }

  // Apply Triple Throw triple damage
  if (skills.type === 'tripleThrow') {
    totalMin = totalMin * 3;
    totalMax = totalMax * 3;
    totalExpected = totalExpected * 3;
  }

  return {
    statAttack,
    basic: basicDamage,
    critical: criticalDamage,
    shadowBasic,
    shadowCritical,
    totalDamageRange: { min: totalMin, max: totalMax, expected: totalExpected },
    killProbabilities,
    hpAbsorption,
    venomTickDamage,
    venomApplied: venomConfig !== null,
  };
};
