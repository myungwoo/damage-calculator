import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { LEGACY_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from './constants/theme';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '메이플랜드 데미지 계산기',
  description: '나이트로드, 허밋 (표창도적) N방컷 계산기',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f9' },
    { media: '(prefers-color-scheme: dark)', color: '#090b10' },
  ],
};

/**
 * 하이드레이션 전에 테마 클래스를 붙여 첫 페인트에서 색이 튀는 것을 막는다.
 *
 * 키는 사이트 전체가 공유한다(mapleland.myungwoo.kr 의 유틸들이 같은 값을 쓴다).
 * 새 키가 비어 있으면 접두어 없던 예전 키에서 한 번 옮겨 온다. 'system' 과 알 수 없는
 * 값은 시스템 설정으로 취급하고 **덮어쓰지 않는다** — 여기서 덮어쓰면 다른 유틸에서
 * 고른 '시스템' 설정이 사라진다.
 */
const themeScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var t=localStorage.getItem(k);if(t===null){t=localStorage.getItem('${LEGACY_THEME_STORAGE_KEY}');if(t!==null){localStorage.setItem(k,t);}}var c=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.classList.add(c);document.documentElement.style.colorScheme=c;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
