import { useRef, useState, useEffect } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

  // 드롭다운이 닫힐 때 선택 인덱스 초기화
  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(-1);
    }
  }, [isOpen]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const flattenedMonsters = [
      { id: 'custom', name: '직접 입력' },
      ...groupedMonsters.flatMap(([, monsters]) => monsters),
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex =
            prev < flattenedMonsters.length - 1 ? prev + 1 : prev;
          setTimeout(() => {
            const selectedElement = document.querySelector(
              `[data-index="${newIndex}"]`
            );
            selectedElement?.scrollIntoView({ block: 'nearest' });
          }, 0);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : prev;
          setTimeout(() => {
            const selectedElement = document.querySelector(
              `[data-index="${newIndex}"]`
            );
            selectedElement?.scrollIntoView({ block: 'nearest' });
          }, 0);
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedMonster = flattenedMonsters[selectedIndex];
          handleSelect(selectedMonster.id);
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 text-left border rounded bg-white dark:bg-gray-800 dark:text-gray-300 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/50 flex justify-between items-center"
      >
        {isCustomMonster
          ? '직접 입력'
          : selectedMonster
            ? `LV.${selectedMonster.level} ${selectedMonster.name}`
            : '몬스터 선택'}
        <svg
          className={`h-5 w-5 text-primary transform transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M7 7l3-3 3 3m0 6l-3 3-3-3"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg divide-y divide-gray-200 dark:divide-gray-700"
          onKeyDown={handleKeyDown}
        >
          <div className="p-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="몬스터 검색..."
              className="w-full p-2 border rounded focus:border-primary focus:ring-2 focus:ring-primary/50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-auto">
            <div
              data-index="0"
              className={`p-2 cursor-pointer ${
                selectedIndex === 0
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium'
                  : isCustomMonster
                    ? 'bg-yellow-50 dark:bg-yellow-900/30 font-medium'
                    : 'hover:bg-green-50/50 dark:hover:bg-green-900/20'
              }`}
              onClick={() => handleSelect('custom')}
              onMouseEnter={() => setSelectedIndex(0)}
            >
              직접 입력
            </div>
            {groupedMonsters.map(([region, monsters], groupIndex) => (
              <div key={region}>
                <div className="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 font-medium text-sm text-yellow-700 dark:text-yellow-300">
                  {region}
                </div>
                {monsters.map((monster, index) => {
                  const flatIndex =
                    groupedMonsters
                      .slice(0, groupIndex)
                      .reduce((acc, [, m]) => acc + m.length, 0) +
                    index +
                    1;
                  return (
                    <div
                      key={monster.id}
                      data-index={flatIndex}
                      className={`p-2 cursor-pointer ${
                        selectedIndex === flatIndex
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium'
                          : 'hover:bg-green-50/50 dark:hover:bg-green-900/20'
                      } ${selectedMonsterId === monster.id ? 'bg-yellow-50 dark:bg-yellow-900/30 font-medium' : ''}`}
                      onClick={() => handleSelect(monster.id)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                    >
                      LV.{monster.level} {monster.name}
                    </div>
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
