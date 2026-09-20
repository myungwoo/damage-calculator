import { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  /** 라벨 오른쪽 빈 자리에 붙는 작은 컨트롤. 줄을 늘리지 않고 버튼을 얹을 때 쓴다 */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** 라벨 + 입력 + 보조 설명을 한 덩어리로 묶는다. 세로 간격을 여기서만 정한다. */
export default function Field({
  label,
  htmlFor,
  hint,
  action,
  children,
  className = '',
}: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {action ? (
        <div className="flex items-center justify-between gap-2">
          <label className="field-label" htmlFor={htmlFor}>
            {label}
          </label>
          {action}
        </div>
      ) : (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
