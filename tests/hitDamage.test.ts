import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Monster, Stats } from '../app/types/calculator';
import {
  MIN_HIT_DAMAGE,
  calculateHitDamageBreakdown,
} from '../app/utils/damageCalculator';
import { getStandardPhysicalDefense } from '../app/data/standardPDD';
import { MOB_ATTACK_UP_TIERS } from '../app/data/mobBuffs';
import { PURE_INT } from '../app/constants/calculator';
import { createRandom } from './helpers/reference';

const makeStats = (overrides: Partial<Stats> = {}): Stats => ({
  level: 120,
  str: 4,
  dex: 25,
  luk: 400,
  additionalStr: 0,
  additionalDex: 0,
  additionalLuk: 0,
  additionalInt: 0,
  physicalDefense: 500,
  magicalDefense: 400,
  ...overrides,
});

const makeMonster = (overrides: Partial<Monster> = {}): Monster => ({
  level: 76,
  hp: 18000,
  physicalDefense: 400,
  magicalDefense: 400,
  avoid: 27,
  accuracy: 140,
  physicalAttack: 300,
  magicAttack: 350,
  ...overrides,
});

/**
 * 원작 `CalcDamage::PDamage(MobStat*, MobAttackInfo*, …)`를 조건문 하나씩 그대로
 * 따라 쓴 참조 구현. 난수를 하나 받아 그 롤에서의 데미지를 낸다.
 *
 * 배포 코드는 이걸 "롤 0이 최솟값, 롤 1이 최댓값"인 닫힌 범위로 바꿔 쓰므로,
 * 그 변형이 틀리면 여기서 어긋난다.
 */
const referencePhysicalDamage = (
  monster: Monster,
  stats: Stats,
  roll: number,
  powerUp = 0
): number => {
  let nMobPDD = Math.min(1999, Math.max(0, monster.physicalAttack));
  const damage = nMobPDD * 0.8;
  const highDamage = nMobPDD * 0.85;

  let calc = (highDamage - damage) * roll + damage;
  calc *= nMobPDD * 0.01;

  nMobPDD = Math.min(1999, Math.max(0, stats.physicalDefense ?? 0));
  const nStandardPDD = getStandardPhysicalDefense(stats.level);
  // 나이트로드는 직업군 4라 전사(1)가 아닌 가지를 탄다.
  const nBase = Math.trunc(
    (PURE_INT + stats.additionalInt) * 0.1111111111111111 +
      (stats.dex + stats.additionalDex) * 0.2857142857142857 +
      (stats.str + stats.additionalStr) * 0.4 +
      (stats.luk + stats.additionalLuk) * 0.25
  );

  let calc1 = 0;
  let calc2 = 0;
  if (nStandardPDD > nMobPDD) {
    calc1 = stats.level * 0.001818181818181818 + nBase * 0.00125 + 0.28;
    if (stats.level >= monster.level) {
      calc2 =
        (calc1 * (nMobPDD - nStandardPDD) * 13.0) /
        (stats.level - monster.level + 13.0);
    } else {
      calc2 = calc1 * (nMobPDD - nStandardPDD) * 1.3;
    }
  } else {
    calc2 =
      (nBase * 0.0011111111111111 +
        stats.level * 0.0007692307692307692 +
        0.28) *
      (nMobPDD - nStandardPDD) *
      0.7;
  }
  calc1 = nBase * 0.00125;

  let result = calc - (calc2 + (calc1 + 0.28) * nMobPDD);
  // 원작은 클램프 직전에 몹 공격업 배율을 곱한다.
  if (powerUp) result *= powerUp * 0.01;
  if (result <= 1.0) result = 1.0;
  if (result >= 99999.0) result = 99999.0;
  return Math.trunc(result);
};

/** 원작 `CalcDamage::MDamage(MobStat*, MobAttackInfo*, …)`를 그대로 따라 쓴 참조 구현. */
const referenceMagicDamage = (
  monster: Monster,
  stats: Stats,
  roll: number,
  magicUp = 0
): number => {
  let nMobMDD = Math.min(1999, Math.max(0, monster.magicAttack));
  const damage = nMobMDD * 0.75;
  const highDamage = nMobMDD * 0.8;

  let calc = (highDamage - damage) * roll + damage;
  calc *= nMobMDD * 0.01;

  nMobMDD = Math.min(1999, Math.max(0, stats.magicalDefense ?? 0));
  let reduce =
    (stats.str + stats.additionalStr) * 0.14285714285714 +
    (stats.luk + stats.additionalLuk) * 0.2 +
    (stats.dex + stats.additionalDex) * 0.1666666666667 +
    nMobMDD;
  // 마법사(직업군 2)만 0.3이다.
  reduce *= 0.25;

  let result = calc - reduce;
  if (magicUp) result *= magicUp * 0.01;
  if (result <= 1.0) result = 1.0;
  if (result >= 99999.0) result = 99999.0;
  return Math.trunc(result);
};

