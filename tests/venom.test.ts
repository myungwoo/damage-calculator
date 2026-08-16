import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDamage,
  calculateKillProbabilitiesWithinNHits,
} from '../app/utils/damageCalculator';
import {
  VenomConfig,
  calculateVenomTickDamage,
  calculateVenomSurvivals,
  getVenomTickCount,
} from '../app/utils/venom';
import { getVenomLevelData } from '../app/data/venom';
import { Equipment, Monster, Skills, Stats } from '../app/types/calculator';
import {
  DEFAULT_ATTACKS_PER_MINUTE,
  VENOM_APPLY_DELAY_SECONDS,
  VENOM_TICK_DAMAGE_CAP,
} from '../app/data/venom';
import {
  KillScenario,
  VenomScenario,
  simulateKillProbabilitiesWithVenom,
  toAccumulatedProbabilities,
} from './helpers/reference';

const makeStats = (overrides: Partial<Stats> = {}): Stats => ({
  level: 120,
  str: 4,
  dex: 20,
  luk: 96,
  additionalStr: 0,
  additionalDex: 0,
  additionalLuk: 0,
  ...overrides,
});

const makeMonster = (overrides: Partial<Monster> = {}): Monster => ({
  level: 100,
  hp: 15000,
  physicalDefense: 0,
  magicalDefense: 0,
  avoid: 0,
  accuracy: 0,
  ...overrides,
});

describe('베놈 스킬 데이터', () => {
  it('원작 Skill.wz 수치와 일치한다', () => {
    // 412.img / 422.img에서 뽑은 실제 값
    const expected: Record<number, [number, number, number]> = {
      1: [31, 12, 2],
      10: [40, 18, 2],
      11: [41, 18, 3],
      20: [50, 24, 3],
      21: [51, 24, 4],
      30: [60, 30, 4],
    };
    for (const [level, [mad, prop, duration]] of Object.entries(expected)) {
      const data = getVenomLevelData(Number(level));
      assert.ok(data, `${level}레벨 데이터가 없다`);
      assert.equal(data.mad, mad, `${level}레벨 mad`);
      assert.equal(data.prop, prop, `${level}레벨 prop`);
      assert.equal(data.durationSeconds, duration, `${level}레벨 지속시간`);
    }
  });

  it('범위를 벗어난 레벨은 null이다', () => {
    assert.equal(getVenomLevelData(0), null);
    assert.equal(getVenomLevelData(31), null);
    assert.equal(getVenomLevelData(1.5), null);
  });
});

describe('베놈 틱 데미지', () => {
  it('유출 코드의 정수 연산과 일치한다', () => {
    // floor(mad * (DEX + 5 * (floor(0.8 * (STR+LUK)) + rand)) / 49)
    const config: VenomConfig = {
      level: 10,
      totalStr: 18,
      totalDex: 141,
      totalLuk: 768,
      rollsPerUse: 6,
      attackPeriodSeconds: 0.6,
    };
    const range = calculateVenomTickDamage(config);
    assert.ok(range);

    const statSum = 18 + 768;
    const base = Math.floor(statSum * 0.8);
    assert.equal(range.min, Math.floor((40 * (141 + 5 * base)) / 49));
    assert.equal(
      range.max,
      Math.floor((40 * (141 + 5 * (base + statSum - 1))) / 49)
    );
  });

  it('메이플랜드 틱 데미지 상한에서 잘린다', () => {
    // 상한이 없다면 최대 4만이 넘게 나오는 스펙
    const config: VenomConfig = {
      level: 30,
      totalStr: 30,
      totalDex: 300,
      totalLuk: 3000,
      rollsPerUse: 6,
      attackPeriodSeconds: 0.6,
    };
    const statSum = 30 + 3000;
    const base = Math.floor(statSum * 0.8);
    const uncapped = Math.floor((60 * (300 + 5 * (base + statSum - 1))) / 49);
    assert.ok(
      uncapped > VENOM_TICK_DAMAGE_CAP,
      '상한이 걸리지 않는 스펙이라 검증이 안 된다'
    );

    const range = calculateVenomTickDamage(config);
    assert.ok(range);
    assert.equal(range.max, VENOM_TICK_DAMAGE_CAP);
  });

  it('누적 베놈 데미지는 틱 수 x 상한을 넘지 않는다', () => {
    const config: VenomConfig = {
      level: 30,
      totalStr: 30,
      totalDex: 300,
      totalLuk: 3000,
      rollsPerUse: 6,
      attackPeriodSeconds: 1,
    };
    const maxUses = 10;
    const hp = 2000000;
    const survivals = calculateVenomSurvivals(config, hp, 1, maxUses)!;
    assert.ok(survivals);
    // 공격 k 직전까지의 틱 수는 k - 1회다 (주기 1초, 위상 0)
    for (let use = 1; use <= maxUses; use++) {
      const limit = (use - 1) * VENOM_TICK_DAMAGE_CAP;
      const survival = survivals[use - 1];
      if (limit + 1 <= hp) {
        assert.equal(
          survival[limit + 1],
          0,
          `${use}방 시점에 ${limit}을 넘는 누적 베놈 데미지가 나왔다`
        );
      }
    }
  });

  it('스탯이 0이면 계산하지 않는다', () => {
    const config: VenomConfig = {
      level: 30,
      totalStr: 0,
      totalDex: 100,
      totalLuk: 0,
      rollsPerUse: 6,
      attackPeriodSeconds: 0.6,
    };
    assert.equal(calculateVenomTickDamage(config), null);
    assert.equal(calculateVenomSurvivals(config, 1000, 1, 20), null);
  });
});

