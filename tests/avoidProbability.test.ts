import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVOID_PROBABILITY_MAX,
  AVOID_PROBABILITY_MIN,
  calculateAvoidBreakdown,
  calculateAvoidProbability,
  calculateMagicAvoidProbability,
  combineAvoidWithShadowShifter,
} from '../app/utils/damageCalculator';
import {
  SHADOW_SHIFTER_MAX_LEVEL,
  getShadowShifterProp,
} from '../app/data/shadowShifter';
import { createRandom } from './helpers/reference';

/**
 * 원작 `CalcDamage::CheckPDamageMiss`를 그대로 옮긴 판정.
 *
 * 배포 코드와 독립적으로 조건문을 한 줄씩 따라 쓴 것이라,
 * 닫힌 식으로 바꾼 쪽이 틀리면 몬테카를로에서 어긋난다.
 */
const checkPhysicalMiss = (
  avoid: number,
  monsterLevel: number,
  characterLevel: number,
  monsterAccuracy: number,
  random: () => number
): boolean => {
  let nEVA = Math.min(999, Math.max(0, avoid));
  let nMobEVA = 0;
  if (characterLevel >= monsterLevel) {
    nMobEVA = nEVA;
  } else {
    nEVA -= Math.trunc((monsterLevel - characterLevel) / 2);
    if (nEVA > 0) {
      nMobEVA = nEVA;
    }
  }

  const nMobACC = Math.min(999, Math.max(0, monsterAccuracy));
  // C++에서 0으로 나누면 무한대가 되고 그대로 상한에 잘린다.
  let calc = nMobACC === 0 ? Infinity : (nMobEVA / (nMobACC * 4.5)) * 100;
  // 이 계산기는 나이트로드(도적) 전용이므로 5~95% 분기만 쓴다.
  calc = Math.max(5, Math.min(95, calc));

  return calc > random() * 100;
};

/** 원작 `CalcDamage::CheckMDamageMiss`를 그대로 옮긴 판정. */
const checkMagicMiss = (
  avoid: number,
  monsterLevel: number,
  characterLevel: number,
  monsterAccuracy: number,
  random: () => number
): boolean => {
  let nACC = Math.min(999, Math.max(0, avoid));
  let nMobACC = 0;
  if (characterLevel >= monsterLevel) {
    nMobACC = nACC;
  } else {
    nACC -= monsterLevel - characterLevel;
    if (nACC > 0) {
      nMobACC = nACC;
    }
  }

  const dAccLow = nMobACC * 0.1;
  const dAccHigh = nMobACC;
  const calc = dAccLow + (dAccHigh - dAccLow) * random();

  return calc >= Math.min(999, Math.max(0, monsterAccuracy));
};

interface AvoidCase {
  name: string;
  avoid: number;
  monsterLevel: number;
  characterLevel: number;
  monsterAccuracy: number;
}

const CASES: AvoidCase[] = [
  {
    name: '레벨이 높아 페널티가 없는 구간',
    avoid: 120,
    monsterLevel: 76,
    characterLevel: 120,
    monsterAccuracy: 90,
  },
  {
    name: '몹이 더 높아 레벨 페널티를 받는 구간',
    avoid: 120,
    monsterLevel: 140,
    characterLevel: 100,
    monsterAccuracy: 120,
  },
  {
    name: '레벨차가 홀수라 물리 페널티가 내림되는 구간',
    avoid: 80,
    monsterLevel: 111,
    characterLevel: 100,
    monsterAccuracy: 60,
  },
  {
    name: '회피율이 낮아 하한에 눌리는 구간',
    avoid: 10,
    monsterLevel: 120,
    characterLevel: 100,
    monsterAccuracy: 300,
  },
  {
    name: '회피율이 높아 상한에 걸리는 구간',
    avoid: 600,
    monsterLevel: 60,
    characterLevel: 120,
    monsterAccuracy: 40,
  },
  {
    name: '회피율이 999에서 잘리는 구간',
    avoid: 2000,
    monsterLevel: 60,
    characterLevel: 120,
    monsterAccuracy: 400,
  },
  {
    name: '페널티가 회피율을 다 깎아 먹는 구간',
    avoid: 20,
    monsterLevel: 200,
    characterLevel: 100,
    monsterAccuracy: 150,
  },
  {
    name: '몹 명중률이 0인 구간',
    avoid: 50,
    monsterLevel: 30,
    characterLevel: 50,
    monsterAccuracy: 0,
  },
];

const TRIALS = 400000;

