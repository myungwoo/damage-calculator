'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { AttackItem } from '../types/calculator';
import { createAttackItem, sumAttackItems } from '../utils/attackItems';
import NumberInput from './NumberInput';
import Toggle from './ui/Toggle';

interface AttackBreakdownProps {
  /** 어떤 칸을 나누는 중인지 (예: '도핑') */
  title: string;
  items: AttackItem[];
  onChange: (items: AttackItem[]) => void;
  onClose: () => void;
  /** 첫 줄을 만들 때 넣어 줄 이름 예시. 뭘 적는 칸인지 한 번에 보이게 한다 */
  placeholders: string[];
}

/**
 * 공격력 칸 하나를 이루는 항목들을 펼쳐서 고치는 편집기.
 *
 * 카드 안에 **펼쳐지는 형태**지 떠 있는 팝오버가 아니다. `Card`가
 * `overflow-hidden`이라 카드 밖으로 나가는 레이어는 잘리고, 그 제약을 풀면
 * 카드 경계가 흐려진다. 대신 카드 폭을 그대로 써서 이름 · 값 · 스위치를
 * 한 줄에 놓을 수 있다.
 */
export default function AttackBreakdown({
  title,
  items,
  onChange,
  onClose,
  placeholders,
}: AttackBreakdownProps) {
  const total = sumAttackItems(items);

  const updateItem = (id: string, patch: Partial<AttackItem>) =>
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

  return (
    <div className="space-y-2 rounded-xl border border-line bg-sunken/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="field-label">{title} 항목</span>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold tabular-nums text-brand">
            합 {total.toLocaleString('ko-KR')}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={`${title} 항목 접기`}
            className="text-muted transition-colors hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted">
          부위·물약별로 나눠 적으면 합계가 이 칸의 값이 된다. 줄을 지우지 않고
          스위치로 꺼 두면 값은 남고 합계에서만 빠진다.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2">
              <Toggle
                checked={item.enabled}
                onChange={(enabled) => updateItem(item.id, { enabled })}
                label={`${item.name || `항목 ${index + 1}`} 적용`}
                hideLabel
              />
              <input
                type="text"
                value={item.name}
                aria-label={`항목 ${index + 1} 이름`}
                placeholder={placeholders[index % placeholders.length]}
                onChange={(event) =>
                  updateItem(item.id, { name: event.target.value })
                }
                className={`field-input min-w-0 flex-1 py-1.5 text-xs ${
                  item.enabled ? '' : 'text-muted'
                }`}
              />
              <div className="w-20 shrink-0">
                <NumberInput
                  value={item.value}
                  ariaLabel={`항목 ${index + 1} 공격력`}
                  onChange={(value) =>
                    updateItem(item.id, { value: value ?? 0 })
                  }
                  className="py-1.5 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange(items.filter((other) => other.id !== item.id))
                }
                aria-label={`항목 ${index + 1} 삭제`}
                className="shrink-0 rounded-lg border border-field-line bg-sunken p-1.5 text-muted transition-colors hover:border-danger hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...items, createAttackItem()])}
        className="ghost-button h-8 w-full gap-1.5 text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        항목 추가
      </button>
    </div>
  );
}