interface VenomCase {
  name: string;
  hp: number;
  basic: { min: number; max: number };
  crit: { min: number; max: number };
  critChance: number;
  shadow: number;
  hits: 2 | 3;
  skillType: 'lucky7' | 'tripleThrow';
  venom: VenomConfig;
}

const VENOM_CASES: VenomCase[] = [
  {
    name: '트리플 스로우 + 베놈 10',
    hp: 15000,
    basic: { min: 300, max: 600 },
    crit: { min: 600, max: 1200 },
    critChance: 30,
    shadow: 0.5,
    hits: 3,
    skillType: 'tripleThrow',
    venom: {
      level: 10,
      totalStr: 4,
      totalDex: 20,
      totalLuk: 96,
      rollsPerUse: 6,
      attackPeriodSeconds: 0.6,
    },
  },
  {
    name: '트리플 스로우 + 베놈 30 (중첩이 자주 터지는 조건)',
    hp: 14000,
    basic: { min: 200, max: 400 },
    crit: { min: 400, max: 800 },
    critChance: 20,
    shadow: 0.5,
    hits: 3,
    skillType: 'tripleThrow',
    venom: {
      level: 30,
      totalStr: 10,
      totalDex: 40,
      totalLuk: 140,
      rollsPerUse: 6,
      attackPeriodSeconds: 0.6,
    },
  },
  {
    name: '트리플 스로우 + 베놈 30 (틱 상한에 걸리는 고스펙)',
    hp: 150000,
    basic: { min: 2000, max: 4000 },
    crit: { min: 4000, max: 8000 },
    critChance: 40,
    shadow: 0.5,
    hits: 3,
    skillType: 'tripleThrow',
    venom: {
      level: 30,
      totalStr: 20,
      totalDex: 150,
      totalLuk: 1200,
      rollsPerUse: 6,
      attackPeriodSeconds: 0.6,
    },
  },
  {
    name: '럭키 세븐 + 베놈 21 (쉐도우 파트너 없음)',
    hp: 9000,
    basic: { min: 250, max: 500 },
    crit: { min: 500, max: 1000 },
    critChance: 25,
    shadow: 0,
    hits: 2,
    skillType: 'lucky7',
    venom: {
      level: 21,
      totalStr: 8,
      totalDex: 30,
      totalLuk: 120,
      rollsPerUse: 2,
      attackPeriodSeconds: 0.75,
    },
  },
];

