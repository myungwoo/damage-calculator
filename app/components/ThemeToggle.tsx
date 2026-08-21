'use client';

import { useCallback, useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '../constants/theme';

type Theme = 'light' | 'dark' | 'system';

const ORDER: Theme[] = ['light', 'dark', 'system'];

const LABEL: Record<Theme, string> = {
  light: '밝은 테마',
  dark: '어두운 테마',
  system: '시스템 설정',
};

const readStoredTheme = (): Theme => {
  try {
    const stored =
      localStorage.getItem(THEME_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    // 'system' 이나 알 수 없는 값은 시스템 설정으로 본다. 다른 유틸이 써 둔 값을
    // 이해하지 못해 덮어쓰면, 그쪽 선택이 사라진다.
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
};

const applyTheme = (theme: Theme) => {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // 시크릿 모드처럼 localStorage 가 막힌 환경에서는 이번 세션만 적용된다.
    }
  }, [theme, mounted]);

  // 시스템 설정을 따르는 동안에는 OS 쪽 변경을 실시간으로 반영한다.
  useEffect(() => {
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((prev) => ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length]);
  }, []);

  const Icon = theme === 'light' ? Moon : theme === 'dark' ? Monitor : Sun;
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={cycle}
      className="ghost-button h-9 w-9"
      aria-label={`${LABEL[theme]} · 눌러서 ${LABEL[next]}로 전환`}
      title={LABEL[theme]}
    >
      {mounted && <Icon className="h-4 w-4" />}
    </button>
  );
}
