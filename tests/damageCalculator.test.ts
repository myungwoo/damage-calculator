import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDamage,
  calculateHitProbability,
  calculateKillProbabilitiesWithinNHits,
  calculateRequiredHitRatio,
  MAX_DAMAGE_PER_LINE,
  MAX_HP_RESOLUTION,
  MIN_DAMAGE_PER_LINE,
  damageLineValue,
  trapezoidCdf,
} from '../app/utils/damageCalculator';
import { Equipment, Monster, Skills, Stats } from '../app/types/calculator';
import { DEFAULT_ATTACKS_PER_MINUTE } from '../app/data/venom';
import {
  KillScenario,
  referenceKillProbabilities,
  createRandom,
  simulateKillProbabilities,
  toAccumulatedProbabilities,
} from './helpers/reference';

const HIT_COUNT: Record<string, number> = {
  lucky7: 2,
  tripleThrow: 3,
  avenger: 1,
  drain: 1,
};

const makeStats = (overrides: Partial<Stats> = {}): Stats => ({
  level: 120,
  str: 4,
  dex: 25,
  luk: 400,
  additionalStr: 0,
  additionalDex: 0,
  additionalLuk: 0,
  hitRatio: 99999,
  ...overrides,
});

const makeMonster = (overrides: Partial<Monster> = {}): Monster => ({
  level: 120,
  hp: 1000,
  physicalDefense: 0,
  magicalDefense: 0,
  avoid: 0,
  accuracy: 0,
  ...overrides,
});

interface EngineCase {
  name: string;
  skillType: 'lucky7' | 'tripleThrow' | 'avenger' | 'drain';
  hp: number;
  basic: { min: number; max: number };
  crit: { min: number; max: number };
  shadow: number;
  /** 크리티컬 확률 (%) */
  criticalChance: number;
  monsterLevel?: number;
  monsterAvoid?: number;
  hitRatio?: number;
}

const ENGINE_CASES: EngineCase[] = [
  {
    name: '럭키 세븐 + 쉐도우 파트너',
    skillType: 'lucky7',
    hp: 400,
    basic: { min: 90, max: 180 },
    crit: { min: 150, max: 300 },
    shadow: 0.5,
    criticalChance: 50,
  },
  {
    name: '럭키 세븐, 쉐도우 파트너 없음 + 명중 부족',
    skillType: 'lucky7',
    hp: 300,
    basic: { min: 40, max: 80 },
    crit: { min: 66, max: 133 },
    shadow: 0,
    criticalChance: 50,
    monsterLevel: 140,
    monsterAvoid: 25,
    hitRatio: 120,
  },
  {
    name: '트리플 스로우',
    skillType: 'tripleThrow',
    hp: 500,
    basic: { min: 50, max: 100 },
    crit: { min: 83, max: 166 },
    shadow: 0.5,
    criticalChance: 50,
  },
  {
    name: '어벤져',
    skillType: 'avenger',
    hp: 350,
    basic: { min: 120, max: 200 },
    crit: { min: 200, max: 333 },
    shadow: 0.5,
    criticalChance: 40,
  },
  {
    name: '데미지 범위가 HP를 넘는 경우',
    skillType: 'avenger',
    hp: 120,
    basic: { min: 50, max: 300 },
    crit: { min: 80, max: 500 },
    shadow: 0.5,
    criticalChance: 30,
  },
];

const runEngine = (c: EngineCase) => {
  const stats = makeStats({ hitRatio: c.hitRatio });
  const monster = makeMonster({
    hp: c.hp,
    level: c.monsterLevel ?? 120,
    avoid: c.monsterAvoid ?? 0,
  });
  return {
    rows: calculateKillProbabilitiesWithinNHits(
      c.skillType,
      { ...c.basic },
      { ...c.crit },
      c.shadow,
      c.criticalChance,
      c.hp,
      stats,
      monster
    ),
    scenario: {
      hp: c.hp,
      hits: HIT_COUNT[c.skillType],
      basic: c.basic,
      crit: c.crit,
      shadow: c.shadow,
      critChance: c.criticalChance / 100,
      hitProb: calculateHitProbability(
        c.hitRatio,
        c.monsterLevel ?? 120,
        stats.level,
        c.monsterAvoid ?? 0
      ),
    } satisfies KillScenario,
  };
};

