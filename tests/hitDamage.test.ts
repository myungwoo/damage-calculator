import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Monster, Stats } from '../app/types/calculator';
import {
  MIN_HIT_DAMAGE,
  calculateHitDamageBreakdown,
} from '../app/utils/damageCalculator';
import { getStandardPhysicalDefense } from '../app/data/standardPDD';
import { MOB_ATTACK_UP_TIERS } from '../app/data/mobBuffs';
import { MOB_SKILLS } from '../app/data/mobSkills';
import { monsterPresets } from '../app/data/monsterPresets';
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
  hasMagicAttack: true,
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

describe('몬스터 프리셋의 공격 정보', () => {
  it('물리 공격 목록은 몸박보다 센 값만 오름차순으로 담는다', () => {
    // 원작이 max(몹 기본, 공격별)을 쓰므로, 몸박 이하인 값은 프리셋에 남길 이유가 없다.
    for (const preset of monsterPresets) {
      const powers = preset.physicalAttackPowers;
      if (powers === undefined) continue;

      assert.ok(powers.length > 0, `${preset.name}의 물리 공격 목록이 비었다`);
      assert.ok(
        powers.every((power) => power > preset.physicalAttack),
        `${preset.name}에 몸박보다 세지 않은 공격이 들어 있다`
      );
      assert.deepEqual(
        powers,
        [...new Set(powers)].sort((a, b) => a - b),
        `${preset.name}의 물리 공격 목록이 정렬·중복 제거되어 있지 않다`
      );
    }
  });

  it('마법 공격이 없는 몹은 마법 공격력이 있어도 마법으로 안 때린다', () => {
    const withMad = monsterPresets.filter((preset) => preset.magicAttack > 0);
    const noMagicAttack = withMad.filter(
      (preset) => preset.hasMagicAttack !== true
    );

    // 마공만 보고 마법 피격을 그리면 이 몹들에서 없는 데미지를 만들어 낸다.
    assert.ok(noMagicAttack.length > 0);
    assert.ok(withMad.length > noMagicAttack.length);
  });
});

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
          physical >= breakdown.body.damage.min &&
            physical <= breakdown.body.damage.max,
          `물리 ${physical}이 ${breakdown.body.damage.min}~${breakdown.body.damage.max} 밖이다`
        );
        assert.ok(
          magic >= breakdown.magic!.damage.min &&
            magic <= breakdown.magic!.damage.max,
          `마법 ${magic}이 ${breakdown.magic!.damage.min}~${breakdown.magic!.damage.max} 밖이다`
        );
      }

      // 공격업 단계도 같은 참조 구현과 맞아야 한다.
      for (const tier of breakdown.body.poweredUp) {
        assert.equal(
          referencePhysicalDamage(monster, stats, 0, tier.percent),
          tier.damage.min
        );
        assert.equal(
          referencePhysicalDamage(monster, stats, 1, tier.percent),
          tier.damage.max
        );
      }
      for (const tier of breakdown.magic!.poweredUp) {
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
        breakdown.body.damage.min
      );
      assert.equal(
        referencePhysicalDamage(monster, stats, 1),
        breakdown.body.damage.max
      );
      assert.equal(
        referenceMagicDamage(monster, stats, 0),
        breakdown.magic!.damage.min
      );
      assert.equal(
        referenceMagicDamage(monster, stats, 1),
        breakdown.magic!.damage.max
      );
    }
  });

  it('듀얼 비틀에게 맞는 120레벨 기준 값이 고정돼 있다', () => {
    const breakdown = calculateHitDamageBreakdown(makeMonster(), makeStats());

    assert.deepEqual(breakdown.body.damage, { min: 453, max: 498 });
    assert.deepEqual(breakdown.magic!.damage, { min: 797, max: 858 });

    assert.deepEqual(
      breakdown.body.poweredUp.map((tier) => tier.damage),
      [
        { min: 521, max: 573 },
        { min: 589, max: 648 },
      ]
    );
    assert.deepEqual(
      breakdown.magic!.poweredUp.map((tier) => tier.damage),
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
      breakdown.body.poweredUp.map((tier) => [tier.stage, tier.percent]),
      MOB_ATTACK_UP_TIERS.map((tier) => [tier.stage, tier.percent])
    );

    for (const tier of breakdown.body.poweredUp) {
      assert.ok(tier.damage.max > breakdown.body.damage.max);
      // 절삭은 곱한 뒤에 한 번만 한다. 화면에 뜬 정수에 곱하면 1씩 어긋난다.
      assert.ok(
        tier.damage.max >=
          Math.trunc(breakdown.body.damage.max * tier.percent * 0.01)
      );
      // 몹 공격력에 같은 배율을 먹인 것과는 달라야 한다 (2차식 + 감면이 남는다).
      const boostedAttack = calculateHitDamageBreakdown(
        makeMonster({
          physicalAttack: monster.physicalAttack * (tier.percent / 100),
        }),
        stats
      );
      assert.notEqual(tier.damage.max, boostedAttack.body.damage.max);
    }
  });

  it('하한에 눌린 데미지는 공격업이 걸려도 1이다', () => {
    const breakdown = calculateHitDamageBreakdown(
      makeMonster(),
      makeStats({ physicalDefense: 1999 })
    );

    assert.ok(breakdown.body.atMinimum);
    for (const tier of breakdown.body.poweredUp) {
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

    assert.ok(next.body.damage.max < here.body.damage.max);
    assert.ok(next.magic!.damage.max < here.magic!.damage.max);
    // 마법은 방어력 1당 정확히 0.25씩 깎인다 (감면 계수가 그대로 곱해진다).
    assert.ok(Math.abs(here.magic!.reducePerDefense - 0.25) < 1e-9);
    assert.ok(here.body.reducePerDefense > 0);
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

    assert.deepEqual(beyond.body.damage, capped.body.damage);
    assert.deepEqual(beyond.magic!.damage, capped.magic!.damage);
  });

  it('물리 공격이 여럿이면 각각 한 줄씩 나온다', () => {
    const monster = makeMonster({ physicalAttackPowers: [700, 755] });
    const stats = makeStats();
    const breakdown = calculateHitDamageBreakdown(monster, stats);
    const bodyOnly = calculateHitDamageBreakdown(makeMonster(), stats);

    assert.equal(breakdown.attacks.length, 2);
    // 몸박 줄은 공격이 뭐가 있든 그대로다.
    assert.deepEqual(breakdown.body.damage, bodyOnly.body.damage);
    // 약한 순으로 나오고 전부 몸박보다 세다. 공격업도 각자 값을 따라간다.
    assert.ok(breakdown.body.damage.max < breakdown.attacks[0].damage.max);
    assert.ok(
      breakdown.attacks[0].damage.max < breakdown.attacks[1].damage.max
    );
    assert.ok(
      breakdown.attacks[0].poweredUp[0].damage.max <
        breakdown.attacks[1].poweredUp[0].damage.max
    );
    // 방어력 1당 감소폭은 공격력과 무관해서 모든 줄이 같다 (한 번만 적는 근거).
    // 큰 값끼리 빼서 만든 차이라 부동소수점 끝자리만 갈린다.
    for (const entry of breakdown.attacks) {
      assert.ok(
        Math.abs(entry.reducePerDefense - breakdown.body.reducePerDefense) <
          1e-6
      );
    }
  });

  it('몸박보다 세지 않은 공격은 줄을 만들지 않는다', () => {
    const breakdown = calculateHitDamageBreakdown(makeMonster(), makeStats());
    assert.deepEqual(breakdown.attacks, []);

    // 공격별 공격력이 몸박보다 낮게 적힌 몹도 원작이 max를 쓰므로 몸박과 같아진다.
    const weaker = calculateHitDamageBreakdown(
      makeMonster({ physicalAttackPowers: [100] }),
      makeStats()
    );
    assert.deepEqual(weaker.attacks, []);
    assert.deepEqual(weaker.body.damage, breakdown.body.damage);
  });

  it('공격업은 정해진 데미지를 그 비율만큼 올린다', () => {
    // 화면 각주가 "정해진 데미지를 1단계 +15% · 2단계 +30% 올린다"라고 적는 근거다.
    // 원작이 방어력 감면과 감소 버프를 전부 끝낸 뒤 맨 마지막에 곱하기 때문에,
    // 절삭 오차 1을 빼면 완성된 데미지에 그 비율을 곱한 값과 같다.
    const breakdown = calculateHitDamageBreakdown(
      makeMonster({ physicalAttackPowers: [755] }),
      makeStats()
    );

    for (const entry of [
      breakdown.body,
      ...breakdown.attacks,
      breakdown.magic!,
    ]) {
      for (const tier of entry.poweredUp) {
        const expected = entry.damage.max * (tier.percent / 100);
        assert.ok(
          Math.abs(tier.damage.max - expected) <= 1,
          `공격업 ${tier.stage}단계가 ${expected}에서 1을 넘게 벗어났다`
        );
      }
    }
  });

  it('망각의 수호대장 실측 제보 케이스', () => {
    // 프리셋 8200012: 몸박 645 / 물리 공격 700 · 755 / 마공 725.
    // 마법 최대(3,995)보다 큰 4,000~4,100을 맞았다는 제보가 있었고,
    // 그 값은 마법이 아니라 attack2(755) 물리 범위 안이다.
    const monster = makeMonster({
      level: 131,
      hp: 141000,
      physicalDefense: 1060,
      magicalDefense: 680,
      avoid: 47,
      accuracy: 230,
      physicalAttack: 645,
      physicalAttackPowers: [700, 755],
      magicAttack: 725,
      hasMagicAttack: true,
    });
    const stats = makeStats({
      level: 194,
      str: 4,
      dex: 37,
      luk: 955,
      additionalStr: 56,
      additionalDex: 129,
      additionalLuk: 273,
      additionalInt: 52,
      physicalDefense: 672,
      magicalDefense: 556,
    });
    const breakdown = calculateHitDamageBreakdown(monster, stats);

    assert.deepEqual(breakdown.body.damage, { min: 2613, max: 2821 });
    assert.deepEqual(breakdown.attacks[0].damage, { min: 3204, max: 3449 });
    assert.deepEqual(breakdown.attacks[1].damage, { min: 3845, max: 4130 });
    assert.deepEqual(breakdown.magic!.damage, { min: 3732, max: 3995 });
  });

  it('방어력이 아주 높으면 하한 1에서 멈춘다', () => {
    // 마법 감면은 방어력 1당 0.25뿐이라, 하한에 닿으려면 몹 마공이 낮아야 한다.
    const breakdown = calculateHitDamageBreakdown(
      makeMonster({ magicAttack: 50 }),
      makeStats({ physicalDefense: 1999, magicalDefense: 1999 })
    );

    assert.deepEqual(breakdown.body.damage, {
      min: MIN_HIT_DAMAGE,
      max: MIN_HIT_DAMAGE,
    });
    assert.deepEqual(breakdown.magic!.damage, {
      min: MIN_HIT_DAMAGE,
      max: MIN_HIT_DAMAGE,
    });
    assert.ok(breakdown.body.atMinimum);
    assert.ok(breakdown.magic!.atMinimum);
  });

  it('INT는 물리 피격 데미지만 움직인다', () => {
    const monster = makeMonster();
    const withoutInt = calculateHitDamageBreakdown(monster, makeStats());
    const withInt = calculateHitDamageBreakdown(
      monster,
      makeStats({ additionalInt: 100 })
    );

    assert.ok(withInt.body.damage.max < withoutInt.body.damage.max);
    assert.deepEqual(withInt.magic!.damage, withoutInt.magic!.damage);
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
    assert.ok(higherMonster.body.damage.max > sameLevel.body.damage.max);
  });
});

