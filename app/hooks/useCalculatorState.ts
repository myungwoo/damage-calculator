import { useState, useEffect } from 'react';
import {
  Monster,
  Stats,
  Skills,
  Equipment,
  AttackSkillType,
  SaveData,
  StatType,
  isMapleWarriorEffect,
} from '../types/calculator';
import { monsterPresets } from '../data/monsterPresets';
import { calculatePureLuk } from '../utils/damageCalculator';
import { getSkillEffect } from '../data/skillEffects';
import {
  STORAGE_KEY_PREFIX,
  MIN_LEVEL,
  MAX_LEVEL,
} from '../constants/calculator';

const DEFAULT_STATE = {
  monster: {
    level: monsterPresets[0].level,
    hp: monsterPresets[0].hp,
    physicalDefense: monsterPresets[0].physicalDefense,
    magicalDefense: monsterPresets[0].magicalDefense,
    avoid: monsterPresets[0].avoid,
  } as Monster,
  stats: {
    level: 10,
    str: 4,
    dex: 25,
    luk: 41,
    additionalStr: 0,
    additionalDex: 0,
    additionalLuk: 0,
    hitRatio: undefined,
  } as Stats,
  equipment: {
    weaponAttack: 10,
    selectedWeaponId: 'subi',
    gloveAttack: 0,
    otherAttack: 0,
    buff: 0,
  } as Equipment,
  skills: {
    type: 'lucky7' as AttackSkillType,
    level: 1,
    criticalThrow: 0,
    javelin: 0,
    shadowPartner: 0,
    shadowPartnerEnabled: false,
    mapleWarrior: 0,
    mapleWarriorEnabled: false,
  } as Skills,
  selectedMonsterId: monsterPresets[0].id,
  isCustomMonster: false,
  saves: Array(3).fill(null) as (SaveData | null)[],
};

type State = typeof DEFAULT_STATE;

const getInitialState = (): State => {
  return DEFAULT_STATE;
};

