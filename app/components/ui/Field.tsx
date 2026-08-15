import { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** 라벨 + 입력 + 보조 설명을 한 덩어리로 묶는다. 세로 간격을 여기서만 정한다. */
export default function Field({
  label,
  htmlFor,
  hint,
  children,
  className = '',
}: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