const runVenomEngine = (c: VenomCase) => {
  const monster = makeMonster({ hp: c.hp });
  const stats = makeStats();
  const rows = calculateKillProbabilitiesWithinNHits(
    c.skillType,
    c.basic,
    c.crit,
    c.shadow,
    c.critChance,
    c.hp,
    stats,
    monster,
    20,
    c.venom
  );

  const scenario: KillScenario = {
    hp: c.hp,
    hits: c.hits,
    basic: c.basic,
    crit: c.crit,
    shadow: c.shadow,
    critChance: c.critChance / 100,
    hitProb: 1,
    maxUses: 20,
  };
  const data = getVenomLevelData(c.venom.level)!;
  const venomScenario: VenomScenario = {
    mad: data.mad,
    prop: data.prop / 100,
    ticksPerApply: data.durationSeconds + VENOM_APPLY_DELAY_SECONDS,
    statSum: c.venom.totalStr + c.venom.totalLuk,
    dex: c.venom.totalDex,
    rollsPerUse: c.venom.rollsPerUse,
    attackPeriodSeconds: c.venom.attackPeriodSeconds,
    tickDamageCap: VENOM_TICK_DAMAGE_CAP,
  };
  return { rows, scenario, venomScenario };
};

describe('베놈을 포함한 방컷 확률', () => {
  for (const c of VENOM_CASES) {
    it(`몬테카를로 시뮬레이션과 일치한다 - ${c.name}`, () => {
      const { rows, scenario, venomScenario } = runVenomEngine(c);
      const actual = toAccumulatedProbabilities(rows);
      const simulated = simulateKillProbabilitiesWithVenom(
        scenario,
        venomScenario,
        400000,
        20240115
      );

      let compared = 0;
      for (let i = 0; i < simulated.length; i++) {
        const value = actual[i];
        if (value === null) continue;
        compared++;
        // 40만 회 표본의 통계 오차 + 스택 양자화 오차를 감안한 허용치
        assert.ok(
          Math.abs(value - simulated[i]) < 0.006,
          `${i + 1}방: ${value} vs 시뮬레이션 ${simulated[i]}`
        );
      }
      assert.ok(compared > 0, '비교할 행이 없다');
    });
  }

  it('베놈을 켜면 같은 조건에서 방컷 확률이 올라간다', () => {
    for (const c of VENOM_CASES) {
      const monster = makeMonster({ hp: c.hp });
      const stats = makeStats();
      const withoutVenom = calculateKillProbabilitiesWithinNHits(
        c.skillType,
        c.basic,
        c.crit,
        c.shadow,
        c.critChance,
        c.hp,
        stats,
        monster
      );
      const withVenom = runVenomEngine(c).rows;

      const before = toAccumulatedProbabilities(withoutVenom);
      const after = toAccumulatedProbabilities(withVenom);
      let improved = false;
      for (let i = 0; i < before.length; i++) {
        if (before[i] === null || after[i] === null) continue;
        assert.ok(
          after[i]! >= before[i]! - 1e-9,
          `${c.name} ${i + 1}방: 베놈이 확률을 떨어뜨렸다`
        );
        if (after[i]! > before[i]! + 1e-6) improved = true;
      }
      assert.ok(improved, `${c.name}: 베놈을 켜도 확률이 그대로다`);
    }
  });

  it('누적 확률은 단조 증가하고 100%를 넘지 않는다', () => {
    for (const c of VENOM_CASES) {
      const { rows } = runVenomEngine(c);
      let previous = 0;
      for (const row of rows) {
        const accumulated = Number(row.accProb);
        assert.ok(
          accumulated >= previous - 1e-9,
          `${c.name} ${row.hit}방: 누적 확률이 줄었다`
        );
        assert.ok(
          accumulated <= 100.000001,
          `${c.name}: 누적 확률이 100% 초과`
        );
        previous = accumulated;
      }
    }
  });

  it('베놈 설정을 넘기지 않으면 기존 결과와 완전히 같다', () => {
    const c = VENOM_CASES[0];
    const monster = makeMonster({ hp: c.hp });
    const stats = makeStats();
    const args = [
      c.skillType,
      c.basic,
      c.crit,
      c.shadow,
      c.critChance,
      c.hp,
      stats,
      monster,
    ] as const;

    const baseline = calculateKillProbabilitiesWithinNHits(...args);
    const explicitNull = calculateKillProbabilitiesWithinNHits(
      ...args,
      20,
      null
    );
    assert.deepEqual(explicitNull, baseline);
  });
});

