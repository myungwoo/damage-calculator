'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { SaveData } from '../types/calculator';
import { formatSaveDate } from '../utils/calculatorUtils';

interface SaveSlotsProps {
  saves: (SaveData | null)[];
  onSave: (slot: number) => void;
  onLoad: (slot: number) => void;
  onDelete: (slot: number) => void;
}

export default function SaveSlots({
  saves,
  onSave,
  onLoad,
  onDelete,
}: SaveSlotsProps) {
  const [isOpen, setIsOpen] = useState(false);
  // 삭제는 되돌릴 수 없어서 같은 버튼을 한 번 더 누르게 한다.
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setPendingDelete(null);
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const usedCount = saves.filter(Boolean).length;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="ghost-button h-9 gap-1.5 px-3"
      >
        <Save className="h-4 w-4" />
        <span className="hidden sm:inline">저장 슬롯</span>
        <span className="rounded-full bg-brand/15 px-1.5 text-[0.7rem] font-bold tabular-nums text-brand">
          {usedCount}/{saves.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-[23rem] animate-fade-in-up rounded-xl border border-line bg-card p-2 shadow-pop">
          {saves.map((save, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-sunken"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">
                  슬롯 {index + 1}
                </p>
                <p className="truncate text-[0.7rem] tabular-nums text-muted">
                  {save ? formatSaveDate(save.timestamp) : '비어 있음'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSave(index)}
                className="ghost-button h-7 px-2.5 text-xs"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => onLoad(index)}
                disabled={!save}
                className="ghost-button h-7 px-2.5 text-xs"
              >
                불러오기
              </button>
              {save && (
                <button
                  type="button"
                  onClick={() => {
                    if (pendingDelete === index) {
                      onDelete(index);
                      setPendingDelete(null);
                    } else {
                      setPendingDelete(index);
                    }
                  }}
                  aria-label={`슬롯 ${index + 1} 삭제`}
                  title={
                    pendingDelete === index ? '한 번 더 누르면 삭제' : '삭제'
                  }
                  className={`inline-flex h-7 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors ${
                    pendingDelete === index
                      ? 'border-danger bg-danger text-white'
                      : 'border-field-line bg-sunken text-muted hover:border-danger hover:text-danger'
                  }`}
                >
                  {pendingDelete === index ? (
                    '확인'
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
          <p className="px-2 pb-1 pt-2 text-[0.7rem] text-muted">
            이 브라우저에만 저장된다
          </p>
        </div>
      )}
    </div>
  );
}
