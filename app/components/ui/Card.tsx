import { ReactNode } from 'react';

interface CardProps {
  title: string;
  icon?: ReactNode;
  /** 제목 오른쪽에 붙는 요약값. 카드를 접지 않아도 핵심을 볼 수 있게 한다. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Card({
  title,
  icon,
  aside,
  children,
  className = '',
}: CardProps) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          {icon && <span className="text-brand">{icon}</span>}
          {title}
        </h2>
        {aside}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