describe('calculateKillProbabilitiesWithinNHits', () => {
  for (const c of ENGINE_CASES) {
    it(`참조 DP와 일치한다 - ${c.name}`, () => {
      const { rows, scenario } = runEngine(c);
      const actual = toAccumulatedProbabilities(rows);
      const expected = referenceKillProbabilities(scenario);

      let compared = 0;
      for (let i = 0; i < expected.length; i++) {
        const value = actual[i];
        if (value === null) continue;
        compared++;
        // 배포 코드는 소수점 둘째 자리까지만 내보내므로 표시 반올림(5e-5)만큼 여유를 둔다
        assert.ok(
          Math.abs(value - expected[i]) < 1e-4,
          `${i + 1}방: ${value} !== ${expected[i]}`
        );
      }
      assert.ok(compared > 0, '비교할 행이 없다');
    });
  }

  for (const c of ENGINE_CASES) {
    it(`몬테카를로 시뮬레이션과 일치한다 - ${c.name}`, () => {
      const { rows, scenario } = runEngine(c);
      const actual = toAccumulatedProbabilities(rows);
      const simulated = simulateKillProbabilities(scenario, 200000, 12345);

      for (let i = 0; i < simulated.length; i++) {
        const value = actual[i];
        if (value === null) continue;
        // 20만 회 표본의 통계 오차를 감안한 허용치
        assert.ok(
          Math.abs(value - simulated[i]) < 0.006,
          `${i + 1}방: ${value} vs 시뮬레이션 ${simulated[i]}`
        );
      }
    });
  }

  it('누적 확률은 단조 증가하고 100%를 넘지 않는다', () => {
    for (const c of ENGINE_CASES) {
      const { rows } = runEngine(c);
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
        assert.ok(Number(row.prob) >= 0, `${c.name}: 개별 확률이 음수`);
        previous = accumulated;
      }
    }
  });

  it('마지막 행의 누적 확률은 개별 확률의 합과 같다', () => {
    for (const c of ENGINE_CASES) {
      const { rows } = runEngine(c);
      if (rows.length === 0) continue;
      const sum = rows.reduce((acc, row) => acc + Number(row.prob), 0);
      const last = Number(rows[rows.length - 1].accProb);
      // 0.005% 미만인 행은 표시에서 빠지므로 그만큼 오차를 허용한다
      assert.ok(
        Math.abs(sum - last) < 0.1,
        `${c.name}: 합 ${sum} vs 누적 ${last}`
      );
    }
  });

  it('HP 해상도 상한을 넘으면 비례 축소해 같은 결과를 낸다', () => {
    const stats = makeStats();
    const smallHp = MAX_HP_RESOLUTION;
    const largeHp = MAX_HP_RESOLUTION * 2;

    const small = calculateKillProbabilitiesWithinNHits(
      'lucky7',
      { min: 1000, max: 2000 },
      { min: 2000, max: 3000 },
      0.5,
      50,
      smallHp,
      stats,
      makeMonster({ hp: smallHp })
    );
    const large = calculateKillProbabilitiesWithinNHits(
      'lucky7',
      { min: 2000, max: 4000 },
      { min: 4000, max: 6000 },
      0.5,
      50,
      largeHp,
      stats,
      makeMonster({ hp: largeHp })
    );

    // 축소는 눈금을 성기게 만드는 근사라 완전히 같지는 않다.
    // CLAUDE.md에 적어 둔 0.1%p 이내인지만 본다.
    assert.equal(large.length, small.length);
    for (let i = 0; i < small.length; i++) {
      assert.equal(large[i].hit, small[i].hit);
      assert.ok(
        Math.abs(Number(large[i].accProb) - Number(small[i].accProb)) < 0.1,
        `${small[i].hit}방: ${small[i].accProb} vs ${large[i].accProb}`
      );
    }
  });

  describe('경계 케이스', () => {
    const stats = makeStats();

    it('데미지가 0이면 20방 안에 잡지 못한다', () => {
      const rows = calculateKillProbabilitiesWithinNHits(
        'lucky7',
        { min: 0, max: 0 },
        { min: 0, max: 0 },
        0,
        50,
        1000,
        stats,
        makeMonster({ hp: 1000 })
      );
      assert.deepEqual(rows, []);
    });

    it('HP 1인 몬스터는 1방에 100% 잡는다', () => {
      const rows = calculateKillProbabilitiesWithinNHits(
        'lucky7',
        { min: 10, max: 20 },
        { min: 20, max: 30 },
        0.5,
        50,
        1,
        stats,
        makeMonster({ hp: 1 })
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0].hit, 1);
      assert.equal(rows[0].accProb, '100.00');
    });

    it('한 방 데미지가 HP를 크게 넘으면 1방에 100% 잡는다', () => {
      const rows = calculateKillProbabilitiesWithinNHits(
        'avenger',
        { min: 5000, max: 9000 },
        { min: 9000, max: 15000 },
        0.5,
        50,
        100,
        stats,
        makeMonster({ hp: 100 })
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0].accProb, '100.00');
    });

    it('크리티컬 0%와 100%에서도 참조 DP와 일치한다', () => {
      for (const criticalChance of [0, 100]) {
        const hp = 300;
        const rows = calculateKillProbabilitiesWithinNHits(
          'avenger',
          { min: 50, max: 100 },
          { min: 100, max: 200 },
          0,
          criticalChance,
          hp,
          stats,
          makeMonster({ hp })
        );
        const expected = referenceKillProbabilities({
          hp,
          hits: 1,
          basic: { min: 50, max: 100 },
          crit: { min: 100, max: 200 },
          shadow: 0,
          critChance: criticalChance / 100,
          hitProb: 1,
        });
        for (const row of rows) {
          assert.ok(
            Math.abs(Number(row.accProb) / 100 - expected[row.hit - 1]) < 1e-4,
            `크리 ${criticalChance}% ${row.hit}방`
          );
        }
      }
    });
  });
});