export const useCalculatorState = () => {
  const [state, setState] = useState<State>(getInitialState);

  // localStorage에서 데이터 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load saved data from localStorage
      const loadedSaves = Array(3)
        .fill(null)
        .map((_, index) => {
          const savedData = localStorage.getItem(
            `${STORAGE_KEY_PREFIX}${index}`
          );
          return savedData ? JSON.parse(savedData) : null;
        });

      setState((prev) => ({
        ...prev,
        saves: loadedSaves,
      }));

      const savedData = localStorage.getItem(`${STORAGE_KEY_PREFIX}0`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const matchingPreset = monsterPresets.find(
          (preset) =>
            preset.level === parsedData.monster.level &&
            preset.hp === parsedData.monster.hp &&
            preset.physicalDefense === parsedData.monster.physicalDefense
        );

        setState((prev) => ({
          ...prev,
          monster: parsedData.monster as Monster,
          stats: parsedData.stats as Stats,
          equipment: parsedData.equipment as Equipment,
          skills: parsedData.skills as Skills,
          selectedMonsterId: matchingPreset?.id || 'custom',
          isCustomMonster: !matchingPreset,
        }));
      }
    }
  }, []);

  const handleMonsterSelect = (monsterId: string) => {
    if (monsterId === 'custom') {
      setState((prev) => ({
        ...prev,
        isCustomMonster: true,
        selectedMonsterId: 'custom',
      }));
    } else {
      const selectedPreset = monsterPresets.find(
        (preset) => preset.id === monsterId
      );
      if (selectedPreset) {
        setState((prev) => ({
          ...prev,
          isCustomMonster: false,
          selectedMonsterId: monsterId,
          monster: {
            ...prev.monster,
            level: selectedPreset.level,
            hp: selectedPreset.hp,
            physicalDefense: selectedPreset.physicalDefense,
            magicalDefense: selectedPreset.magicalDefense,
            avoid: selectedPreset.avoid,
          },
        }));
      }
    }
  };

  const handlePureStatChange = (statType: StatType, value: number) => {
    const newValue = Math.max(0, value);
    const updates: Partial<Stats> = {
      [statType]: newValue,
    };

    const isBaseStat = (stat: StatType): stat is 'str' | 'dex' => {
      return stat === 'str' || stat === 'dex';
    };

    if (isBaseStat(statType)) {
      updates.luk = calculatePureLuk(
        state.stats.level,
        statType === 'str' ? newValue : state.stats.str,
        statType === 'dex' ? newValue : state.stats.dex
      );
    }

    // 메이플 용사가 활성화된 상태라면 스탯 증가량 재계산
    if (state.skills.mapleWarriorEnabled) {
      const mapleWarriorSkill = getSkillEffect(
        'mapleWarrior',
        state.skills.mapleWarrior
      );
      if (mapleWarriorSkill && isMapleWarriorEffect(mapleWarriorSkill)) {
        const statBoost = mapleWarriorSkill.statBoost / 100;

        // 기존 증가분을 제거하고 새로운 증가분을 적용
        if (statType === 'str') {
          const oldBoost = Math.floor(state.stats.str * statBoost);
          const newBoost = Math.floor(newValue * statBoost);
          updates.additionalStr =
            state.stats.additionalStr - oldBoost + newBoost;
        } else if (statType === 'dex') {
          const oldBoost = Math.floor(state.stats.dex * statBoost);
          const newBoost = Math.floor(newValue * statBoost);
          updates.additionalDex =
            state.stats.additionalDex - oldBoost + newBoost;
        }
        if (updates.luk !== undefined) {
          const oldBoost = Math.floor(state.stats.luk * statBoost);
          const newBoost = Math.floor(updates.luk * statBoost);
          updates.additionalLuk =
            state.stats.additionalLuk - oldBoost + newBoost;
          console.log(oldBoost, newBoost);
        }
      }
    }

    setState((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        ...updates,
      },
    }));
  };

  const handleLevelChange = (change: number) => {
    const newLevel = Math.max(
      MIN_LEVEL,
      Math.min(MAX_LEVEL, state.stats.level + change)
    );
    const newLuk = calculatePureLuk(newLevel, state.stats.str, state.stats.dex);

    const updates: Partial<Stats> = {
      level: newLevel,
      luk: newLuk,
    };

    // 메이플 용사가 활성화된 상태라면 LUK 스탯 변화에 따른 증가량 재계산
    if (state.skills.mapleWarriorEnabled) {
      const mapleWarriorSkill = getSkillEffect(
        'mapleWarrior',
        state.skills.mapleWarrior
      );
      if (mapleWarriorSkill && isMapleWarriorEffect(mapleWarriorSkill)) {
        const statBoost = mapleWarriorSkill.statBoost / 100;
        const oldBoost = Math.floor(state.stats.luk * statBoost);
        const newBoost = Math.floor(newLuk * statBoost);
        updates.additionalLuk = state.stats.additionalLuk - oldBoost + newBoost;
      }
    }

    setState((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        ...updates,
      },
    }));
  };

  const handleSave = (slot: number) => {
    if (typeof window === 'undefined') return;

    const saveData: SaveData = {
      timestamp: Date.now(),
      monster: state.monster,
      stats: state.stats,
      equipment: state.equipment,
      skills: state.skills,
    };

    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${slot}`,
      JSON.stringify(saveData)
    );

    const newSaves = [...state.saves];
    newSaves[slot] = saveData;
    setState((prev) => ({
      ...prev,
      saves: newSaves,
    }));
  };

  const handleLoad = (slot: number) => {
    if (typeof window === 'undefined') return;

    const saveData = state.saves[slot];
    if (!saveData) return;

    const matchingPreset = monsterPresets.find(
      (preset) =>
        preset.level === saveData.monster.level &&
        preset.hp === saveData.monster.hp &&
        preset.physicalDefense === saveData.monster.physicalDefense
    );

    setState((prev) => ({
      ...prev,
      monster: saveData.monster,
      stats: saveData.stats,
      equipment: saveData.equipment,
      skills: saveData.skills,
      selectedMonsterId: matchingPreset?.id || 'custom',
      isCustomMonster: !matchingPreset,
    }));
  };

  const handleDelete = (slot: number) => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slot}`);
    const newSaves = [...state.saves];
    newSaves[slot] = null;
    setState((prev) => ({
      ...prev,
      saves: newSaves,
    }));
  };

  const handleMapleWarriorToggle = (enabled: boolean) => {
    const mapleWarriorSkill = getSkillEffect(
      'mapleWarrior',
      state.skills.mapleWarrior
    );
    if (!mapleWarriorSkill || !isMapleWarriorEffect(mapleWarriorSkill)) return;

    const statBoost = mapleWarriorSkill.statBoost / 100;

    setState((prev) => {
      if (enabled) {
        // 메이플 용사 활성화: 순수 스탯에 비례해서 추가 스탯 증가
        const strBoost = Math.floor(prev.stats.str * statBoost);
        const dexBoost = Math.floor(prev.stats.dex * statBoost);
        const lukBoost = Math.floor(prev.stats.luk * statBoost);
        return {
          ...prev,
          stats: {
            ...prev.stats,
            additionalStr: prev.stats.additionalStr + strBoost,
            additionalDex: prev.stats.additionalDex + dexBoost,
            additionalLuk: prev.stats.additionalLuk + lukBoost,
          },
        };
      } else {
        // 메이플 용사 비활성화: 순수 스탯에 비례한 만큼 추가 스탯 감소
        const strBoost = Math.floor(prev.stats.str * statBoost);
        const dexBoost = Math.floor(prev.stats.dex * statBoost);
        const lukBoost = Math.floor(prev.stats.luk * statBoost);
        return {
          ...prev,
          stats: {
            ...prev.stats,
            additionalStr: prev.stats.additionalStr - strBoost,
            additionalDex: prev.stats.additionalDex - dexBoost,
            additionalLuk: prev.stats.additionalLuk - lukBoost,
          },
        };
      }
    });

    setState((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        mapleWarriorEnabled: enabled,
      },
    }));
  };

  const handleMapleWarriorLevelChange = (newLevel: number) => {
    const oldSkill = getSkillEffect('mapleWarrior', state.skills.mapleWarrior);
    const newSkill = getSkillEffect('mapleWarrior', newLevel);

    if (
      !oldSkill ||
      !newSkill ||
      !isMapleWarriorEffect(oldSkill) ||
      !isMapleWarriorEffect(newSkill)
    )
      return;

    // 메이플 용사가 활성화된 상태일 때만 스탯 재계산
    if (state.skills.mapleWarriorEnabled) {
      const oldBoost = oldSkill.statBoost / 100;
      const newBoost = newSkill.statBoost / 100;

      setState((prev) => {
        // 기존 증가분을 제거하고 새로운 증가분을 적용
        const oldStrBoost = Math.floor(prev.stats.str * oldBoost);
        const oldDexBoost = Math.floor(prev.stats.dex * oldBoost);
        const oldLukBoost = Math.floor(prev.stats.luk * oldBoost);

        const newStrBoost = Math.floor(prev.stats.str * newBoost);
        const newDexBoost = Math.floor(prev.stats.dex * newBoost);
        const newLukBoost = Math.floor(prev.stats.luk * newBoost);

        return {
          ...prev,
          stats: {
            ...prev.stats,
            additionalStr: prev.stats.additionalStr - oldStrBoost + newStrBoost,
            additionalDex: prev.stats.additionalDex - oldDexBoost + newDexBoost,
            additionalLuk: prev.stats.additionalLuk - oldLukBoost + newLukBoost,
          },
        };
      });
    }

    setState((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        mapleWarrior: newLevel,
      },
    }));
  };

  return {
    monster: state.monster,
    setMonster: (monster: Monster) =>
      setState((prev) => ({ ...prev, monster })),
    selectedMonsterId: state.selectedMonsterId,
    setSelectedMonsterId: (monsterId: string) =>
      setState((prev) => ({ ...prev, selectedMonsterId: monsterId })),
    isCustomMonster: state.isCustomMonster,
    setIsCustomMonster: (isCustom: boolean) =>
      setState((prev) => ({ ...prev, isCustomMonster: isCustom })),
    stats: state.stats,
    setStats: (statsOrUpdater: Stats | ((prev: Stats) => Stats)) =>
      setState((prev) => ({
        ...prev,
        stats:
          typeof statsOrUpdater === 'function'
            ? statsOrUpdater(prev.stats)
            : statsOrUpdater,
      })),
    equipment: state.equipment,
    setEquipment: (
      equipmentOrUpdater: Equipment | ((prev: Equipment) => Equipment)
    ) =>
      setState((prev) => ({
        ...prev,
        equipment:
          typeof equipmentOrUpdater === 'function'
            ? equipmentOrUpdater(prev.equipment)
            : equipmentOrUpdater,
      })),
    skills: state.skills,
    setSkills: (skillsOrUpdater: Skills | ((prev: Skills) => Skills)) =>
      setState((prev) => ({
        ...prev,
        skills:
          typeof skillsOrUpdater === 'function'
            ? skillsOrUpdater(prev.skills)
            : skillsOrUpdater,
      })),
    saves: state.saves,
    handleMonsterSelect,
    handlePureStatChange,
    handleLevelChange,
    handleSave,
    handleLoad,
    handleDelete,
    handleMapleWarriorToggle,
    handleMapleWarriorLevelChange,
  };
};