describe('몬스터 프리셋의 몹 스킬', () => {
  it('스킬 목록은 정리된 ID만 담는다', () => {
    for (const preset of monsterPresets) {
      for (const skill of preset.mobSkills ?? []) {
        assert.ok(
          MOB_SKILLS[skill.id] !== undefined,
          `${preset.name}의 스킬 ${skill.id}가 mobSkills.ts에 없다`
        );
      }
    }
  });

  it('수치가 있는 스킬만 x를 갖는다', () => {
    // x를 못 읽는 스킬에 값을 넣어 두면 칩에 근거 없는 숫자가 붙는다.
    for (const preset of monsterPresets) {
      for (const skill of preset.mobSkills ?? []) {
        if (skill.x === undefined) continue;
        assert.ok(
          MOB_SKILLS[skill.id].value !== undefined,
          `${preset.name}의 스킬 ${skill.id}에 뜻 없는 x가 들어 있다`
        );
      }
    }
  });

  it('소환 대상의 이름은 프리셋 이름과 같다', () => {
    // 화면 두 곳(드롭다운과 소환 줄)이 같은 몹을 다른 이름으로 부르면 안 되고,
    // 이름을 눌러 넘어간 뒤 이름이 바뀌면 잘못 눌렀다고 읽는다.
    const byId = new Map(monsterPresets.map((preset) => [preset.id, preset]));
    let linkable = 0;

    for (const preset of monsterPresets) {
      for (const skill of preset.mobSkills ?? []) {
        for (const target of skill.summons ?? []) {
          const found = byId.get(target.id);
          if (!found) continue;
          linkable += 1;
          assert.equal(
            target.name,
            found.name,
            `${preset.name}이 부르는 ${target.id}의 이름이 프리셋과 다르다`
          );
        }
      }
    }

    // 대부분의 소환 대상은 프리셋에 있다. 하나도 없으면 ID 형식이 어긋난 것이다.
    assert.ok(linkable > 0);
  });

  it('소환 목록은 소환 스킬에만 붙는다', () => {
    const SUMMON = 200;
    for (const preset of monsterPresets) {
      for (const skill of preset.mobSkills ?? []) {
        if (skill.summons === undefined) continue;
        assert.equal(
          skill.id,
          SUMMON,
          `${preset.name}의 스킬 ${skill.id}에 소환 목록이 붙어 있다`
        );
        assert.ok(skill.summons.length > 0);
        assert.ok(
          skill.summons.every(
            (target) =>
              /^\d+$/.test(target.id) &&
              target.name.length > 0 &&
              target.count >= 1
          ),
          `${preset.name}의 소환 목록에 빈 값이 있다`
        );
      }
    }
  });

  it('공격업 칩 수치가 피격 데미지 표의 단계와 같은 값을 가리킨다', () => {
    // 칩은 +15%, 표는 x1.15로 같은 배율을 쓴다. 둘이 갈리면 화면끼리 어긋난다.
    const powerUp = MOB_SKILLS[110];
    for (const tier of MOB_ATTACK_UP_TIERS) {
      assert.equal(powerUp.value?.(tier.percent), `+${tier.percent - 100}%`);
    }
  });
});

