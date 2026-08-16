import { useRef, useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Pencil, Search } from 'lucide-react';
import { MonsterPreset, Region } from '../types/calculator';

interface MonsterDropdownProps {
  selectedMonsterId: string;
  isCustomMonster: boolean;
  monsterPresets: MonsterPreset[];
  onSelect: (id: string) => void;
  regionOrder: readonly Region[];
}

interface GroupedMonsters {
  [key: string]: MonsterPreset[];
}

export default function MonsterDropdown({
  selectedMonsterId,
  isCustomMonster,
  monsterPresets,
  onSelect,
  regionOrder,
}: MonsterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  // 트리거 버튼까지 포함해야 열린 상태에서 버튼을 눌렀을 때 곧바로 닫힌다.
  const rootRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 드롭다운이 닫힐 때 검색어와 선택 인덱스 초기화
  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(-1);
      setSearchQuery('');
      return;
    }
    // 열자마자 지금 고른 몬스터가 보이게 한다. 목록이 수백 줄이라 없으면 매번 찾아 내려가야 한다.
    const selected = rootRef.current?.querySelector(
      `[data-monster-id="${selectedMonsterId}"]`
    );
    selected?.scrollIntoView({ block: 'center' });
  }, [isOpen, selectedMonsterId]);

  // 몬스터 그룹핑 및 정렬
  const groupedMonsters = (() => {
    const filtered = monsterPresets.filter((preset) =>
      preset.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 지역별로 그룹핑
    const groups = filtered.reduce<GroupedMonsters>((acc, monster) => {
      if (!acc[monster.region]) {
        acc[monster.region] = [];
      }
      acc[monster.region].push(monster);
      return acc;
    }, {});

    // 각 지역 내에서 레벨 오름차순, 같은 레벨일 경우 이름 오름차순으로 정렬
    Object.values(groups).forEach((monsters) => {
      monsters.sort((a, b) => {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
        return a.name.localeCompare(b.name);
      });
    });

    // 지역 순서대로 정렬
    return Object.entries(groups).sort((a, b) => {
      const indexA = regionOrder.indexOf(a[0] as Region);
      const indexB = regionOrder.indexOf(b[0] as Region);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  })();

  const matchCount = groupedMonsters.reduce(
    (acc, [, monsters]) => acc + monsters.length,
    0
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const flattenedMonsters = [
      { id: 'custom', name: '직접 입력' },
      ...groupedMonsters.flatMap(([, monsters]) => monsters),
    ];

    const moveTo = (newIndex: number) => {
      setTimeout(() => {
        const selectedElement = document.querySelector(
          `[data-index="${newIndex}"]`
        );
        selectedElement?.scrollIntoView({ block: 'nearest' });
      }, 0);
      return newIndex;
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          moveTo(prev < flattenedMonsters.length - 1 ? prev + 1 : prev)
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => moveTo(prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(flattenedMonsters[selectedIndex].id);
        } else if (matchCount === 1) {
          // 검색으로 하나만 남았으면 방향키 없이 엔터만으로 고를 수 있게 한다.
          handleSelect(groupedMonsters[0][1][0].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (monsterId: string) => {
    onSelect(monsterId);
    setIsOpen(false);
  };

  const selectedMonster = monsterPresets.find(
    (m) => m.id === selectedMonsterId
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`field-trigger flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left ${
          isOpen ? 'border-brand ring-2 ring-brand/25' : ''
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {isCustomMonster ? (
            <>
              <Pencil className="h-4 w-4 shrink-0 text-crit" />
              <span className="truncate text-sm font-semibold text-ink">
                직접 입력
              </span>
            </>
          ) : selectedMonster ? (
            <>
              <span className="shrink-0 rounded-md bg-brand/15 px-1.5 py-0.5 text-[0.7rem] font-bold tabular-nums text-brand">
                Lv.{selectedMonster.level}
              </span>
              <span className="truncate text-sm font-semibold text-ink">
                {selectedMonster.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted">몬스터 선택</span>
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {isOpen && (
        <div
          className="absolute z-30 mt-2 w-full animate-fade-in-up overflow-hidden rounded-xl border border-line bg-card shadow-pop"
          onKeyDown={handleKeyDown}
        >
          <div className="relative border-b border-line p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(-1);
              }}
              placeholder="몬스터 이름 검색"
              className="field-input pl-9"
              autoFocus
            />
          </div>
          <div className="thin-scroll max-h-72 overflow-auto">
            <button
              type="button"
              data-index="0"
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                selectedIndex === 0 ? 'bg-brand/10' : ''
              } ${isCustomMonster ? 'font-semibold text-brand' : 'text-ink'}`}
              onClick={() => handleSelect('custom')}
              onMouseEnter={() => setSelectedIndex(0)}
            >
              <Pencil className="h-3.5 w-3.5 text-crit" />
              직접 입력
              {isCustomMonster && <Check className="ml-auto h-4 w-4" />}
            </button>

            {matchCount === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted">
                검색 결과가 없다
              </p>
            )}

            {groupedMonsters.map(([region, monsters], groupIndex) => (
              <div key={region}>
                <div className="sticky top-0 z-10 border-y border-line bg-sunken px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
                  {region}
                  <span className="ml-1.5 opacity-60">{monsters.length}</span>
                </div>
                {monsters.map((monster, index) => {
                  const flatIndex =
                    groupedMonsters
                      .slice(0, groupIndex)
                      .reduce((acc, [, m]) => acc + m.length, 0) +
                    index +
                    1;
                  const isSelected = selectedMonsterId === monster.id;
                  return (
                    <button
                      type="button"
                      key={monster.id}
                      data-index={flatIndex}
                      data-monster-id={monster.id}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                        selectedIndex === flatIndex ? 'bg-brand/10' : ''
                      }`}
                      onClick={() => handleSelect(monster.id)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                    >
                      <span className="w-12 shrink-0 text-[0.7rem] font-bold tabular-nums text-muted">
                        Lv.{monster.level}
                      </span>
                      <span
                        className={`truncate text-sm ${
                          isSelected ? 'font-semibold text-brand' : 'text-ink'
                        }`}
                      >
                        {monster.name}
                      </span>
                      <span className="ml-auto shrink-0 text-[0.7rem] tabular-nums text-muted">
                        {monster.hp.toLocaleString('ko-KR')}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
