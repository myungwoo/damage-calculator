import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DamageRangeInput,
  MAX_DAMAGE_PER_LINE,
  calculateDamage,
  calculateKnockbackProbability,
} from '../app/utils/damageCalculator';
import { Equipment, Monster, Skills, Stats } from '../app/types/calculator';
import { DEFAULT_ATTACKS_PER_MINUTE } from '../app/data/venom';
import { getSkillEffect } from '../app/data/skillEffects';
import { isCriticalThrowEffect } from '../app/types/calculator';
import {
  KillScenario,
  simulateKnockbackProbability,
} from './helpers/reference';

/**
 * 넉백 확률은 "시전 1회에 타격 하나라도 넉백 수치를 넘길 확률"이다.
 * 방컷 확률과 달리 누적이 없어 시전 1회 안에서 끝나지만, 난수 순환이 걸리면
 * 라인끼리 독립이 아니라서 그 결합을 같은 분해로 태워야 한다.
 */

interface Case {
  name: string;
  scenario: KillScenario;
  threshold: number;
}

/** 시나리오를 배포 코드가 받는 입력 두 벌로 옮긴다. */
const toInputs = (
  s: KillScenario
): { basic: DamageRangeInput; critical: DamageRangeInput } => ({
  basic: s.basic,
  critical: s.crit,
});

const run = (c: Case): number => {
  const { basic, critical } = toInputs(c.scenario);
  return calculateKnockbackProbability(
    basic,
    critical,
    c.threshold,
    c.scenario.critChance,
    c.scenario.hitProb,
    c.scenario.hits,
    c.scenario.rngCycling === true && c.scenario.hits === 3
  );
};

const TRIALS = 400000;

const cases: Case[] = [
  {
    name: '럭키 세븐 2타',
    threshold: 700,
    scenario: {
      hp: 100000,
      hits: 2,
      basic: { min: 300, max: 900, defenseBand: 60, skillMultiplier: 1.4 },
      crit: {
        min: 300,
        max: 900,
        defenseBand: 60,
        skillMultiplier: 1.4,
        criticalAdd: 1,
      },
      shadow: 0.5,
      critChance: 0.4,
      hitProb: 1,
    },
  },
  {
    name: '트리플 스로우 3타 (난수 순환 없음)',
    threshold: 2400,
    scenario: {
      hp: 100000,
      hits: 3,
      basic: { min: 900, max: 2000, defenseBand: 120, skillMultiplier: 1.5 },
      crit: {
        min: 900,
        max: 2000,
        defenseBand: 120,
        skillMultiplier: 1.5,
        criticalAdd: 1,
      },
      shadow: 0.5,
      critChance: 0.5,
      hitProb: 1,
    },
  },
  {
    name: '트리플 스로우 3타 (난수 순환)',
    threshold: 2400,
    scenario: {
      hp: 100000,
      hits: 3,
      basic: { min: 900, max: 2000, defenseBand: 120, skillMultiplier: 1.5 },
      crit: {
        min: 900,
        max: 2000,
        defenseBand: 120,
        skillMultiplier: 1.5,
        criticalAdd: 1,
      },
      shadow: 0.5,
      critChance: 0.5,
      hitProb: 1,
      rngCycling: true,
    },
  },
  {
    name: '난수 순환 + 크리티컬만 넘기는 수치',
    // 일반 라인은 절대 못 넘고 크리티컬 라인만 넘길 수 있는 구간이라
    // 라인 B의 데미지 난수가 라인 C의 크리티컬을 정하는 결합이 가장 크게 드러난다.
    threshold: 3300,
    scenario: {
      hp: 100000,
      hits: 3,
      basic: { min: 900, max: 2000, defenseBand: 120, skillMultiplier: 1.5 },
      crit: {
        min: 900,
        max: 2000,
        defenseBand: 120,
        skillMultiplier: 1.5,
        criticalAdd: 1,
      },
      shadow: 0.5,
      critChance: 0.5,
      hitProb: 1,
      rngCycling: true,
    },
  },
  {
    name: '명중률이 100% 미만',
    threshold: 2400,
    scenario: {
      hp: 100000,
      hits: 3,
      basic: { min: 900, max: 2000, defenseBand: 120, skillMultiplier: 1.5 },
      crit: {
        min: 900,
        max: 2000,
        defenseBand: 120,
        skillMultiplier: 1.5,
        criticalAdd: 1,
      },
      shadow: 0.5,
      critChance: 0.5,
      hitProb: 0.7,
      rngCycling: true,
    },
  },
  {
    name: '방어력에 눌려 하한 1에 뭉치는 구간',
    threshold: 30,
    scenario: {
      hp: 100000,
      hits: 3,
      basic: { min: -40, max: 30, defenseBand: 40, skillMultiplier: 1.5 },
      crit: {
        min: -40,
        max: 30,
        defenseBand: 40,
        skillMultiplier: 1.5,
        criticalAdd: 1,
      },
      shadow: 0.5,
      critChance: 0.3,
      hitProb: 1,
    },
  },
  {
    name: '어벤져 1타',
    threshold: 5000,
    scenario: {
      hp: 100000,
      hits: 1,
      basic: { min: 2000, max: 5000, defenseBand: 300, skillMultiplier: 2.1 },
      crit: {
        min: 2000,
        max: 5000,
        defenseBand: 300,
        skillMultiplier: 2.1,
        criticalAdd: 1,
      },
      shadow: 0,
      critChance: 0.2,
      hitProb: 1,
    },
  },
];

