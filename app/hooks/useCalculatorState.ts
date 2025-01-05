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

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return {
      monster: {
        level: monsterPresets[0].level,
        hp: monsterPresets[0].hp,
        physicalDefense: monsterPresets[0].physicalDefense,
        magicalDefense: monsterPresets[0].magicalDefense,
        avoid: monsterPresets[0].avoid,
      },
      stats: {
        level: 10,
        str: 4,
        dex: 25,
        luk: 41,
        additionalStr: 0,
        additionalDex: 0,
        additionalLuk: 0,
        hitRatio: undefined,
      },
      equipment: {
        weaponAttack: 10,
        selectedWeaponId: 'subi',
        gloveAttack: 0,
        otherAttack: 0,
        buff: 0,
      },
      skills: {
        type: 'lucky7' as AttackSkillType,
        level: 1,
        criticalThrow: 0,
        javelin: 0,
        shadowPartner: 0,
        shadowPartnerEnabled: false,
        mapleWarrior: 0,
        mapleWarriorEnabled: false,
      },
      selectedMonsterId: monsterPresets[0].id,
      isCustomMonster: false,
    };
  }

  // 1번 슬롯(index 0)에 저장된 데이터 확인
  const savedData = localStorage.getItem(`${STORAGE_KEY_PREFIX}0`);
  if (savedData) {
    const parsedData = JSON.parse(savedData);
    const matchingPreset = monsterPresets.find(
      (preset) =>
        preset.level === parsedData.monster.level &&
        preset.hp === parsedData.monster.hp &&
        preset.physicalDefense === parsedData.monster.physicalDefense
    );

    return {
      monster: parsedData.monster,
      stats: parsedData.stats,
      equipment: parsedData.equipment,
      skills: parsedData.skills,
      selectedMonsterId: matchingPreset?.id || 'custom',
      isCustomMonster: !matchingPreset,
    };
  }

  // 기본값 반환
  return {
    monster: {
      level: monsterPresets[0].level,
      hp: monsterPresets[0].hp,
      physicalDefense: monsterPresets[0].physicalDefense,
      magicalDefense: monsterPresets[0].magicalDefense,
      avoid: monsterPresets[0].avoid,
    },
    stats: {
      level: 10,
      str: 4,
      dex: 25,
      luk: 41,
      additionalStr: 0,
      additionalDex: 0,
      additionalLuk: 0,
      hitRatio: undefined,
    },
    equipment: {
      weaponAttack: 10,
      selectedWeaponId: 'subi',
      gloveAttack: 0,
      otherAttack: 0,
      buff: 0,
    },
    skills: {
      type: 'lucky7' as AttackSkillType,
      level: 1,
      criticalThrow: 0,
      javelin: 0,
      shadowPartner: 0,
      shadowPartnerEnabled: false,
      mapleWarrior: 0,
      mapleWarriorEnabled: false,
    },
    selectedMonsterId: monsterPresets[0].id,
    isCustomMonster: false,
  };
};

