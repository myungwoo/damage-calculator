'use client';

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

interface MonsterSpriteProps {
  /** 원작 Mob.wz 몹 ID. 프리셋의 id와 같다 */
  monsterId: string;
  name: string;
}

/**
 * 그림을 찾아볼 순서.
 *
 * 한 주소로는 프리셋을 다 못 그린다.
 * - **동작 이름이 몹마다 다르다.** 나는 몹은 `stand`가 아예 없고 `fly`뿐이라
 *   (다크 와이번 · 카오스 푸코 계열) `stand`만 부르면 404가 난다.
 * - **버전도 몹마다 다르다.** 카오스 자쿰 16종은 기준 버전 v83에 없어서 500이 나고
 *   처음 들어온 v88에서만 그려진다.
 *
 * 그래서 기준 버전을 먼저 시도하고, 안 되면 다음 후보로 내려간다. 순서를 뒤집으면
 * v83에 있는 몹까지 v88 그림을 받게 되므로 **기준 버전이 항상 앞**이다.
 */
const SPRITE_SOURCES = [
  { version: '83', action: 'stand' },
  { version: '83', action: 'fly' },
  { version: '88', action: 'stand' },
  { version: '88', action: 'fly' },
] as const;

/**
 * 몬스터 그림.
 *
 * maplestory.io의 렌더 API에서 받아 온다. 버전은 프리셋 몹 ID와 같은 **GMS 83**이
 * 기본이다 — 62나 65로 부르면 그 버전에 없는 몹(시간의 신전 계열 등)이 500으로 떨어진다.
 *
 * 높이를 고정해 두는 이유는 몹마다 그림 크기가 제각각(달팽이 ~ 보스)이기 때문이다.
 * 그림 크기에 맞춰 늘어나게 두면 몹을 바꿀 때마다 아래 입력칸들이 통째로 밀린다.
 */
export default function MonsterSprite({ monsterId, name }: MonsterSpriteProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // 몹이 바뀌면 이전 몹의 성공/실패 상태를 그대로 쓰면 안 된다.
  useEffect(() => {
    setSourceIndex(0);
    setLoaded(false);
  }, [monsterId]);

  const source = SPRITE_SOURCES[sourceIndex];
  const failed = source === undefined;

  return (
    <div className="relative flex h-28 items-center justify-center rounded-xl border border-line bg-sunken/50">
      {failed ? (
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <ImageOff className="h-3.5 w-3.5" />
          그림을 불러오지 못했다
        </span>
      ) : (
        <>
          {!loaded && (
            <span className="absolute text-xs text-muted">불러오는 중…</span>
          )}
          {/*
            다 받을 때까지 `hidden`으로 숨기면 안 된다 — 화면에서 빠진 이미지는
            뷰포트에 들어올 일이 없어서 브라우저가 아예 받지 않는다.
            자리는 잡아 두고 투명도만 0으로 둔다. 열었을 때만 마운트되므로
            `loading="lazy"`도 필요 없다.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`${monsterId}-${sourceIndex}`}
            src={`https://maplestory.io/api/GMS/${source.version}/mob/${monsterId}/render/${source.action}`}
            alt={`${name} 그림`}
            onLoad={() => setLoaded(true)}
            onError={() => setSourceIndex((index) => index + 1)}
            className={`max-h-24 w-auto max-w-full object-contain transition-opacity ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}
    </div>
  );
}
