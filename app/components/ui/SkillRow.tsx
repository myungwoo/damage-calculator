import { ReactNode, useId } from 'react';
import Toggle from './Toggle';

interface SkillRowProps {
  name: string;
  level: number;
  maxLevel: number;
  minLevel?: number;
  onLevelChange: (level: number) => void;
  /** renderSkillEffect 결과. 레벨을 바꾸면 바로 갱신된다. */
  effect: ReactNode;
  /** 켜고 끄는 버프 스킬만 넘긴다. 없으면 항상 적용되는 스킬로 본다. */
  toggle?: { checked: boolean; onChange: (checked: boolean) => void };
  /** 경고 문구 등 효과 설명 아래에 붙일 내용 */
  children?: ReactNode;
}

/**
 * 스킬 하나를 다루는 행.
 *
 * 레벨은 슬라이더(대충 훑기) + 숫자 입력(정확히 찍기) + M 버튼(만렙)을
 * 모두 제공한다. 31개짜리 select를 여섯 번 여는 것보다 훨씬 빠르다.
 */
export default function SkillRow({
  name,
  level,
  maxLevel,
  minLevel = 0,
  onLevelChange,
  effect,
  toggle,
  children,
}: SkillRowProps) {
  const sliderId = useId();
  const isOff = toggle ? !toggle.checked : false;
  const percent = ((level - minLevel) / (maxLevel - minLevel)) * 100;

  const clamp = (value: number) =>
    Math.max(minLevel, Math.min(maxLevel, Math.round(value)));

  return (
    <div
      className={`rounded-xl border px-3 py-3 transition-colors ${
        isOff ? 'border-line bg-transparent' : 'border-line bg-sunken/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={sliderId}
          className={`text-sm font-semibold ${isOff ? 'text-muted' : 'text-ink'}`}
        >
          {name}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            aria-label={`${name} 레벨`}
            value={level}
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9]/g, '');
              onLevelChange(raw === '' ? minLevel : clamp(Number(raw)));
            }}
            className="field-input w-12 px-0 py-1 text-center text-sm font-semibold tabular-nums"
          />
          <button
            type="button"
            onClick={() => onLevelChange(maxLevel)}
            title={`${name} 만렙 (${maxLevel})`}
            className="ghost-button h-7 w-7 text-xs"
          >
            M
          </button>
          {toggle && (
            <Toggle
              checked={toggle.checked}
              onChange={toggle.onChange}
              label={`${name} 사용`}
              hideLabel
            />
          )}
        </div>
      </div>

      <input
        id={sliderId}
        type="range"
        className="level-range mt-3"
        min={minLevel}
        max={maxLevel}
        value={level}
        onChange={(event) => onLevelChange(Number(event.target.value))}
        style={{
          background: `linear-gradient(to right, rgb(var(--brand)) ${percent}%, rgb(var(--line)) ${percent}%)`,
        }}
      />

      {effect && (
        <p
          className={`mt-2 text-xs leading-relaxed ${
            isOff ? 'text-muted/60' : 'text-muted'
          }`}
        >
          {effect}
        </p>
      )}
      {children}
    </div>
  );
}