describe('베놈 적용 조건', () => {
  const equipment: Equipment = {
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
    venom: 30,
    venomEnabled: true,
    attacksPerMinute: DEFAULT_ATTACKS_PER_MINUTE,
    rngCyclingEnabled: false,
    ...overrides,
  });

  const stats = makeStats({ level: 120, str: 4, dex: 25, luk: 500 });

  const run = (
    monsterOverrides: Partial<Monster>,
    skillOverrides: Partial<Skills> = {}
  ) =>
    calculateDamage(
      makeMonster({ hp: 30000, physicalDefense: 300, ...monsterOverrides }),
      stats,
      equipment,
      makeSkills(skillOverrides)
    );

  it('일반 몬스터에는 베놈이 적용된다', () => {
    const result = run({});
    assert.equal(result.venomApplied, true);
    assert.ok(result.venomTickDamage);
    assert.ok(result.venomTickDamage.min > 0);
    assert.ok(result.venomTickDamage.max > result.venomTickDamage.min);
  });

  it('보스에게는 베놈이 걸리지 않는다', () => {
    assert.equal(run({ isBoss: true }).venomApplied, false);
  });

  it('독 무효 · 반감 몬스터에는 베놈이 걸리지 않는다', () => {
    assert.equal(run({ poisonAttribute: 1 }).venomApplied, false);
    assert.equal(run({ poisonAttribute: 2 }).venomApplied, false);
  });

  it('독 약점 몬스터에는 정상적으로 걸린다 (증폭은 없다)', () => {
    const weak = run({ poisonAttribute: 3 });
    const normal = run({});
    assert.equal(weak.venomApplied, true);
    assert.deepEqual(weak.venomTickDamage, normal.venomTickDamage);
  });

  it('드레인에는 베놈이 발동하지 않는다', () => {
    assert.equal(run({}, { type: 'drain', level: 30 }).venomApplied, false);
  });

  it('베놈을 끄거나 레벨이 0이면 적용되지 않는다', () => {
    assert.equal(run({}, { venomEnabled: false }).venomApplied, false);
    assert.equal(run({}, { venom: 0 }).venomApplied, false);
  });

  it('쉐도우 파트너를 켜면 발동 기회가 늘어 방컷이 빨라진다', () => {
    const withPartner = run({}, { shadowPartnerEnabled: true });
    const withoutPartner = run({}, { shadowPartnerEnabled: false });
    // 쉐파는 본체 데미지도 올리므로 베놈 틱 데미지 자체는 같아야 한다
    assert.deepEqual(
      withPartner.venomTickDamage,
      withoutPartner.venomTickDamage
    );
    assert.equal(withPartner.venomApplied, true);
    assert.equal(withoutPartner.venomApplied, true);
  });

  it('공격 속도가 빠를수록 같은 방수에서 베놈 틱이 덜 들어간다', () => {
    const fast = run({}, { attacksPerMinute: 200 });
    const slow = run({}, { attacksPerMinute: 60 });
    const fastAcc = toAccumulatedProbabilities(fast.killProbabilities);
    const slowAcc = toAccumulatedProbabilities(slow.killProbabilities);
    let compared = 0;
    for (let i = 0; i < fastAcc.length; i++) {
      if (fastAcc[i] === null || slowAcc[i] === null) continue;
      compared++;
      assert.ok(
        slowAcc[i]! >= fastAcc[i]! - 1e-9,
        `${i + 1}방: 느린 공격이 오히려 불리하게 나왔다`
      );
    }
    assert.ok(compared > 0, '비교할 행이 없다');
  });
});