describe('사다리꼴 CDF', () => {
  /**
   * 라인 데미지는 `스탯롤 - 방어롤`이라 균등분포 둘의 차, 곧 사다리꼴이다.
   * 닫힌 식이 맞는지 유도 경로가 다른 수치적분과 대조한다.
   */
  const numericCdf = (alpha: number, beta: number, z: number): number => {
    if (alpha + beta === 0) return z > 0 ? 1 : 0;
    if (beta === 0) return Math.max(0, Math.min(1, z / alpha));
    if (alpha === 0) return Math.max(0, Math.min(1, z / beta));
    const steps = 200000;
    let acc = 0;
    for (let i = 0; i < steps; i++) {
      const y = ((i + 0.5) / steps) * beta;
      acc += Math.max(0, Math.min(1, (z - y) / alpha));
    }
    return acc / steps;
  };

  const SHAPES: [number, number][] = [
    [100, 30],
    [30, 100],
    [50, 50],
    [1000, 60],
    [123.4, 45.6],
    [500, 0],
    [0, 500],
  ];

  it('수치적분과 일치한다', () => {
    for (const [alpha, beta] of SHAPES) {
      const cdf = trapezoidCdf(alpha, beta);
      for (let k = 0; k <= 20; k++) {
        const z = ((alpha + beta) * k) / 20;
        assert.ok(
          Math.abs(cdf(z) - numericCdf(alpha, beta, z)) < 1e-9,
          `alpha=${alpha} beta=${beta} z=${z}`
        );
      }
    }
  });

  it('단조 증가하고 지지구간 밖에서 0과 1이다', () => {
    for (const [alpha, beta] of [...SHAPES, [0, 0] as [number, number]]) {
      const cdf = trapezoidCdf(alpha, beta);
      const total = alpha + beta;
      assert.equal(cdf(-1), 0, `alpha=${alpha} beta=${beta}`);
      assert.equal(cdf(total + 1), 1, `alpha=${alpha} beta=${beta}`);
      let previous = -1;
      for (let k = 0; k <= 500; k++) {
        const value = cdf((total * k) / 500);
        assert.ok(value >= previous - 1e-12, `alpha=${alpha} beta=${beta}`);
        previous = value;
      }
    }
  });

  it('스탯 롤 구간을 잘라도 전확률 공식이 성립한다', () => {
    // 난수 순환은 스탯 롤 축을 크리티컬 확률 지점에서 자른다.
    // 자른 조각을 다시 합치면 원래 분포와 정확히 같아야 한다.
    for (const [alpha, beta] of SHAPES) {
      for (const p of [0.21, 0.5, 0.67]) {
        const full = trapezoidCdf(alpha, beta);
        const low = trapezoidCdf(alpha * p, beta);
        const high = trapezoidCdf(alpha * (1 - p), beta);
        for (let k = 0; k <= 40; k++) {
          const x = ((alpha + beta) * k) / 40;
          // 조각마다 지지구간 시작점이 다르다
          const mixed = p * low(x) + (1 - p) * high(x - alpha * p);
          assert.ok(
            Math.abs(full(x) - mixed) < 1e-12,
            `alpha=${alpha} beta=${beta} p=${p} x=${x}: ${full(x)} vs ${mixed}`
          );
        }
      }
    }
  });
});