describe('calculateKnockbackProbability', () => {
  for (const c of cases) {
    it(`몬테카를로 시뮬레이션과 일치한다 - ${c.name}`, () => {
      const expected = simulateKnockbackProbability(
        c.scenario,
        c.threshold,
        TRIALS,
        20260818
      );
      const actual = run(c);
      assert.ok(
        Math.abs(actual - expected) < 0.005,
        `${c.name}: 계산 ${(actual * 100).toFixed(2)}% vs 시뮬 ${(
          expected * 100
        ).toFixed(2)}%`
      );
    });
  }

  it('넉백 수치가 1 이하면 명중한 타격이 전부 밀어낸다', () => {
    const scenario = cases[1].scenario;
    for (const threshold of [0, 1]) {
      assert.equal(run({ ...cases[1], threshold }), 1);
    }
    // 빗나간 타격에는 데미지 라인이 없으므로 넉백도 없다.
    const missing = { ...cases[1], threshold: 1 };
    missing.scenario = { ...scenario, hitProb: 0.5 };
    assert.ok(Math.abs(run(missing) - (1 - 0.5 ** 3)) < 1e-12);
  });

  it('라인 상한을 넘는 수치는 어떤 난수로도 못 넘긴다', () => {
    assert.equal(run({ ...cases[1], threshold: MAX_DAMAGE_PER_LINE + 1 }), 0);
  });

  it('넉백 수치가 높을수록 확률이 단조 감소한다', () => {
    let previous = 1.0000001;
    for (let threshold = 0; threshold <= 4000; threshold += 100) {
      const probability = run({ ...cases[2], threshold });
      assert.ok(
        probability <= previous + 1e-12,
        `수치 ${threshold}에서 올라갔다: ${probability} > ${previous}`
      );
      previous = probability;
    }
  });

  it('난수 순환을 켜면 결과가 달라진다', () => {
    // 라인 B의 데미지 난수가 라인 C의 크리티컬을 정하므로
    // "셋 다 못 넘길" 확률이 독립 가정과 같을 이유가 없다.
    const coupled = run(cases[3]);
    const independent = calculateKnockbackProbability(
      cases[3].scenario.basic,
      cases[3].scenario.crit,
      cases[3].threshold,
      cases[3].scenario.critChance,
      cases[3].scenario.hitProb,
      3,
      false
    );
    assert.ok(
      Math.abs(coupled - independent) > 0.001,
      `결합 ${coupled} vs 독립 ${independent}`
    );
  });

  it('쉐도우 파트너는 넉백 확률을 바꾸지 않는다', () => {
    // 파트너 라인은 본체의 확정 데미지에 1보다 작은 비율을 곱해 내림한 값이라
    // 항상 본체 이하다. 본체가 못 넘긴 넉백을 파트너가 넘기는 경우는 없다.
    const withPartner = simulateKnockbackProbability(
      cases[1].scenario,
      cases[1].threshold,
      TRIALS,
      777
    );
    const withoutPartner = simulateKnockbackProbability(
      { ...cases[1].scenario, shadow: 0 },
      cases[1].threshold,
      TRIALS,
      777
    );
    assert.equal(withPartner, withoutPartner);
  });
});

