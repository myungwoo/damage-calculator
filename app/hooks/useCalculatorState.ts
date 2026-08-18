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
import { DEFAULT_ATTACKS_PER_MINUTE } from '../data/venom';
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
    accuracy: monsterPresets[0].accuracy,
    physicalAttack: monsterPresets[0].physicalAttack,
    physicalAttackPowers: monsterPresets[0].physicalAttackPowers,
    magicAttack: monsterPresets[0].magicAttack,
    hasMagicAttack: monsterPresets[0].hasMagicAttack ?? false,
    poisonAttribute: monsterPresets[0].poisonAttribute,
    isBoss: monsterPresets[0].isBoss,
  } as Monster,
  stats: {
    level: 10,
    str: 4,
    dex: 25,
    luk: 41,
    additionalStr: 0,
    additionalDex: 0,
    additionalLuk: 0,
    additionalInt: 0,
    hitRatio: undefined,
    avoid: undefined,
    physicalDefense: undefined,
    magicalDefense: undefined,
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
    sharpEyes: 0,
    sharpEyesEnabled: false,
    venom: 0,
    venomEnabled: false,
    shadowShifter: 0,
    shadowShifterEnabled: false,
    attacksPerMinute: DEFAULT_ATTACKS_PER_MINUTE,
    // 실측으로 확인된 원작 동작이라 기본값은 켜 둔다.
    rngCyclingEnabled: true,
  } as Skills,
  selectedMonsterId: monsterPresets[0].id,
  isCustomMonster: false,
  saves: Array(3).fill(null) as (SaveData | null)[],
};

type State = typeof DEFAULT_STATE;

const getInitialState = (): State => {
  return DEFAULT_STATE;
};

// 저장 데이터에는 몬스터 수치만 들어 있고 어느 프리셋인지가 없다.
// 프리셋 값은 UI에서 잠겨 있어 그대로 저장되므로 수치로 되찾을 수 있다.
// 독 속성 / 보스 여부 / 명중률 / 공격력은 저장 데이터에 없을 수 있으므로 프리셋에서 다시 붙인다.
const resolveMonsterSelection = (savedMonster: Monster) => {
  const matchingPreset = monsterPresets.find(
    (preset) =>
      preset.level === savedMonster.level &&
      preset.hp === savedMonster.hp &&
      preset.physicalDefense === savedMonster.physicalDefense
  );

  return {
    monster: {
      ...savedMonster,
      // 회피 확률을 붙이기 전에 저장된 데이터에는 명중률이 없다.
      accuracy: savedMonster.accuracy ?? matchingPreset?.accuracy ?? 0,
      // 피격 데미지를 붙이기 전에 저장된 데이터에는 공격력이 없다.
      physicalAttack:
        savedMonster.physicalAttack ?? matchingPreset?.physicalAttack ?? 0,
      magicAttack: savedMonster.magicAttack ?? matchingPreset?.magicAttack ?? 0,
      // 공격별 공격력과 마법 공격 유무는 프리셋에만 있는 정보라 항상 다시 붙인다.
      physicalAttackPowers: matchingPreset?.physicalAttackPowers,
      // 프리셋은 마법 공격 유무를 다 알고 있다 — 값이 없으면 "없다"는 뜻이다.
      // 직접 입력 몬스터만 알 수 없으므로 켜 둔 채로 둔다.
      hasMagicAttack: matchingPreset
        ? (matchingPreset.hasMagicAttack ?? false)
        : true,
      poisonAttribute: matchingPreset?.poisonAttribute,
      isBoss: matchingPreset?.isBoss,
    },
    selectedMonsterId: matchingPreset?.id || 'custom',
    isCustomMonster: !matchingPreset,
  };
};

export const useCalculatorState = () => {
  const [state, setState] = useState(getInitialState());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialState = async () => {
      setIsLoading(true);
      try {
        const savedState = getInitialState();
        setState(savedState);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialState();
  }, []);

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
        const parsedData = JSON.parse(savedData) as SaveData;

        setState((prev) => ({
          ...prev,
          ...resolveMonsterSelection(parsedData.monster),
          // 예전 저장 데이터에는 추가 INT / 방어력 필드가 없으므로 기본값으로 채운다.
          stats: { ...DEFAULT_STATE.stats, ...parsedData.stats },
          equipment: parsedData.equipment,
          // 예전 저장 데이터에는 베놈 관련 필드가 없으므로 기본값으로 채운다.
          skills: {
            ...DEFAULT_STATE.skills,
            ...parsedData.skills,
          },
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
        // 직접 입력은 마법 공격 유무를 알 수 없으니, 마법 공격력을 넣으면 보이게 둔다.
        monster: { ...prev.monster, hasMagicAttack: true },
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
            accuracy: selectedPreset.accuracy,
            physicalAttack: selectedPreset.physicalAttack,
            physicalAttackPowers: selectedPreset.physicalAttackPowers,
            magicAttack: selectedPreset.magicAttack,
            hasMagicAttack: selectedPreset.hasMagicAttack ?? false,
            poisonAttribute: selectedPreset.poisonAttribute,
            isBoss: selectedPreset.isBoss,
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
    setIsLoading(true);
    try {
      const key = `${STORAGE_KEY_PREFIX}${slot}`;
      const savedData = localStorage.getItem(key);
      if (savedData) {
        const parsedData = JSON.parse(savedData) as SaveData;
        setState((prev) => ({
          ...prev,
          // 드롭다운 표시와 프리셋 잠금이 불러온 몬스터를 따라가야 한다.
          ...resolveMonsterSelection(parsedData.monster),
          // 예전 저장 데이터에는 추가 INT / 방어력 필드가 없으므로 기본값으로 채운다.
          stats: { ...DEFAULT_STATE.stats, ...parsedData.stats },
          equipment: parsedData.equipment,
          // 예전 저장 데이터에는 베놈 관련 필드가 없으므로 기본값으로 채운다.
          skills: { ...DEFAULT_STATE.skills, ...parsedData.skills },
        }));
      }
    } finally {
      setIsLoading(false);
    }
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

  const handleSharpEyesToggle = (enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        sharpEyesEnabled: enabled,
      },
    }));
  };

  const handleSharpEyesLevelChange = (newLevel: number) => {
    setState((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        sharpEyes: newLevel,
      },
    }));
  };

  return {
    ...state,
    isLoading,
    selectedMonsterId: state.selectedMonsterId,
    isCustomMonster: state.isCustomMonster,
    saves: state.saves,
    setMonster: (monsterOrUpdater: Monster | ((prev: Monster) => Monster)) =>
      setState((prev) => ({
        ...prev,
        monster:
          typeof monsterOrUpdater === 'function'
            ? monsterOrUpdater(prev.monster)
            : monsterOrUpdater,
      })),
    setStats: (statsOrUpdater: Stats | ((prev: Stats) => Stats)) =>
      setState((prev) => ({
        ...prev,
        stats:
          typeof statsOrUpdater === 'function'
            ? statsOrUpdater(prev.stats)
            : statsOrUpdater,
      })),
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
    setSkills: (skillsOrUpdater: Skills | ((prev: Skills) => Skills)) =>
      setState((prev) => ({
        ...prev,
        skills:
          typeof skillsOrUpdater === 'function'
            ? skillsOrUpdater(prev.skills)
            : skillsOrUpdater,
      })),
    setState,
    handleMonsterSelect,
    handlePureStatChange,
    handleLevelChange,
    handleSave,
    handleLoad,
    handleDelete,
    handleMapleWarriorToggle,
    handleMapleWarriorLevelChange,
    handleSharpEyesToggle,
    handleSharpEyesLevelChange,
  };
};