describe('크리티컬 가산항', () => {
  /**
   * 원작은 크리티컬 가산항에 스킬% 적용 전 값을 **정수화한 뒤** 곱한다.
   *   damage *= 스킬damage * 0.01
   *   damage += (critParam - 100) * 0.01 * (int)highDamage
   * 그래서 크리티컬 라인은 매끈한 직선이 아니라 계단이다.
   */
  it('유출 코드와 같은 순서로 계산한다', () => {
    // 트리플 스로우 30(1.5배) + 크리티컬 스로우 30(critParam 200 -> 가산 1.0)
    const skill = 1.5;
    const add = 1.0;
    for (const base of [3486.67, 3487.0, 3487.33, 1000.9, 0.5, 12345.678]) {
      const expected = Math.trunc(
        skill * base + add * Math.trunc(base) // (int)highDamage
      );
      assert.equal(damageLineValue(base, skill, add), expected, `base=${base}`);
    }
  });

  it('가산항이 없으면 그냥 스킬 배율을 곱한 값이다', () => {
    for (const base of [100.4, 250.9, 3487.33]) {
      assert.equal(damageLineValue(base, 1.5, 0), Math.trunc(1.5 * base));
      assert.equal(damageLineValue(base, 1, 0), Math.trunc(base));
    }
  });

  it('계단이라 닿지 않는 크리티컬 데미지 값이 생긴다', () => {
    // 스킬 1.5 + 가산 1.0이면 d 한 칸마다 값이 2.5씩 오르는데
    // 칸 안에서는 1.5밖에 못 훑어서 1.0만큼 구멍이 남는다.
    const reachable = new Set<number>();
    for (let i = 0; i <= 200000; i++) {
      const base = 1000 + i / 20000;
      reachable.add(damageLineValue(base, 1.5, 1.0));
    }
    const missing: number[] = [];
    for (let value = 2500; value <= 2520; value++) {
      if (!reachable.has(value)) missing.push(value);
    }
    assert.deepEqual(missing, [2504, 2509, 2514, 2519]);
  });

  it('크리티컬 최댓값이 배율을 그냥 곱한 값보다 낮아질 수 있다', () => {
    const stats = makeStats();
    const monster = makeMonster({ hp: 15000, physicalDefense: 300 });
    const equipment: Equipment = {
      weaponAttack: 100,
      selectedWeaponId: 'balanced-fury',
      gloveAttack: 30,
      otherAttack: 20,
      buff: 0,
    };
    const skills: Skills = {
      type: 'tripleThrow',
      level: 30,
      criticalThrow: 30,
      javelin: 20,
      shadowPartner: 30,
      shadowPartnerEnabled: true,
      mapleWarrior: 0,
      mapleWarriorEnabled: false,
      sharpEyes: 30,
      sharpEyesEnabled: false,
      venom: 0,
      venomEnabled: false,
      attacksPerMinute: DEFAULT_ATTACKS_PER_MINUTE,
      rngCyclingEnabled: false,
    };
    const result = calculateDamage(monster, stats, equipment, skills);

    // 일반:크리 = 1.5:2.5 이므로 그냥 곱하면 정확히 5/3배가 된다.
    // 계단 때문에 실제로는 그보다 크거나 같을 수 없고, 보통 1~2 낮다.
    const naive = Math.floor((result.basic.max * 5) / 3);
    assert.ok(
      result.critical.max <= naive,
      `${result.critical.max} > ${naive}`
    );
    assert.ok(
      result.critical.max >= naive - 3,
      `너무 많이 떨어졌다: ${result.critical.max} vs ${naive}`
    );
  });
});

