'use client';

import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { DamageResult } from '../types/calculator';
import { calculateDamage } from '../utils/damageCalculator';
import { CALCULATION_DEBOUNCE_MS } from '../constants/calculator';
import { findHeadlineKill } from '../utils/calculatorUtils';
import { useCalculatorState } from '../hooks/useCalculatorState';
import { monsterPresets } from '../data/monsterPresets';
import MonsterPanel from './panels/MonsterPanel';
import CharacterPanel from './panels/CharacterPanel';
import EquipmentPanel from './panels/EquipmentPanel';
import SkillsPanel from './panels/SkillsPanel';
import ResultsPanel from './results/ResultsPanel';
import SaveSlots from './SaveSlots';
import { ThemeToggle } from './ThemeToggle';

const EMPTY_RESULT: DamageResult = {
  basic: { min: 0, max: 0 },
  critical: { min: 0, max: 0 },
  shadowBasic: { min: 0, max: 0 },
  shadowCritical: { min: 0, max: 0 },
  totalDamageRange: { min: 0, max: 0 },
  killProbabilities: [],
  statAttack: { min: 0, max: 0 },
  hpAbsorption: { min: 0, max: 0 },
  venomTickDamage: null,
  venomApplied: false,
};

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
    isLoading,
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
  } = useCalculatorState();

  const [damageResult, setDamageResult] = useState<DamageResult>(EMPTY_RESULT);
  // 모바일에서는 결과를 하단 시트로 접어 둔다.
  const [sheetOpen, setSheetOpen] = useState(false);

  // 프리셋에만 있는 참고용 정보(정확도, 공격력, 속성 등)를 보여주기 위해 찾아 둔다.
  const selectedPreset = isCustomMonster
    ? null
    : monsterPresets.find((preset) => preset.id === selectedMonsterId);
  const venomBlocked =
    selectedPreset?.isBoss === true ||
    selectedPreset?.poisonAttribute === 1 ||
    selectedPreset?.poisonAttribute === 2;

  // 방컷 확률 계산은 HP가 큰 몬스터에서 수십 ms가 걸리는 동기 작업이라
  // 입력할 때마다 바로 돌리면 타이핑이 밀린다. 짧게 디바운스해서
  // 연속 입력 중에는 마지막 값 한 번만 계산한다.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const result = calculateDamage(monster, stats, equipment, skills);
        setDamageResult(result);
      } catch (error) {
        console.error('Failed to calculate damage:', error);
      }
    }, CALCULATION_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [monster, stats, equipment, skills]);

  const results = (
    <ResultsPanel
      result={damageResult}
      monster={monster}
      stats={stats}
      skills={skills}
      selectedPreset={selectedPreset}
    />
  );

  const headline = findHeadlineKill(damageResult.killProbabilities);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-ink">
              메이플랜드 데미지 계산기
            </h1>
            <p className="truncate text-xs text-muted">
              나이트로드 · 허밋 표창 N방컷
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SaveSlots
              saves={saves}
              onSave={handleSave}
              onLoad={handleLoad}
              onDelete={handleDelete}
            />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-brand" />
        </div>
      ) : (
        <main className="mx-auto max-w-[1480px] px-4 pb-28 pt-5 lg:pb-10">
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* 입력: 왼쪽 열에 몬스터·캐릭터, 오른쪽 열에 장비·스킬 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <MonsterPanel
                  monster={monster}
                  setMonster={setMonster}
                  selectedMonsterId={selectedMonsterId}
                  isCustomMonster={isCustomMonster}
                  onMonsterSelect={handleMonsterSelect}
                  selectedPreset={selectedPreset}
                  venomBlocked={venomBlocked}
                />
                <CharacterPanel
                  stats={stats}
                  setStats={setStats}
                  skills={skills}
                  setSkills={setSkills}
                  onPureStatChange={handlePureStatChange}
                  onLevelChange={handleLevelChange}
                />
              </div>
              <div className="flex flex-col gap-4">
                <EquipmentPanel
                  equipment={equipment}
                  setEquipment={setEquipment}
                />
                <SkillsPanel
                  skills={skills}
                  setSkills={setSkills}
                  onMapleWarriorToggle={handleMapleWarriorToggle}
                  onMapleWarriorLevelChange={handleMapleWarriorLevelChange}
                  onSharpEyesToggle={handleSharpEyesToggle}
                  onSharpEyesLevelChange={handleSharpEyesLevelChange}
                  venomApplied={damageResult.venomApplied}
                />
              </div>
            </div>

            {/* 결과는 데스크톱에서 항상 붙어 있게 한다. 입력을 만지면서 바로 확인해야 하는 값이다. */}
            {/* 결과가 화면보다 길어지면(방수가 많을 때) 패널 안에서 스크롤한다. */}
            <aside className="thin-scroll hidden lg:sticky lg:top-[4.75rem] lg:block lg:max-h-[calc(100vh-5.75rem)] lg:overflow-y-auto">
              {results}
            </aside>
          </div>
        </main>
      )}

      {/* 모바일 결과 시트 */}
      {!isLoading && (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          {sheetOpen && (
            <div className="thin-scroll max-h-[70vh] overflow-auto border-t border-line bg-bg px-3 pb-3 pt-3">
              {results}
            </div>
          )}
          <button
            type="button"
            onClick={() => setSheetOpen((prev) => !prev)}
            aria-expanded={sheetOpen}
            className="flex w-full items-center justify-between gap-3 border-t border-line bg-card px-4 py-3 shadow-pop"
          >
            <span className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold tabular-nums text-brand">
                {!headline.entry
                  ? '20방 초과'
                  : headline.reliable
                    ? `${headline.entry.hit}방컷`
                    : `${headline.entry.hit}방+`}
              </span>
              <span className="text-xs tabular-nums text-muted">
                {Math.floor(damageResult.totalDamageRange.min).toLocaleString(
                  'ko-KR'
                )}{' '}
                ~{' '}
                {Math.floor(damageResult.totalDamageRange.max).toLocaleString(
                  'ko-KR'
                )}
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-muted">
              {sheetOpen ? '접기' : '결과 보기'}
              <ChevronUp
                className={`h-4 w-4 transition-transform ${
                  sheetOpen ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
