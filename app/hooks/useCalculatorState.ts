import { useState, useEffect } from 'react';
import {
  Monster,
  Stats,
  Skills,
  Equipment,
  AttackSkillType,
  SaveData,
  StatType,
} from '../types/calculator';
import { monsterPresets } from '../data/monsterPresets';
import { calculatePureLuk } from '../utils/damageCalculator';
import {
  STORAGE_KEY_PREFIX,
  MIN_LEVEL,
  MAX_LEVEL,
} from '../constants/calculator';

const getInitialState = () => {
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
    },
    stats: {
      level: 10,
      str: 4,
      dex: 25,
      luk: 41,
      additionalStr: 0,
      additionalDex: 0,
      additionalLuk: 0,
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
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slot}`);
    const newSaves = [...saves];
    newSaves[slot] = null;
    setSaves(newSaves);
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
  };
};