describe('마법 공격이 없는 몹', () => {
  const asMonster = (preset: (typeof monsterPresets)[number]): Monster => ({
    ...preset,
    // 프리셋은 마법 공격 유무를 다 알고 있다 — 값이 없으면 "없다"는 뜻이다.
    hasMagicAttack: preset.hasMagicAttack ?? false,
  });

  it('마법 공격력이 있어도 마법 피격 데미지를 만들지 않는다', () => {
    const stats = makeStats();
    const suppressed = monsterPresets.filter(
      (preset) => preset.magicAttack > 0 && preset.hasMagicAttack !== true
    );

    // 예전에는 프리셋에 값이 없으면 "모른다"로 보고 그려서, 이 몹들에 실제로는
    // 들어올 수 없는 마법 데미지가 화면에 떴다 (파풀라투스 등 73종).
    assert.ok(suppressed.length > 0);
    for (const preset of suppressed) {
      const breakdown = calculateHitDamageBreakdown(asMonster(preset), stats);
      assert.equal(
        breakdown.magic,
        null,
        `${preset.name}에 마법 피격 데미지가 만들어졌다`
      );
    }
  });

  it('마법 공격이 있는 몹은 그대로 나온다', () => {
    const stats = makeStats();
    const withMagic = monsterPresets.filter(
      (preset) => preset.hasMagicAttack === true && preset.magicAttack > 0
    );

    assert.ok(withMagic.length > 0);
    for (const preset of withMagic) {
      assert.notEqual(
        calculateHitDamageBreakdown(asMonster(preset), stats).magic,
        null,
        `${preset.name}의 마법 피격 데미지가 사라졌다`
      );
    }
  });
});
