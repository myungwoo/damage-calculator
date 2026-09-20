import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AttackItem, Equipment } from '../app/types/calculator';
import { calculateTotalAttack } from '../app/utils/damageCalculator';
import {
  ECHO_OF_HERO_OPTIONS,
  MAX_TOTAL_ATTACK,
  getEchoOfHeroPercent,
} from '../app/data/echoOfHero';
import {
  createAttackItem,
  resolveAttackPart,
  sumAttackItems,
} from '../app/utils/attackItems';
import { throwingStars } from '../app/data/weapons';

const STAR_ID = 'subi';
const STAR_ATTACK = throwingStars.find((star) => star.id === STAR_ID)!.attack;

const makeEquipment = (overrides: Partial<Equipment> = {}): Equipment => ({
  weaponAttack: 100,
  selectedWeaponId: STAR_ID,
  gloveAttack: 30,
  otherAttack: 20,
  buff: 0,
  echoOfHero: 'none',
  ...overrides,
});

const makeItem = (overrides: Partial<AttackItem> = {}): AttackItem => ({
  ...createAttackItem(),
  ...overrides,
});

describe('영웅의 메아리', () => {
  it('WZ에서 읽은 배율이 모험가 4% / 시그너스 2%다', () => {
    // Skill.wz 1005 / 10001005의 x. v079 · v083 덤프가 같은 값을 준다.
    assert.equal(getEchoOfHeroPercent('none'), 0);
    assert.equal(getEchoOfHeroPercent('adventurer'), 4);
    assert.equal(getEchoOfHeroPercent('cygnus'), 2);
    // 저장 데이터가 오래돼 값이 없으면 안 걸린 것으로 본다.
    assert.equal(getEchoOfHeroPercent(undefined), 0);
  });

  it('표창까지 더한 공격력 합 전체에 걸린다', () => {
    const equipment = makeEquipment();
    const base = calculateTotalAttack(equipment);
    assert.equal(base, 100 + STAR_ATTACK + 30 + 20);

    assert.equal(
      calculateTotalAttack({ ...equipment, echoOfHero: 'adventurer' }),
      base + Math.floor((base * 4) / 100)
    );
    assert.equal(
      calculateTotalAttack({ ...equipment, echoOfHero: 'cygnus' }),
      base + Math.floor((base * 2) / 100)
    );
  });

  it('증가분을 버린다 (원작의 정수 나눗셈)', () => {
    // 표창 없이 공격력 합이 정확히 137이 되게 맞춘다. 137 * 4 / 100 = 5.48 -> 5
    const equipment = makeEquipment({
      weaponAttack: 137 - STAR_ATTACK,
      gloveAttack: 0,
      otherAttack: 0,
      echoOfHero: 'adventurer',
    });
    assert.equal(
      calculateTotalAttack({ ...equipment, echoOfHero: 'none' }),
      137
    );
    assert.equal(calculateTotalAttack(equipment), 142);
  });

  it('공격력 합을 1999에서 자른다 (배율 전후 모두)', () => {
    const overflow = makeEquipment({ weaponAttack: 9999 });
    assert.equal(calculateTotalAttack(overflow), MAX_TOTAL_ATTACK);
    assert.equal(
      calculateTotalAttack({ ...overflow, echoOfHero: 'adventurer' }),
      MAX_TOTAL_ATTACK
    );

    // 배율을 먹고 나서야 상한을 넘는 경우도 잘린다.
    const nearCap = makeEquipment({
      weaponAttack: 1990 - STAR_ATTACK,
      gloveAttack: 0,
      otherAttack: 0,
      echoOfHero: 'adventurer',
    });
    assert.equal(calculateTotalAttack(nearCap), MAX_TOTAL_ATTACK);
  });

  it('고를 수 있는 종류가 세 가지다', () => {
    assert.deepEqual(
      ECHO_OF_HERO_OPTIONS.map((option) => option.type),
      ['none', 'adventurer', 'cygnus']
    );
  });
});

describe('공격력 항목 분해', () => {
  it('켜 둔 항목만 더한다', () => {
    const items = [
      makeItem({ name: '벨트', value: 3, enabled: true }),
      makeItem({ name: '정령의 축복', value: 5, enabled: false }),
      makeItem({ name: '어깨', value: 2, enabled: true }),
    ];
    assert.equal(sumAttackItems(items), 5);
    assert.equal(sumAttackItems([]), 0);
    assert.equal(sumAttackItems(undefined), 0);
  });

  it('항목이 없으면 직접 적은 숫자를 그대로 쓴다', () => {
    assert.equal(resolveAttackPart(17, undefined), 17);
    assert.equal(resolveAttackPart(17, []), 17);
    // 항목이 하나라도 있으면 그 합이 이긴다 — 전부 꺼서 0이 되는 것도 포함이다.
    assert.equal(
      resolveAttackPart(17, [makeItem({ value: 4, enabled: false })]),
      0
    );
  });

  it('항목 합이 공격력 합에 그대로 들어간다', () => {
    const items = [
      makeItem({ name: '전사의 비약', value: 12 }),
      makeItem({ name: '사이다', value: 15 }),
      makeItem({ name: '마법의 비약', value: 5, enabled: false }),
    ];
    const withItems = makeEquipment({ buff: 0, buffItems: items });
    const withNumber = makeEquipment({ buff: 27 });
    assert.equal(
      calculateTotalAttack(withItems),
      calculateTotalAttack(withNumber)
    );
  });

  it('숫자 칸이 항목 합과 어긋나 있어도 항목 쪽을 믿는다', () => {
    // 저장 데이터가 예전 값을 들고 있어도 계산이 흔들리지 않아야 한다.
    const equipment = makeEquipment({
      otherAttack: 999,
      otherAttackItems: [makeItem({ value: 7 })],
    });
    assert.equal(
      calculateTotalAttack(equipment),
      calculateTotalAttack(makeEquipment({ otherAttack: 7 }))
    );
  });

  it('새 항목은 켜진 채로 0에서 시작하고 서로 다른 id를 받는다', () => {
    const first = createAttackItem();
    const second = createAttackItem();
    assert.equal(first.value, 0);
    assert.equal(first.enabled, true);
    assert.notEqual(first.id, second.id);
  });
});