describe('데미지 라인 클램프', () => {
  /**
   * 원작 라인은 trunc(clamp(1, 199999, 선형(난수)))라, 하한/상한에 눌리는 구간의
   * 난수가 전부 같은 값으로 뭉친다. 균등분포로 보면 그 덩어리가 구간 전체로 퍼져
   * 데미지를 과대평가한다.
   */
  const CASES = [
    {
      name: '방어력에 눌려 하한이 잘리는 구간',
      hp: 3000,
      rawBasic: { min: -420.5, max: 756.4 },
      rawCrit: { min: -180.2, max: 1260.7 },
      shadow: 0.5,
      critChance: 50,
      hits: 3,
    },
    {
      name: '크게 눌리는 구간 (하한 질량 40%)',
      hp: 1800,
      rawBasic: { min: -333.3, max: 500.9 },
      rawCrit: { min: -120.0, max: 834.8 },
      shadow: 0,
      critChance: 35,
      hits: 2,
    },
    {
      name: '눌리지 않는 구간 (기존 동작 유지)',
      hp: 4000,
      rawBasic: { min: 620.4, max: 1240.8 },
      rawCrit: { min: 1033.9, max: 2068.0 },
      shadow: 0.5,
      critChance: 50,
      hits: 3,
    },
  ];

  const skillOf = (hits: number) =>
    hits === 3 ? ('tripleThrow' as const) : ('lucky7' as const);

  const toInts = (raw: { min: number; max: number }) => ({
    min: Math.max(1, Math.min(199999, Math.floor(raw.min))),
    max: Math.max(1, Math.min(199999, Math.floor(raw.max))),
  });

  for (const c of CASES) {
    it(`참조 DP와 일치한다 - ${c.name}`, () => {
      const stats = makeStats();
      const monster = makeMonster({ hp: c.hp });
      const rows = calculateKillProbabilitiesWithinNHits(
        skillOf(c.hits),
        c.rawBasic,
        c.rawCrit,
        c.shadow,
        c.critChance,
        c.hp,
        stats,
        monster
      );
      const scenario: KillScenario = {
        hp: c.hp,
        hits: c.hits,
        basic: c.rawBasic,
        crit: c.rawCrit,
        shadow: c.shadow,
        critChance: c.critChance / 100,
        hitProb: 1,
      };
      const expected = referenceKillProbabilities(scenario);
      const actual = toAccumulatedProbabilities(rows);

      let compared = 0;
      for (let i = 0; i < expected.length; i++) {
        const value = actual[i];
        if (value === null) continue;
        compared++;
        assert.ok(
          Math.abs(value - expected[i]) < 0.0001,
          `${i + 1}방: ${value} vs 참조 ${expected[i]}`
        );
      }
      assert.ok(compared > 0, '비교할 행이 없다');
    });
  }

  it('본체가 1이면 쉐도우 파트너도 0이 아니라 1이다', () => {
    // 파트너도 독립된 데미지 라인이라 같은 하한을 받는다.
    // 전부 하한에 눌리는 범위를 주면 타격당 2(본체 1 + 파트너 1)가 들어간다.
    const stats = makeStats();
    const hp = 10;
    const rows = calculateKillProbabilitiesWithinNHits(
      'avenger',
      { min: -100, max: -50 },
      { min: -100, max: -50 },
      0.5,
      50,
      hp,
      stats,
      makeMonster({ hp })
    );
    // 타격당 2씩 들어가면 5방에 딱 잡는다
    assert.equal(rows.length, 1);
    assert.equal(rows[0].hit, 5);
    assert.equal(rows[0].accProb, '100.00');
  });

  it('하한에 눌린 질량을 균등분포로 퍼뜨리지 않는다', () => {
    // 같은 정수 범위를 (a) 클램프 전 실수 범위로 주는 경우와
    // (b) 이미 클램프된 정수 범위로 주는 경우를 비교한다.
    // (b)는 하한 덩어리를 구간 전체에 퍼뜨리므로 데미지를 과대평가해야 한다.
    const c = CASES[1];
    const stats = makeStats();
    const monster = makeMonster({ hp: c.hp });
    const args = [
      skillOf(c.hits),
      c.shadow,
      c.critChance,
      c.hp,
      stats,
      monster,
    ] as const;
    const withAtom = toAccumulatedProbabilities(
      calculateKillProbabilitiesWithinNHits(
        args[0],
        c.rawBasic,
        c.rawCrit,
        args[1],
        args[2],
        args[3],
        args[4],
        args[5]
      )
    );
    const asUniform = toAccumulatedProbabilities(
      calculateKillProbabilitiesWithinNHits(
        args[0],
        toInts(c.rawBasic),
        toInts(c.rawCrit),
        args[1],
        args[2],
        args[3],
        args[4],
        args[5]
      )
    );

    let gap = 0;
    for (let i = 0; i < withAtom.length; i++) {
      const a = withAtom[i];
      const b = asUniform[i];
      if (a === null || b === null) continue;
      // 균등으로 퍼뜨리면 언제나 더 빨리 잡는 쪽으로 틀린다
      assert.ok(b >= a - 1e-9, `${i + 1}방에서 방향이 뒤집혔다: ${b} < ${a}`);
      gap = Math.max(gap, b - a);
    }
    assert.ok(gap > 0.01, `차이가 너무 작다: ${gap}`);
  });

  it('방어력 난수 폭을 주면 같은 지지구간이라도 분포가 달라진다', () => {
    // 지지구간(min~max)은 그대로인데 분포 모양만 균등 -> 사다리꼴로 바뀐다.
    const c = CASES[2];
    const stats = makeStats();
    const monster = makeMonster({ hp: c.hp });
    const call = (band: number) =>
      toAccumulatedProbabilities(
        calculateKillProbabilitiesWithinNHits(
          skillOf(c.hits),
          { ...c.rawBasic, defenseBand: band },
          { ...c.rawCrit, defenseBand: band },
          c.shadow,
          c.critChance,
          c.hp,
          stats,
          monster
        )
      );
    const uniform = call(0);
    const trapezoid = call(180);

    let gap = 0;
    for (let i = 0; i < uniform.length; i++) {
      const a = uniform[i];
      const b = trapezoid[i];
      if (a === null || b === null) continue;
      gap = Math.max(gap, Math.abs(a - b));
    }
    assert.ok(gap > 0.005, `사다리꼴이 반영되지 않았다: ${gap}`);
  });
});