describe('표준 물리 방어력 표', () => {
  it('표에 없는 레벨은 바로 아래 칸의 값을 그대로 쓴다', () => {
    assert.equal(getStandardPhysicalDefense(70), 257);
    assert.equal(getStandardPhysicalDefense(72), 257);
    assert.equal(getStandardPhysicalDefense(74), 257);
    assert.equal(getStandardPhysicalDefense(75), 263);
  });

  it('첫 칸(10) 미만은 0이다', () => {
    assert.equal(getStandardPhysicalDefense(1), 0);
    assert.equal(getStandardPhysicalDefense(9), 0);
    assert.equal(getStandardPhysicalDefense(10), 42);
  });

  it('100을 넘으면 100의 값이 그대로 유지된다', () => {
    assert.equal(getStandardPhysicalDefense(100), 331);
    assert.equal(getStandardPhysicalDefense(200), 331);
  });

  it('원작 GetStandardPDD와 같이 레벨 255를 넘으면 0을 준다', () => {
    assert.equal(getStandardPhysicalDefense(255), 331);
    assert.equal(getStandardPhysicalDefense(256), 0);
  });
});

describe('피격 데미지', () => {
  it('참조 구현이 내는 값이 항상 범위 안에 들어온다', () => {
    const random = createRandom(20260816);
    const cases: { monster: Monster; stats: Stats }[] = [
      { monster: makeMonster(), stats: makeStats() },
      // 방어력이 표준보다 낮아 감면 식이 갈리는 쪽
      { monster: makeMonster(), stats: makeStats({ physicalDefense: 100 }) },
      // 몹이 캐릭터보다 높은 레벨 (레벨 페널티 가지)
      {
        monster: makeMonster({ level: 160 }),
        stats: makeStats({ level: 80, physicalDefense: 100 }),
      },
      // 방어력 0
      {
        monster: makeMonster(),
        stats: makeStats({ physicalDefense: 0, magicalDefense: 0 }),
      },
      // 공격력이 큰 몹
      {
        monster: makeMonster({ physicalAttack: 1200, magicAttack: 1100 }),
        stats: makeStats(),
      },
    ];

    for (const { monster, stats } of cases) {
      const breakdown = calculateHitDamageBreakdown(monster, stats);
      for (let i = 0; i < 2000; i += 1) {
        const roll = random();
        const physical = referencePhysicalDamage(monster, stats, roll);
        const magic = referenceMagicDamage(monster, stats, roll);

        assert.ok(
          physical >= breakdown.physical.damage.min &&
            physical <= breakdown.physical.damage.max,
          `물리 ${physical}이 ${breakdown.physical.damage.min}~${breakdown.physical.damage.max} 밖이다`
        );
        assert.ok(
          magic >= breakdown.magic.damage.min &&
            magic <= breakdown.magic.damage.max,
          `마법 ${magic}이 ${breakdown.magic.damage.min}~${breakdown.magic.damage.max} 밖이다`
        );
      }

      // 공격업 단계도 같은 참조 구현과 맞아야 한다.
      for (const tier of breakdown.physical.poweredUp) {
        assert.equal(
          referencePhysicalDamage(monster, stats, 0, tier.percent),
          tier.damage.min
        );
        assert.equal(
          referencePhysicalDamage(monster, stats, 1, tier.percent),
          tier.damage.max
        );
      }
      for (const tier of breakdown.magic.poweredUp) {
        assert.equal(
          referenceMagicDamage(monster, stats, 0, tier.percent),
          tier.damage.min
        );
        assert.equal(
          referenceMagicDamage(monster, stats, 1, tier.percent),
          tier.damage.max
        );
      }

      // 양 끝은 실제로 나오는 값이어야 한다. 안 그러면 범위가 헐겁다는 뜻이다.
      assert.equal(
        referencePhysicalDamage(monster, stats, 0),
        breakdown.physical.damage.min
      );
      assert.equal(
        referencePhysicalDamage(monster, stats, 1),
        breakdown.physical.damage.max
      );
      assert.equal(
        referenceMagicDamage(monster, stats, 0),
        breakdown.magic.damage.min
      );
      assert.equal(
        referenceMagicDamage(monster, stats, 1),
        breakdown.magic.damage.max
      );
    }
  });

  it('듀얼 비틀에게 맞는 120레벨 기준 값이 고정돼 있다', () => {
    const breakdown = calculateHitDamageBreakdown(makeMonster(), makeStats());

    assert.deepEqual(breakdown.physical.damage, { min: 453, max: 498 });
    assert.deepEqual(breakdown.magic.damage, { min: 797, max: 858 });

    assert.deepEqual(
      breakdown.physical.poweredUp.map((tier) => tier.damage),
      [
        { min: 521, max: 573 },
        { min: 589, max: 648 },
      ]
    );
    assert.deepEqual(
      breakdown.magic.poweredUp.map((tier) => tier.damage),
      [
        { min: 917, max: 987 },
        { min: 1036, max: 1116 },
      ]
    );
  });

  it('공격업 배율은 감면 뒤에 곱해진다 (몹 공격력을 올리는 것과 다르다)', () => {
    const monster = makeMonster();
    const stats = makeStats();
    const breakdown = calculateHitDamageBreakdown(monster, stats);

    assert.deepEqual(
      breakdown.physical.poweredUp.map((tier) => [tier.stage, tier.percent]),
      MOB_ATTACK_UP_TIERS.map((tier) => [tier.stage, tier.percent])
    );

    for (const tier of breakdown.physical.poweredUp) {
      assert.ok(tier.damage.max > breakdown.physical.damage.max);
      // 절삭은 곱한 뒤에 한 번만 한다. 화면에 뜬 정수에 곱하면 1씩 어긋난다.
      assert.ok(
        tier.damage.max >=
          Math.trunc(breakdown.physical.damage.max * tier.percent * 0.01)
      );
      // 몹 공격력에 같은 배율을 먹인 것과는 달라야 한다 (2차식 + 감면이 남는다).
      const boostedAttack = calculateHitDamageBreakdown(
        makeMonster({
          physicalAttack: monster.physicalAttack * (tier.percent / 100),
        }),
        stats
      );
      assert.notEqual(tier.damage.max, boostedAttack.physical.damage.max);
    }
  });

  it('하한에 눌린 데미지는 공격업이 걸려도 1이다', () => {
    const breakdown = calculateHitDamageBreakdown(
      makeMonster(),
      makeStats({ physicalDefense: 1999 })
    );

    assert.ok(breakdown.physical.atMinimum);
    for (const tier of breakdown.physical.poweredUp) {
      assert.deepEqual(tier.damage, {
        min: MIN_HIT_DAMAGE,
        max: MIN_HIT_DAMAGE,
      });
    }
  });

  it('방어력을 올리면 데미지가 줄고, 줄어드는 폭이 그대로 표시된다', () => {
    const monster = makeMonster();
    const here = calculateHitDamageBreakdown(monster, makeStats());
    // 마법은 방어력 1당 0.25씩이라 정수 데미지는 한 점으로는 안 움직인다.
    const next = calculateHitDamageBreakdown(
      monster,
      makeStats({ physicalDefense: 600, magicalDefense: 500 })
    );

    assert.ok(next.physical.damage.max < here.physical.damage.max);
    assert.ok(next.magic.damage.max < here.magic.damage.max);
    // 마법은 방어력 1당 정확히 0.25씩 깎인다 (감면 계수가 그대로 곱해진다).
    assert.ok(Math.abs(here.magic.reducePerDefense - 0.25) < 1e-9);
    assert.ok(here.physical.reducePerDefense > 0);
  });

  it('몹 공격력은 1999에서 잘린다', () => {
    const capped = calculateHitDamageBreakdown(
      makeMonster({ physicalAttack: 1999, magicAttack: 1999 }),
      makeStats()
    );
    const beyond = calculateHitDamageBreakdown(
      makeMonster({ physicalAttack: 5000, magicAttack: 5000 }),
      makeStats()
    );

    assert.deepEqual(beyond.physical.damage, capped.physical.damage);
    assert.deepEqual(beyond.magic.damage, capped.magic.damage);
  });

  it('방어력이 아주 높으면 하한 1에서 멈춘다', () => {
    // 마법 감면은 방어력 1당 0.25뿐이라, 하한에 닿으려면 몹 마공이 낮아야 한다.
    const breakdown = calculateHitDamageBreakdown(
      makeMonster({ magicAttack: 50 }),
      makeStats({ physicalDefense: 1999, magicalDefense: 1999 })
    );

    assert.deepEqual(breakdown.physical.damage, {
      min: MIN_HIT_DAMAGE,
      max: MIN_HIT_DAMAGE,
    });
    assert.deepEqual(breakdown.magic.damage, {
      min: MIN_HIT_DAMAGE,
      max: MIN_HIT_DAMAGE,
    });
    assert.ok(breakdown.physical.atMinimum);
    assert.ok(breakdown.magic.atMinimum);
  });

  it('INT는 물리 피격 데미지만 움직인다', () => {
    const monster = makeMonster();
    const withoutInt = calculateHitDamageBreakdown(monster, makeStats());
    const withInt = calculateHitDamageBreakdown(
      monster,
      makeStats({ additionalInt: 100 })
    );

    assert.ok(withInt.physical.damage.max < withoutInt.physical.damage.max);
    assert.deepEqual(withInt.magic.damage, withoutInt.magic.damage);
  });

  it('방어력이 표준보다 낮으면 레벨 차이가 개입한다', () => {
    // 방어력 100 < 레벨 80의 표준 291이라 레벨 가지가 갈리는 구간이다.
    const lowDefense = makeStats({ level: 80, physicalDefense: 100 });
    const sameLevel = calculateHitDamageBreakdown(
      makeMonster({ level: 80 }),
      lowDefense
    );
    const higherMonster = calculateHitDamageBreakdown(
      makeMonster({ level: 120 }),
      lowDefense
    );

    // 몹 레벨이 캐릭터보다 높으면 감면이 더 크게 깎여서 더 아프다.
    assert.ok(
      higherMonster.physical.damage.max > sameLevel.physical.damage.max
    );
  });
});