export const useCalculatorState = () => {
  const initialState = getInitialState();
  const [monster, setMonster] = useState<Monster>(initialState.monster);
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>(
    initialState.selectedMonsterId
  );
  const [isCustomMonster, setIsCustomMonster] = useState<boolean>(
    initialState.isCustomMonster
  );
  const [stats, setStats] = useState<Stats>(initialState.stats);
  const [equipment, setEquipment] = useState<Equipment>(initialState.equipment);
  const [skills, setSkills] = useState<Skills>(initialState.skills);
  const [saves, setSaves] = useState<(SaveData | null)[]>(Array(3).fill(null));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load saved data from localStorage
    const loadedSaves = Array(3)
      .fill(null)
      .map((_, index) => {
        const savedData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${index}`);
        return savedData ? JSON.parse(savedData) : null;
      });
    setSaves(loadedSaves);
  }, []);

  const handleMonsterSelect = (monsterId: string) => {
    if (monsterId === 'custom') {
      setIsCustomMonster(true);
      setSelectedMonsterId('custom');
    } else {
      const selectedPreset = monsterPresets.find(
        (preset) => preset.id === monsterId
      );
      if (selectedPreset) {
        setIsCustomMonster(false);
        setSelectedMonsterId(monsterId);
        setMonster({
          level: selectedPreset.level,
          hp: selectedPreset.hp,
          physicalDefense: selectedPreset.physicalDefense,
          magicalDefense: selectedPreset.magicalDefense,
          avoid: selectedPreset.avoid,
        });
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
        stats.level,
        statType === 'str' ? newValue : stats.str,
        statType === 'dex' ? newValue : stats.dex
      );
    }

    setStats((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleLevelChange = (change: number) => {
    const newLevel = Math.max(
      MIN_LEVEL,
      Math.min(MAX_LEVEL, stats.level + change)
    );
    const newLuk = calculatePureLuk(newLevel, stats.str, stats.dex);

    setStats((prev) => ({
      ...prev,
      level: newLevel,
      luk: newLuk,
    }));
  };

  const handleSave = (slot: number) => {
    if (typeof window === 'undefined') return;

    const saveData: SaveData = {
      timestamp: Date.now(),
      monster,
      stats,
      equipment,
      skills,
    };

    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${slot}`,
      JSON.stringify(saveData)
    );

    const newSaves = [...saves];
    newSaves[slot] = saveData;
    setSaves(newSaves);
  };

  const handleLoad = (slot: number) => {
    if (typeof window === 'undefined') return;

    const saveData = saves[slot];
    if (!saveData) return;

    const matchingPreset = monsterPresets.find(
      (preset) =>
        preset.level === saveData.monster.level &&
        preset.hp === saveData.monster.hp &&
        preset.physicalDefense === saveData.monster.physicalDefense
    );

    setMonster(saveData.monster);
    setStats(saveData.stats);
    setEquipment(saveData.equipment);
    setSkills(saveData.skills);
    setSelectedMonsterId(matchingPreset?.id || 'custom');
    setIsCustomMonster(!matchingPreset);
  };

  const handleDelete = (slot: number) => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slot}`);
    const newSaves = [...saves];
    newSaves[slot] = null;
    setSaves(newSaves);
  };

  const handleMapleWarriorToggle = (enabled: boolean) => {
    const mapleWarriorSkill = getSkillEffect(
      'mapleWarrior',
      skills.mapleWarrior
    );
    if (!mapleWarriorSkill || !isMapleWarriorEffect(mapleWarriorSkill)) return;

    const statBoost = mapleWarriorSkill.statBoost / 100;

    setStats((prev) => {
      if (enabled) {
        // 메이플 용사 활성화: 순수 스탯에 비례해서 추가 스탯 증가
        const strBoost = Math.floor(prev.str * statBoost);
        const dexBoost = Math.floor(prev.dex * statBoost);
        const lukBoost = Math.floor(prev.luk * statBoost);
        return {
          ...prev,
          additionalStr: prev.additionalStr + strBoost,
          additionalDex: prev.additionalDex + dexBoost,
          additionalLuk: prev.additionalLuk + lukBoost,
        };
      } else {
        // 메이플 용사 비활성화: 순수 스탯에 비례한 만큼 추가 스탯 감소
        const strBoost = Math.floor(prev.str * statBoost);
        const dexBoost = Math.floor(prev.dex * statBoost);
        const lukBoost = Math.floor(prev.luk * statBoost);
        return {
          ...prev,
          additionalStr: prev.additionalStr - strBoost,
          additionalDex: prev.additionalDex - dexBoost,
          additionalLuk: prev.additionalLuk - lukBoost,
        };
      }
    });

    setSkills((prev) => ({
      ...prev,
      mapleWarriorEnabled: enabled,
    }));
  };

  const handleMapleWarriorLevelChange = (newLevel: number) => {
    const oldSkill = getSkillEffect('mapleWarrior', skills.mapleWarrior);
    const newSkill = getSkillEffect('mapleWarrior', newLevel);

    if (
      !oldSkill ||
      !newSkill ||
      !isMapleWarriorEffect(oldSkill) ||
      !isMapleWarriorEffect(newSkill)
    )
      return;

    // 메이플 용사가 활성화된 상태일 때만 스탯 재계산
    if (skills.mapleWarriorEnabled) {
      const oldBoost = oldSkill.statBoost / 100;
      const newBoost = newSkill.statBoost / 100;

      setStats((prev) => {
        // 기존 증가분을 제거하고 새로운 증가분을 적용
        const oldStrBoost = Math.floor(prev.str * oldBoost);
        const oldDexBoost = Math.floor(prev.dex * oldBoost);
        const oldLukBoost = Math.floor(prev.luk * oldBoost);

        const newStrBoost = Math.floor(prev.str * newBoost);
        const newDexBoost = Math.floor(prev.dex * newBoost);
        const newLukBoost = Math.floor(prev.luk * newBoost);

        return {
          ...prev,
          additionalStr: prev.additionalStr - oldStrBoost + newStrBoost,
          additionalDex: prev.additionalDex - oldDexBoost + newDexBoost,
          additionalLuk: prev.additionalLuk - oldLukBoost + newLukBoost,
        };
      });
    }

    setSkills((prev) => ({
      ...prev,
      mapleWarrior: newLevel,
    }));
  };

  return {
    monster,
    setMonster,
    selectedMonsterId,
    setSelectedMonsterId,
    isCustomMonster,
    setIsCustomMonster,
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
  };
};