describe('난수 순환 (트리플 스로우)', () => {
  /**
   * 원작은 공격 1회당 난수를 7칸만 뽑아 돌려 쓴다. 그 결과 트리플 스로우
   * 3라인 중 한 라인의 데미지 난수가 다른 라인의 크리티컬 판정을 그대로 결정한다.
   * 메이플랜드 실측 40시전에서 예외 없이 확인됐다.
   */
  const CASES = [
    {
      name: '방어력 낮은 몹',
      hp: 12000,
      basic: { min: 1500, max: 3100 },
      crit: { min: 2500, max: 5166 },
      shadow: 0.5,
      critChance: 50,
    },
    {
      name: '크리티컬 확률이 50%가 아닌 경우',
      hp: 9000,
      basic: { min: 900, max: 2000 },
      crit: { min: 1400, max: 3100 },
      shadow: 0.5,
      critChance: 35,
    },
    {
      name: '쉐도우 파트너 없음',
      hp: 7000,
      basic: { min: 1100, max: 2300 },
      crit: { min: 1830, max: 3830 },
      shadow: 0,
      critChance: 50,
    },
  ];

  const run = (c: (typeof CASES)[number], rngCycling: boolean) => {
    const stats = makeStats();
    const monster = makeMonster({ hp: c.hp });
    const rows = calculateKillProbabilitiesWithinNHits(
      'tripleThrow',
      { ...c.basic },
      { ...c.crit },
      c.shadow,
      c.critChance,
      c.hp,
      stats,
      monster,
      20,
      null,
      rngCycling
    );
    const scenario: KillScenario = {
      hp: c.hp,
      hits: 3,
      basic: c.basic,
      crit: c.crit,
      shadow: c.shadow,
      critChance: c.critChance / 100,
      hitProb: 1,
      rngCycling,
    };
    return { rows, scenario };
  };

  for (const c of CASES) {
    it(`몬테카를로 시뮬레이션과 일치한다 - ${c.name}`, () => {
      const { rows, scenario } = run(c, true);
      const actual = toAccumulatedProbabilities(rows);
      const simulated = simulateKillProbabilities(scenario, 400000, 424242);

      let compared = 0;
      for (let i = 0; i < simulated.length; i++) {
        const value = actual[i];
        if (value === null) continue;
        compared++;
        assert.ok(
          Math.abs(value - simulated[i]) < 0.005,
          `${i + 1}방: ${value} vs 시뮬레이션 ${simulated[i]}`
        );
      }
      assert.ok(compared > 0, '비교할 행이 없다');
    });
  }

  it('독립 가정과 결과가 달라진다', () => {
    const off = toAccumulatedProbabilities(run(CASES[0], false).rows);
    const on = toAccumulatedProbabilities(run(CASES[0], true).rows);
    const gap = off
      .map((v, i) => (v === null || on[i] === null ? 0 : Math.abs(v - on[i])))
      .reduce((a, b) => Math.max(a, b), 0);
    assert.ok(gap > 0.005, `차이가 너무 작다: ${gap}`);
  });

  it('평균 데미지는 바뀌지 않는다 (분산만 준다)', () => {
    // 결합은 난수의 결합분포만 바꾸고 각 난수의 주변부 분포는 그대로다.
    // 몬테카를로 평균이 같은지로 확인한다.
    const c = CASES[0];
    const mean = (rngCycling: boolean) => {
      const s = { ...run(c, rngCycling).scenario, hp: 10 ** 9, maxUses: 1 };
      const random = createRandom(99);
      let total = 0;
      const N = 200000;
      for (let t = 0; t < N; t++) {
        let sum = 0;
        const line = (crit: boolean, u: number) => {
          const range = crit ? s.crit : s.basic;
          const d = range.min + Math.floor(u * (range.max - range.min + 1));
          return d + Math.floor(d * s.shadow);
        };
        const aCrit = random() < s.critChance;
        const aU = random();
        const bCrit = random() < s.critChance;
        const bU = random();
        const cU = random();
        sum += line(aCrit, aU) + line(bCrit, bU);
        sum += line(
          rngCycling ? bU < s.critChance : random() < s.critChance,
          cU
        );
        total += sum;
      }
      return total / N;
    };
    const off = mean(false);
    const on = mean(true);
    assert.ok(
      Math.abs(on / off - 1) < 0.005,
      `평균이 달라졌다: ${off} vs ${on}`
    );
  });

  it('1타 스킬과 럭키 세븐에는 영향이 없다', () => {
    for (const skillType of ['avenger', 'drain', 'lucky7'] as const) {
      const stats = makeStats();
      const monster = makeMonster({ hp: 6000 });
      const args = [
        skillType,
        { min: 900, max: 2000 },
        { min: 1500, max: 3333 },
        0.5,
        50,
        6000,
        stats,
        monster,
        20,
        null,
      ] as const;
      const off = calculateKillProbabilitiesWithinNHits(...args, false);
      const on = calculateKillProbabilitiesWithinNHits(...args, true);
      assert.deepEqual(on, off, `${skillType}에서 결과가 달라졌다`);
    }
  });
});