describe('회피 확률 - 원작 판정 몬테카를로 대조', () => {
  for (const c of CASES) {
    it(`물리: ${c.name}`, () => {
      const random = createRandom(0x5eed + c.avoid + c.monsterAccuracy);
      let misses = 0;
      for (let i = 0; i < TRIALS; i += 1) {
        if (
          checkPhysicalMiss(
            c.avoid,
            c.monsterLevel,
            c.characterLevel,
            c.monsterAccuracy,
            random
          )
        ) {
          misses += 1;
        }
      }

      const expected = misses / TRIALS;
      const actual = calculateAvoidProbability(
        c.avoid,
        c.monsterLevel,
        c.characterLevel,
        c.monsterAccuracy
      );
      assert.ok(
        Math.abs(actual - expected) < 0.005,
        `${c.name}: 닫힌 식 ${(actual * 100).toFixed(2)}% vs 몬테카를로 ${(
          expected * 100
        ).toFixed(2)}%`
      );
    });

    it(`마법: ${c.name}`, () => {
      const random = createRandom(0xbeef + c.avoid + c.monsterAccuracy);
      let misses = 0;
      for (let i = 0; i < TRIALS; i += 1) {
        if (
          checkMagicMiss(
            c.avoid,
            c.monsterLevel,
            c.characterLevel,
            c.monsterAccuracy,
            random
          )
        ) {
          misses += 1;
        }
      }

      const expected = misses / TRIALS;
      const actual = calculateMagicAvoidProbability(
        c.avoid,
        c.monsterLevel,
        c.characterLevel,
        c.monsterAccuracy
      );
      assert.ok(
        Math.abs(actual - expected) < 0.005,
        `${c.name}: 닫힌 식 ${(actual * 100).toFixed(2)}% vs 몬테카를로 ${(
          expected * 100
        ).toFixed(2)}%`
      );
    });
  }
});

describe('회피 확률 - 원작 공식의 경계', () => {
  it('회피율을 비워 두면 0으로 보고, 물리는 하한이 남는다', () => {
    assert.equal(
      calculateAvoidProbability(undefined, 100, 100, 100),
      AVOID_PROBABILITY_MIN
    );
    assert.equal(
      calculateAvoidProbability(0, 100, 100, 100),
      AVOID_PROBABILITY_MIN
    );
  });

  it('마법은 클램프가 없어 회피율 0이면 그대로 0%다', () => {
    assert.equal(calculateMagicAvoidProbability(undefined, 100, 100, 100), 0);
    assert.equal(calculateMagicAvoidProbability(0, 100, 100, 100), 0);
  });

  it('몹 명중률이 0이면 물리는 상한, 마법은 100%다', () => {
    assert.equal(
      calculateAvoidProbability(50, 100, 100, 0),
      AVOID_PROBABILITY_MAX
    );
    assert.equal(calculateMagicAvoidProbability(50, 100, 100, 0), 1);
    // 회피율까지 0이면 굴린 값도 0이라, 0 >= 0으로 회피가 성립한다.
    assert.equal(calculateMagicAvoidProbability(0, 100, 100, 0), 1);
  });

  it('물리 레벨 페널티는 레벨차의 절반, 마법은 레벨차 전부다', () => {
    // 레벨차 20 -> 물리는 회피율 -10, 마법은 -20.
    const physical = calculateAvoidProbability(100, 120, 100, 40);
    const physicalSame = calculateAvoidProbability(90, 100, 100, 40);
    assert.ok(Math.abs(physical - physicalSame) < 1e-12);

    const magic = calculateMagicAvoidProbability(100, 120, 100, 40);
    const magicSame = calculateMagicAvoidProbability(80, 100, 100, 40);
    assert.ok(Math.abs(magic - magicSame) < 1e-12);
  });

  it('마법은 몹 명중률이 유효 회피율의 10% 이하면 100%, 이상이면 0%다', () => {
    assert.equal(calculateMagicAvoidProbability(200, 100, 100, 20), 1);
    assert.equal(calculateMagicAvoidProbability(200, 100, 100, 200), 0);
    // 그 사이는 (E - ACC) / (0.9 * E)
    assert.ok(
      Math.abs(calculateMagicAvoidProbability(200, 100, 100, 110) - 90 / 180) <
        1e-12
    );
  });

  it('물리 확률은 항상 도적 상·하한 안에 있다', () => {
    for (const avoid of [0, 1, 37, 250, 999, 5000]) {
      for (const accuracy of [0, 1, 55, 400, 999]) {
        const p = calculateAvoidProbability(avoid, 150, 100, accuracy);
        assert.ok(p >= AVOID_PROBABILITY_MIN - 1e-12);
        assert.ok(p <= AVOID_PROBABILITY_MAX + 1e-12);
      }
    }
  });
});

