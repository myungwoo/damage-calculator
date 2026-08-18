/**
 * 몹 공격업 단계별 배율 (%).
 *
 * 원작 `MobSkill.img`의 **110(웨폰 어택 업) / 111(매직 어택 업)** 이다.
 * `Mob::DoSkill_StateChange`가 그 레벨의 `x`를 몹 스탯 `PowerUp_` / `MagicUp_`에
 * 그대로 넣고, `CalcDamage::PDamage` / `MDamage`가 마지막에
 * `damage *= x * 0.01`로 곱한다. 즉 **방어력 감면이 끝난 값에 곱해지는 배율**이라
 * 몹 공격력을 올리는 것과는 결과가 다르다.
 *
 * WZ의 "레벨"은 강약 단계가 아니라 몹마다 골라 쓰는 슬롯이라 값이 겹친다.
 * 실제로 나오는 값은 110이 `115 / 130 / 200 / 100`, 111이 `115 / 130 / 140 / 100`인데,
 * 이 중 게임에서 1단계 · 2단계로 통하는 것이 115와 130이다(100은 배율이 없는 것과 같다).
 * v079와 v083 WZ 값이 같은 것을 확인했다.
 */
export const MOB_ATTACK_UP_TIERS = [
  { stage: 1, percent: 115 },
  { stage: 2, percent: 130 },
] as const;

/**
 * 몹 방어업 단계별 배율 (%).
 *
 * 원작 `MobSkill.img`의 **102(자기) / 112(주변 몹 전체)** 다. 공격업과 마찬가지로
 * `Mob::DoSkill_StateChange`가 그 레벨의 `x`를 `PGuardUp_`에 넣고,
 * `CalcDamage::PDamage`가 **크리티컬 가산까지 끝낸 값에** `damage *= x * 0.01`로 곱한다
 * (쉐도우 파트너와 클램프는 그 뒤라, 파트너 몫도 같이 줄어든다).
 *
 * WZ에 실제로 있는 값은 `85 / 60 / 100`이고, 100은 안 걸린 것과 같다.
 * 프리셋에서는 112가 전부 85고, 102에만 60이 하나 있다.
 */
export const MOB_DEFENSE_UP_TIERS = [
  { stage: 1, percent: 85 },
  { stage: 2, percent: 60 },
] as const;
