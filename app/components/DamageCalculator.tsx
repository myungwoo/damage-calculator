'use client';

import { useState, useEffect } from 'react';
import { DamageResult, AttackSkillType, StatType } from '../types/calculator';
import {
  calculateDamage,
  calculateRequiredHitRatio,
  calculateHitProbability,
} from '../utils/damageCalculator';
import { throwingStars } from '../data/weapons';
import { REGION_ORDER } from '../constants/calculator';
import {
  getSkillLevelRange,
  formatSaveDate,
  renderSkillEffect,
} from '../utils/calculatorUtils';
import { useCalculatorState } from '../hooks/useCalculatorState';
import MonsterDropdown from './MonsterDropdown';
import { monsterPresets } from '../data/monsterPresets';
import NumberInput from './NumberInput';

export default function DamageCalculator() {
  const {
    monster,
    setMonster,
    selectedMonsterId,
    isCustomMonster,
    stats,
    setStats,
    equipment,
    setEquipment,
    skills,
    setSkills,
    saves,
    handleMonsterSelect,
    handlePureStatChange,
    handleLevelChange,
    handleSave,
    handleLoad,
    handleDelete,
    handleMapleWarriorToggle,
    handleMapleWarriorLevelChange,
  } = useCalculatorState();

  const [damageResult, setDamageResult] = useState<DamageResult>({
    basic: { min: 0, max: 0 },
    critical: { min: 0, max: 0 },
    shadowBasic: { min: 0, max: 0 },
    shadowCritical: { min: 0, max: 0 },
    totalDamageRange: { min: 0, max: 0 },
    killProbabilities: [],
    statAttack: { min: 0, max: 0 },
  });

  useEffect(() => {
    try {
      const result = calculateDamage(monster, stats, equipment, skills);
      setDamageResult(result);
    } catch (error) {
      console.error('Failed to calculate damage:', error);
    }
  }, [monster, stats, equipment, skills]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg">
      <div className="bg-primary text-white p-4 rounded-t-lg">
        <h1 className="text-2xl font-bold text-center">데미지 계산기</h1>
      </div>
      <div className="p-6">
        <div className="flex justify-end gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="text-xs text-gray-500 text-center">
                {saves[index]
                  ? formatSaveDate(saves[index]!.timestamp)
                  : '비어있음'}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleSave(index)}
                  className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  저장 {index + 1}
                </button>
                <button
                  onClick={() => handleLoad(index)}
                  disabled={!saves[index]}
                  className={`px-3 py-1 rounded-md text-sm ${
                    saves[index]
                      ? 'bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  불러오기
                </button>
                {saves[index] && (
                  <button
                    onClick={() => handleDelete(index)}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monster Stats Section */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">몬스터 정보</h2>
            <div className="space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">몬스터</label>
                <MonsterDropdown
                  selectedMonsterId={selectedMonsterId}
                  isCustomMonster={isCustomMonster}
                  monsterPresets={monsterPresets}
                  onSelect={handleMonsterSelect}
                  regionOrder={REGION_ORDER}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  레벨
                </label>
                <NumberInput
                  value={monster.level}
                  onChange={(value) =>
                    setMonster((prev) => ({
                      ...prev,
                      level: value ?? 0,
                    }))
                  }
                  disabled={!isCustomMonster}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  HP
                </label>
                <NumberInput
                  value={monster.hp}
                  onChange={(value) =>
                    setMonster((prev) => ({
                      ...prev,
                      hp: value ?? 0,
                    }))
                  }
                  disabled={!isCustomMonster}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  물리 방어력
                </label>
                <NumberInput
                  value={monster.physicalDefense}
                  onChange={(value) =>
                    setMonster((prev) => ({
                      ...prev,
                      physicalDefense: value ?? 0,
                    }))
                  }
                  disabled={!isCustomMonster}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  회피율
                </label>
                <NumberInput
                  value={monster.avoid}
                  onChange={(value) =>
                    setMonster((prev) => ({
                      ...prev,
                      avoid: value ?? 0,
                    }))
                  }
                  disabled={!isCustomMonster}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  필요 명중률 / 타격 확률
                </label>
                <div className="mt-1 text-md font-medium text-gray-900">
                  {calculateRequiredHitRatio(
                    monster.level,
                    stats.level,
                    monster.avoid
                  ).toFixed(2)}{' '}
                  /{' '}
                  {(
                    calculateHitProbability(
                      stats.hitRatio,
                      monster.level,
                      stats.level,
                      monster.avoid
                    ) * 100
                  ).toFixed(2)}
                  %
                </div>
              </div>
            </div>
          </div>

          {/* Character Stats Section */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">캐릭터 스탯</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  레벨
                </label>
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={stats.level}
                    onChange={(value) => {
                      if (value !== undefined) {
                        handleLevelChange(value - stats.level);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleLevelChange(-1)}
                    className="px-3 py-2 bg-primary/10 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleLevelChange(1)}
                    className="px-3 py-2 bg-primary/10 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    STR
                  </label>
                  <NumberInput
                    value={stats.str}
                    onChange={(value) => {
                      if (value !== undefined) {
                        handlePureStatChange('str' as StatType, value);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    추가 STR
                  </label>
                  <NumberInput
                    value={stats.additionalStr}
                    onChange={(value) =>
                      setStats((prev) => ({
                        ...prev,
                        additionalStr: value ?? 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    총 STR
                  </label>
                  <input
                    type="number"
                    value={stats.str + stats.additionalStr}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-gray-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    DEX
                  </label>
                  <NumberInput
                    value={stats.dex}
                    onChange={(value) => {
                      if (value !== undefined) {
                        handlePureStatChange('dex' as StatType, value);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    추가 DEX
                  </label>
                  <NumberInput
                    value={stats.additionalDex}
                    onChange={(value) =>
                      setStats((prev) => ({
                        ...prev,
                        additionalDex: value ?? 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    총 DEX
                  </label>
                  <input
                    type="number"
                    value={stats.dex + stats.additionalDex}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-gray-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    LUK
                  </label>
                  <input
                    type="number"
                    value={stats.luk}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    추가 LUK
                  </label>
                  <NumberInput
                    value={stats.additionalLuk}
                    onChange={(value) =>
                      setStats((prev) => ({
                        ...prev,
                        additionalLuk: value ?? 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    총 LUK
                  </label>
                  <input
                    type="number"
                    value={stats.luk + stats.additionalLuk}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  명중률
                </label>
                <NumberInput
                  value={stats.hitRatio}
                  onChange={(value) =>
                    setStats((prev) => ({
                      ...prev,
                      hitRatio: value,
                    }))
                  }
                  placeholder="명중률을 입력하세요"
                  allowUndefined
                />
              </div>
            </div>
          </div>

          {/* Equipment Section */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">장비 정보</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  무기 공격력
                </label>
                <NumberInput
                  value={equipment.weaponAttack}
                  onChange={(value) =>
                    setEquipment((prev) => ({
                      ...prev,
                      weaponAttack: value ?? 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  표창 선택
                </label>
                <select
                  value={equipment.selectedWeaponId}
                  onChange={(e) => {
                    setEquipment((prev) => ({
                      ...prev,
                      selectedWeaponId: e.target.value,
                    }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                >
                  {throwingStars.map((star) => (
                    <option key={star.id} value={star.id}>
                      {star.name} (공격력: {star.attack})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  장갑 공격력
                </label>
                <NumberInput
                  value={equipment.gloveAttack}
                  onChange={(value) =>
                    setEquipment((prev) => ({
                      ...prev,
                      gloveAttack: value ?? 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  기타 공격력
                </label>
                <NumberInput
                  value={equipment.otherAttack}
                  onChange={(value) =>
                    setEquipment((prev) => ({
                      ...prev,
                      otherAttack: value ?? 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  도핑
                </label>
                <NumberInput
                  value={equipment.buff}
                  onChange={(value) =>
                    setEquipment((prev) => ({
                      ...prev,
                      buff: value ?? 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  공격력 합
                </label>
                <input
                  type="number"
                  value={
                    equipment.weaponAttack +
                    (throwingStars.find(
                      (star) => star.id === equipment.selectedWeaponId
                    )?.attack || 0) +
                    equipment.gloveAttack +
                    equipment.otherAttack +
                    equipment.buff
                  }
                  readOnly
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">스킬 정보</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  스킬 선택
                </label>
                <select
                  value={skills.type}
                  onChange={(e) => {
                    const newType = e.target.value as AttackSkillType;
                    setSkills((prev) => ({
                      ...prev,
                      type: newType,
                      level: 1,
                    }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                >
                  <option value="lucky7">럭키 세븐</option>
                  <option value="avenger">어벤져</option>
                </select>
                <span className="text-sm text-gray-500 mt-1 block">
                  {renderSkillEffect(skills.type, skills.level)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  스킬 레벨
                </label>
                <div className="flex gap-2">
                  <select
                    value={skills.level}
                    onChange={(e) =>
                      setSkills((prev) => ({
                        ...prev,
                        level: Number(e.target.value),
                      }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  >
                    {getSkillLevelRange(skills.type).map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const maxLevel = skills.type === 'lucky7' ? 20 : 30;
                      setSkills((prev) => ({ ...prev, level: maxLevel }));
                    }}
                    className="mt-1 px-3 py-2 bg-primary/10 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    M
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  크리티컬 스로우
                </label>
                <div className="flex gap-2">
                  <select
                    value={skills.criticalThrow}
                    onChange={(e) =>
                      setSkills((prev) => ({
                        ...prev,
                        criticalThrow: Number(e.target.value),
                      }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  >
                    {getSkillLevelRange('criticalThrow').map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      setSkills((prev) => ({ ...prev, criticalThrow: 30 }))
                    }
                    className="mt-1 px-3 py-2 bg-primary/10 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    M
                  </button>
                </div>
                <span className="text-sm text-gray-500 mt-1 block">
                  {renderSkillEffect('criticalThrow', skills.criticalThrow)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  자벨린 마스터리
                </label>
                <div className="flex gap-2">
                  <select
                    value={skills.javelin}
                    onChange={(e) =>
                      setSkills((prev) => ({
                        ...prev,
                        javelin: Number(e.target.value),
                      }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  >
                    {getSkillLevelRange('javelin').map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      setSkills((prev) => ({ ...prev, javelin: 20 }))
                    }
                    className="mt-1 px-3 py-2 bg-primary/10 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    M
                  </button>
                </div>
                <span className="text-sm text-gray-500 mt-1 block">
                  {renderSkillEffect('javelin', skills.javelin)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  쉐도우 파트너 레벨
                </label>
                <div className="flex gap-2">
                  <select
                    value={skills.shadowPartner}
                    onChange={(e) =>
                      setSkills((prev) => ({
                        ...prev,
                        shadowPartner: Number(e.target.value),
                      }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  >
                    {getSkillLevelRange('shadowPartner').map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      setSkills((prev) => ({ ...prev, shadowPartner: 30 }))
                    }
                    className="mt-1 px-3 py-2 bg-primary/10 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    M
                  </button>
                </div>
                <span className="text-sm text-gray-500 mt-1 block">
                  {renderSkillEffect('shadowPartner', skills.shadowPartner)}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="shadowPartnerEnabled"
                    checked={skills.shadowPartnerEnabled}
                    onChange={(e) =>
                      setSkills((prev) => ({
                        ...prev,
                        shadowPartnerEnabled: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="shadowPartnerEnabled"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    쉐도우 파트너 사용
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  메이플 용사 레벨
                </label>
                <div className="flex gap-2">
                  <select
                    value={skills.mapleWarrior}
                    onChange={(e) =>
                      handleMapleWarriorLevelChange(Number(e.target.value))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  >
                    {getSkillLevelRange('mapleWarrior').map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleMapleWarriorLevelChange(30)}
                    className="mt-1 px-3 py-2 bg-primary/10 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    M
                  </button>
                </div>
                <span className="text-sm text-gray-500 mt-1 block">
                  {renderSkillEffect('mapleWarrior', skills.mapleWarrior)}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="mapleWarriorEnabled"
                    checked={skills.mapleWarriorEnabled}
                    onChange={(e) => handleMapleWarriorToggle(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="mapleWarriorEnabled"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    메이플 용사 사용
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">데미지 결과</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">스탯 공격력</h3>
                <p>최대: {Math.floor(damageResult.statAttack.max)}</p>
                <p>최소: {Math.floor(damageResult.statAttack.min)}</p>
              </div>
              <div>
                <h3 className="font-medium">
                  기본
                  {skills.shadowPartnerEnabled && skills.shadowPartner > 0
                    ? '(+쉐파)'
                    : ''}
                </h3>
                <p>
                  최대: {Math.floor(damageResult.basic.max)}
                  {skills.shadowPartnerEnabled &&
                    skills.shadowPartner > 0 &&
                    ` (+${Math.floor(damageResult.shadowBasic.max)})`}
                </p>
                <p>
                  최소: {Math.floor(damageResult.basic.min)}
                  {skills.shadowPartnerEnabled &&
                    skills.shadowPartner > 0 &&
                    ` (+${Math.floor(damageResult.shadowBasic.min)})`}
                </p>
              </div>
              <div>
                <h3 className="font-medium">
                  크리티컬
                  {skills.shadowPartnerEnabled && skills.shadowPartner > 0
                    ? '(+쉐파)'
                    : ''}
                </h3>
                <p>
                  최대: {Math.floor(damageResult.critical.max)}
                  {skills.shadowPartnerEnabled &&
                    skills.shadowPartner > 0 &&
                    ` (+${Math.floor(damageResult.shadowCritical.max)})`}
                </p>
                <p>
                  최소: {Math.floor(damageResult.critical.min)}
                  {skills.shadowPartnerEnabled &&
                    skills.shadowPartner > 0 &&
                    ` (+${Math.floor(damageResult.shadowCritical.min)})`}
                </p>
              </div>
              <div>
                <h3 className="font-medium">총 데미지 범위</h3>
                <p>
                  {Math.floor(damageResult.totalDamageRange.min)} ~{' '}
                  {Math.floor(damageResult.totalDamageRange.max)}
                </p>
              </div>
            </div>
          </div>

          {/* Probabilities Section */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">확률</h2>
            <div className="space-y-2">
              {damageResult.killProbabilities.length === 0 && (
                <h3 className="font-medium">20방을 때려도 못 잡네요 😅</h3>
              )}
              {damageResult.killProbabilities.map(({ hit, prob, accProb }) => (
                <div key={hit}>
                  <h3 className="font-medium">{hit}방컷</h3>
                  <p>
                    {prob}% (누적 {accProb}%)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