describe('명중률', () => {
  it('필요 명중률은 (55 + 레벨차) * 회피율 / 15 이다', () => {
    assert.equal(calculateRequiredHitRatio(100, 90, 15), 65);
    // 캐릭터 레벨이 더 높아도 레벨차는 0으로 본다
    assert.equal(calculateRequiredHitRatio(90, 100, 15), 55);
  });

  it('필요 명중률을 채우면 100%, 절반이면 0%가 된다', () => {
    assert.equal(calculateHitProbability(65, 100, 90, 15), 1);
    assert.equal(calculateHitProbability(32.5, 100, 90, 15), 0);
    assert.ok(
      Math.abs(calculateHitProbability(48.75, 100, 90, 15) - 0.5) < 1e-9
    );
  });

  it('명중률을 넘겨도 100%를 넘지 않고, 모자라도 0% 아래로 가지 않는다', () => {
    assert.equal(calculateHitProbability(99999, 100, 90, 15), 1);
    assert.equal(calculateHitProbability(1, 100, 90, 15), 0);
  });

  it('명중률을 입력하지 않으면 100%로 본다', () => {
    assert.equal(calculateHitProbability(undefined, 100, 90, 15), 1);
  });

  it('회피율 0인 몬스터는 명중률과 무관하게 항상 맞는다', () => {
    // 0으로 나눠 NaN이 새어 나가면 확률 계산 전체가 NaN이 된다
    assert.equal(calculateHitProbability(0, 100, 100, 0), 1);
    assert.equal(calculateHitProbability(undefined, 100, 100, 0), 1);
  });
});