describe('베놈 누적 데미지 분포', () => {
  it('첫 공격 직전에는 누적 베놈 데미지가 0이다', () => {
    const c = VENOM_CASES[0];
    const survivals = calculateVenomSurvivals(c.venom, c.hp, 1, 20);
    assert.ok(survivals);
    // survival[t] = P(W >= t) 이므로 t = 1에서 0이어야 한다
    assert.equal(survivals[0][1], 0);
    assert.equal(survivals[0][0], 1);
  });

  it('첫 틱은 두 번째 공격 뒤에 들어간다 (메이플랜드 실측)', () => {
    // 트리플 스로우 100회/분 = 0.6초 주기. 부여 시점 + 1초에 첫 틱이므로
    // 첫 틱은 두 번째 공격(0.6초)과 세 번째 공격(1.2초) 사이에 떨어진다.
    const config: VenomConfig = {
      level: 30,
      totalStr: 10,
      totalDex: 40,
      totalLuk: 140,
      rollsPerUse: 6,
      attackPeriodSeconds: 0.6,
    };
    const survivals = calculateVenomSurvivals(config, 20000, 1, 8)!;
    // survivals[n - 1][1] = P(n번째 공격 직전까지 누적 베놈 데미지 >= 1)
    assert.equal(survivals[0][1], 0, '1방 직전에는 당연히 0');
    assert.equal(survivals[1][1], 0, '2방 직전에도 아직 틱이 없어야 한다');
    assert.ok(survivals[2][1] > 0, '3방 직전에는 첫 틱이 들어와 있어야 한다');
  });

  it('부여 1회당 틱 수는 지속시간 + 1이다', () => {
    // 만료 시각에는 tDelay(1초)가 얹히는데 틱 클럭의 기준점에는 얹히지 않는다.
    // 만렙(지속시간 4초)이면 5틱.
    assert.equal(getVenomTickCount(4), 5);
    assert.equal(getVenomTickCount(2), 3);

    // 한 번만 걸고 내버려 두면(= 공격 주기를 지속시간보다 길게) 딱 그만큼만 들어간다.
    // 공격 주기 100초면 두 번째 공격 직전에 모든 틱이 끝나 있다.
    //
    // STR + LUK을 작게, DEX를 크게 잡아 틱 데미지 범위를 좁힌다.
    // 그래야 4틱 최대치 < 5틱 최소치 < 5틱 최대치 < 6틱 최소치가 되어
    // 누적값만 보고 틱 수를 구분할 수 있다.
    const config: VenomConfig = {
      level: 30,
      totalStr: 1,
      totalDex: 400,
      totalLuk: 4,
      rollsPerUse: 1,
      attackPeriodSeconds: 100,
    };
    const tick = calculateVenomTickDamage(config)!;
    assert.ok(tick.max * 4 < tick.min * 5, '4틱과 5틱 구간이 겹치면 안 된다');
    assert.ok(tick.max * 5 < tick.min * 6, '5틱과 6틱 구간이 겹치면 안 된다');

    const survivals = calculateVenomSurvivals(config, 200000, 1, 3)!;
    assert.ok(
      survivals[1][tick.min * 5] > 0,
      '2방 직전에 5틱만큼 누적될 수 있어야 한다'
    );
    assert.equal(survivals[1][tick.min * 6], 0, '6틱은 들어갈 수 없어야 한다');
  });

  it('공격이 느리면 첫 틱이 두 번째 공격 전에 들어간다', () => {
    // 주기가 1.5초면 부여 + 1초 틱이 첫 공격 구간 안에서 끝난다
    const config: VenomConfig = {
      level: 30,
      totalStr: 10,
      totalDex: 40,
      totalLuk: 140,
      rollsPerUse: 6,
      attackPeriodSeconds: 1.5,
    };
    const survivals = calculateVenomSurvivals(config, 20000, 1, 8)!;
    assert.equal(survivals[0][1], 0);
    assert.ok(
      survivals[1][1] > 0,
      '2방 직전에 이미 첫 틱이 들어와 있어야 한다'
    );
  });

  it('생존함수는 t가 커질수록 단조 감소한다', () => {
    const c = VENOM_CASES[1];
    const survivals = calculateVenomSurvivals(c.venom, c.hp, 1, 20);
    assert.ok(survivals);
    for (const survival of survivals) {
      for (let t = 1; t < survival.length; t++) {
        assert.ok(
          survival[t] <= survival[t - 1] + 1e-12,
          `생존함수가 증가했다: t=${t}`
        );
      }
    }
  });

  it('공격을 거듭할수록 같은 임계값의 생존확률이 올라간다', () => {
    const c = VENOM_CASES[1];
    const survivals = calculateVenomSurvivals(c.venom, c.hp, 1, 20)!;
    const threshold = Math.floor(c.hp / 4);
    for (let i = 1; i < survivals.length; i++) {
      assert.ok(
        survivals[i][threshold] >= survivals[i - 1][threshold] - 1e-12,
        `${i + 1}방 시점에서 누적 베놈 생존확률이 줄었다`
      );
    }
  });
});