describe('페이크 (쉐도우 쉬프터)', () => {
  it('원작 Skill.wz의 prop은 레벨과 같다', () => {
    assert.equal(getShadowShifterProp(1), 1);
    assert.equal(getShadowShifterProp(17), 17);
    assert.equal(getShadowShifterProp(SHADOW_SHIFTER_MAX_LEVEL), 30);
    // 레벨 0(미습득)이나 잘못된 값은 발동하지 않는다.
    assert.equal(getShadowShifterProp(0), 0);
    assert.equal(getShadowShifterProp(-3), 0);
    assert.equal(getShadowShifterProp(1.5), 0);
    // 만렙을 넘겨도 30%에서 멈춘다.
    assert.equal(getShadowShifterProp(99), 30);
  });

  it('회피와 페이크는 어느 쪽을 먼저 굴려도 결과가 같다', () => {
    // 유출본에서는 페이크 판정이 클라이언트에 있어 순서를 확정할 수 없다.
    // 둘 다 단독으로 피해를 0으로 만들고 난수가 독립이라 순서가 무의미하다.
    for (const a of [0, 0.05, 0.42, 0.95, 1]) {
      for (const p of [0, 0.01, 0.3, 1]) {
        const avoidFirst = a + (1 - a) * p;
        const fakeFirst = p + (1 - p) * a;
        const combined = combineAvoidWithShadowShifter(a, p);
        assert.ok(Math.abs(combined - avoidFirst) < 1e-12);
        assert.ok(Math.abs(combined - fakeFirst) < 1e-12);
      }
    }
  });

  it('페이크가 0이면 순수 회피 확률과 같다', () => {
    const breakdown = calculateAvoidBreakdown(120, 100, 120, 90, 0);
    assert.equal(breakdown.physical.base, breakdown.physical.withShadowShifter);
    assert.equal(breakdown.magic.base, breakdown.magic.withShadowShifter);
  });
});

describe('회피율 1당 증가폭', () => {
  it('회피율을 실제로 1 올린 차이와 같다', () => {
    const avoid = 100;
    const args = [140, 120, 80] as const;
    const breakdown = calculateAvoidBreakdown(avoid, ...args, 0);

    assert.equal(
      breakdown.physical.baseGainPerAvoid,
      calculateAvoidProbability(avoid + 1, ...args) -
        calculateAvoidProbability(avoid, ...args)
    );
    assert.equal(
      breakdown.magic.baseGainPerAvoid,
      calculateMagicAvoidProbability(avoid + 1, ...args) -
        calculateMagicAvoidProbability(avoid, ...args)
    );
  });

  it('상한에 걸린 구간에서는 증가폭이 0이다', () => {
    // 회피율 600 / 몹 명중률 40이면 물리는 이미 상한 95%다.
    const breakdown = calculateAvoidBreakdown(600, 60, 120, 40, 0);
    assert.equal(breakdown.physical.base, AVOID_PROBABILITY_MAX);
    assert.equal(breakdown.physical.baseGainPerAvoid, 0);
  });

  it('페이크를 켜면 증가폭이 남은 몫만큼 줄어든다', () => {
    const fake = 0.3;
    const breakdown = calculateAvoidBreakdown(100, 140, 120, 90, fake);

    // 페이크가 먼저 걸러 낸 만큼 회피율 한 점의 값어치가 작아진다.
    assert.ok(
      Math.abs(
        breakdown.physical.shadowShifterGainPerAvoid -
          breakdown.physical.baseGainPerAvoid * (1 - fake)
      ) < 1e-12
    );
    assert.ok(
      Math.abs(
        breakdown.magic.shadowShifterGainPerAvoid -
          breakdown.magic.baseGainPerAvoid * (1 - fake)
      ) < 1e-12
    );
    assert.ok(
      breakdown.physical.shadowShifterGainPerAvoid <
        breakdown.physical.baseGainPerAvoid
    );
  });

  it('회피율 미입력은 0으로 보고 증가폭을 낸다', () => {
    const undefinedAvoid = calculateAvoidBreakdown(undefined, 100, 100, 80, 0);
    const zeroAvoid = calculateAvoidBreakdown(0, 100, 100, 80, 0);
    assert.deepEqual(undefinedAvoid, zeroAvoid);
  });
});