describe('calculateDamage', () => {
  const equipment: Equipment = {
    weaponAttack: 100,
    selectedWeaponId: 'balanced-fury',
    gloveAttack: 30,
    otherAttack: 20,
    buff: 0,
  };

  const makeSkills = (overrides: Partial<Skills> = {}): Skills => ({
    type: 'lucky7',
    level: 20,
    criticalThrow: 30,
    javelin: 20,
    shadowPartner: 30,
    shadowPartnerEnabled: true,
    mapleWarrior: 0,
    mapleWarriorEnabled: false,
    sharpEyes: 30,
    sharpEyesEnabled: false,
    venom: 0,
    venomEnabled: false,
    attacksPerMinute: DEFAULT_ATTACKS_PER_MINUTE,
    rngCyclingEnabled: false,
    ...overrides,
  });

  const monster = makeMonster({ hp: 15000, physicalDefense: 300 });

  it('표시하는 데미지 범위가 확률 계산에 쓰는 정수 데미지와 어긋나지 않는다', () => {
    const result = calculateDamage(
      monster,
      makeStats(),
      equipment,
      makeSkills()
    );

    for (const value of [
      result.basic.min,
      result.basic.max,
      result.critical.min,
      result.critical.max,
      result.shadowBasic.min,
      result.shadowBasic.max,
      result.shadowCritical.min,
      result.shadowCritical.max,
    ]) {
      assert.ok(Number.isInteger(value), `${value}는 정수가 아니다`);
    }

    // 쉐도우 파트너는 내림한 본체 데미지에서 유도되고,
    // 총 데미지 범위는 그 둘의 합(럭키 세븐은 2타)이어야 한다
    assert.equal(
      result.shadowBasic.min,
      Math.floor(result.basic.min * 0.5) // 쉐도우 파트너 30레벨 = 50%
    );
    assert.equal(
      result.totalDamageRange.min,
      (result.basic.min + result.shadowBasic.min) * 2
    );
    assert.equal(
      result.totalDamageRange.max,
      (result.critical.max + result.shadowCritical.max) * 2
    );
  });

  it('어벤져는 1타이므로 총 데미지 범위를 곱하지 않는다', () => {
    const result = calculateDamage(
      monster,
      makeStats(),
      equipment,
      makeSkills({ type: 'avenger', level: 30 })
    );
    assert.equal(
      result.totalDamageRange.min,
      result.basic.min + result.shadowBasic.min
    );
    assert.equal(
      result.totalDamageRange.max,
      result.critical.max + result.shadowCritical.max
    );
  });

  it('샤프 아이즈는 크리티컬 데미지에 +140%p를 더한다 (게임 스펙)', () => {
    const stats = makeStats();
    const off = calculateDamage(monster, stats, equipment, makeSkills());
    const on = calculateDamage(
      monster,
      stats,
      equipment,
      makeSkills({ sharpEyesEnabled: true })
    );

    // 일반 데미지는 그대로여야 한다
    assert.equal(on.basic.min, off.basic.min);
    assert.equal(on.basic.max, off.basic.max);

    // 럭키 세븐 20(150%) + 크리티컬 스로우 30(200%) => 배율 250%
    // 샤프 아이즈 30은 +40%p가 아니라 +140%p이므로 390%가 된다
    const expectedRatio = 3.9 / 2.5;
    assert.ok(
      Math.abs(on.critical.max / off.critical.max - expectedRatio) < 0.001,
      `크리티컬 배율 비율 ${on.critical.max / off.critical.max}`
    );
  });

  it('방어력에 눌려도 데미지 라인은 0이 아니라 1이다', () => {
    // 원작은 타격마다 max(1.0, min(199999.0, damage))로 자른 뒤 절삭한다.
    const result = calculateDamage(
      makeMonster({ hp: 600, level: 40, physicalDefense: 130 }),
      makeStats({ level: 35, luk: 70, dex: 30 }),
      { ...equipment, weaponAttack: 0, gloveAttack: 0, otherAttack: 0 },
      makeSkills({ level: 8, criticalThrow: 0, javelin: 0 })
    );

    // 방어력 감산 뒤 최소 데미지가 음수로 내려가는 조합이다
    assert.equal(result.basic.min, MIN_DAMAGE_PER_LINE);
    // 파트너 타격도 독립된 데미지 라인이라 같은 하한을 받는다
    assert.equal(result.shadowBasic.min, MIN_DAMAGE_PER_LINE);
    assert.ok(
      result.basic.max > MIN_DAMAGE_PER_LINE,
      '최댓값까지 눌리진 않는다'
    );
  });

  it('데미지 라인은 199999에서 잘린다', () => {
    const result = calculateDamage(
      makeMonster({ hp: 5000000, level: 180, physicalDefense: 500 }),
      makeStats({ level: 200, luk: 2500, dex: 200 }),
      { ...equipment, gloveAttack: 200, otherAttack: 200, buff: 100 },
      makeSkills({
        type: 'tripleThrow',
        level: 30,
        sharpEyesEnabled: true,
      })
    );

    assert.equal(result.critical.max, MAX_DAMAGE_PER_LINE);
    // 파트너는 이미 잘린 본체 정수 데미지를 따라간다
    assert.equal(
      result.shadowCritical.max,
      Math.floor(MAX_DAMAGE_PER_LINE * 0.5)
    );
  });

  it('쉐도우 파트너가 꺼져 있으면 파트너 데미지는 0이다', () => {
    const result = calculateDamage(
      monster,
      makeStats(),
      equipment,
      makeSkills({ shadowPartnerEnabled: false })
    );
    assert.equal(result.shadowBasic.min, 0);
    assert.equal(result.shadowCritical.max, 0);
  });

  it('레벨 차이가 클수록 데미지가 줄어든다', () => {
    const stats = makeStats({ level: 100 });
    const same = calculateDamage(
      makeMonster({ hp: 15000, level: 100 }),
      stats,
      equipment,
      makeSkills()
    );
    const higher = calculateDamage(
      makeMonster({ hp: 15000, level: 120 }),
      stats,
      equipment,
      makeSkills()
    );
    assert.ok(higher.basic.max < same.basic.max);
  });
});
