import { ChangeEvent } from 'react';

interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  allowUndefined?: boolean;
  id?: string;
  ariaLabel?: string;
  /** 입력칸 오른쪽 안쪽에 붙는 단위 표시 (예: %, 회) */
  suffix?: string;
}

export default function NumberInput({
  value,
  onChange,
  disabled = false,
  placeholder,
  className = '',
  allowUndefined = false,
  id,
  ariaLabel,
  suffix,
}: NumberInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/^0+/, '');
    if (value === '') {
      onChange(allowUndefined ? undefined : 0);
    } else {
      const num = Number(value);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        aria-label={ariaLabel}
        type="text"
        inputMode="numeric"
        value={value === undefined ? '' : value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`field-input tabular-nums ${suffix ? 'pr-8' : ''} ${className}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}