const makeStats = (overrides: Partial<Stats> = {}): Stats => ({
  level: 120,
  str: 4,
  dex: 25,
  luk: 400,
  additionalStr: 0,
  additionalDex: 0,
  additionalLuk: 0,
  additionalInt: 0,
  hitRatio: 99999,
  ...overrides,
});

const makeMonster = (overrides: Partial<Monster> = {}): Monster => ({
  level: 120,
  hp: 100000,
  physicalDefense: 300,
  magicalDefense: 0,
  avoid: 0,
  accuracy: 0,
  physicalAttack: 0,
  magicAttack: 0,
  ...overrides,
});

const EQUIPMENT: Equipment = {
  weaponAttack: 100,
  selectedWeaponId: 'balanced-fury',
  gloveAttack: 30,
  otherAttack: 20,
  buff: 0,
};

const makeSkills = (overrides: Partial<Skills> = {}): Skills => ({
  type: 'tripleThrow',
  level: 30,
  criticalThrow: 30,
  javelin: 20,
  shadowPartner: 30,
  shadowPartnerEnabled: true,
  mapleWarrior: 0,
  mapleWarriorEnabled: false,
  sharpEyes: 0,
  sharpEyesEnabled: false,
  venom: 0,
  venomEnabled: false,
  shadowShifter: 0,
  shadowShifterEnabled: false,
  attacksPerMinute: DEFAULT_ATTACKS_PER_MINUTE,
  rngCyclingEnabled: true,
  ...overrides,
});

describe('calculateDamage의 넉백 확률', () => {
  it('넉백 수치를 모르는 몬스터에서는 계산하지 않는다', () => {
    const result = calculateDamage(
      makeMonster(),
      makeStats(),
      EQUIPMENT,
      makeSkills()
    );
    assert.equal(result.knockbackProbability, null);
  });

  it('이동 능력이 없는 몹은 수치를 넘겨도 0%다', () => {
    const monster = makeMonster({ minimumPushDamage: 1 });
    const movable = calculateDamage(
      monster,
      makeStats(),
      EQUIPMENT,
      makeSkills()
    );
    assert.equal(movable.knockbackProbability, 1);

    const fixed = calculateDamage(
      { ...monster, cannotMove: true },
      makeStats(),
      EQUIPMENT,
      makeSkills()
    );
    assert.equal(fixed.knockbackProbability, 0);
  });

  it('총 데미지 범위가 아니라 라인 하나로 판정한다', () => {
    const stats = makeStats();
    const skills = makeSkills();
    const base = calculateDamage(
      makeMonster({ minimumPushDamage: 1 }),
      stats,
      EQUIPMENT,
      skills
    );
    // 합계로 판정한다면 총 데미지 최솟값 아래는 전부 100%여야 하지만,
    // 라인 하나로 보면 그 사이에 못 넘기는 구간이 있다.
    const threshold = Math.floor(base.totalDamageRange.min * 0.8);
    const result = calculateDamage(
      makeMonster({ minimumPushDamage: threshold }),
      stats,
      EQUIPMENT,
      skills
    );
    assert.ok(
      (result.knockbackProbability ?? 1) < 1,
      `총 데미지 최솟값 ${base.totalDamageRange.min}의 80%(${threshold})에서도 100%가 나왔다`
    );
  });

  it('크리티컬 라인만 넘길 수 있는 수치에서는 확률이 크리티컬 확률에 매인다', () => {
    const stats = makeStats();
    const skills = makeSkills({ rngCyclingEnabled: false });
    const monster = makeMonster({ minimumPushDamage: 1 });
    const damage = calculateDamage(monster, stats, EQUIPMENT, skills);
    // 일반 라인 최댓값과 크리티컬 라인 최댓값 사이의 수치
    const threshold = damage.basic.max + 1;
    const result = calculateDamage(
      { ...monster, minimumPushDamage: threshold },
      stats,
      EQUIPMENT,
      skills
    );
    const probability = result.knockbackProbability ?? 0;
    const criticalSkill = getSkillEffect('criticalThrow', skills.criticalThrow);
    const criticalProb = isCriticalThrowEffect(criticalSkill!)
      ? criticalSkill.criticalChance / 100
      : 0;
    // 세 타격 중 하나라도 크리티컬이면서 충분히 높아야 하므로
    // "한 타격이라도 크리티컬일 확률"을 넘을 수 없다.
    assert.ok(probability > 0);
    assert.ok(probability <= 1 - (1 - criticalProb) ** 3 + 1e-12);
  });
});
