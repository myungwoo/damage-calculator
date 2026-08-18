'use client';

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

interface MonsterSpriteProps {
  /** 원작 Mob.wz 몹 ID. 프리셋의 id와 같다 */
  monsterId: string;
  name: string;
}

/**
 * 몬스터 그림.
 *
 * maplestory.io의 렌더 API에서 받아 온다. 버전은 프리셋 몹 ID와 같은 **GMS 83**을 쓴다 —
 * 62나 65로 부르면 그 버전에 없는 몹(시간의 신전 계열 등)이 500으로 떨어진다.
 *
 * 높이를 고정해 두는 이유는 몹마다 그림 크기가 제각각(달팽이 ~ 보스)이기 때문이다.
 * 그림 크기에 맞춰 늘어나게 두면 몹을 바꿀 때마다 아래 입력칸들이 통째로 밀린다.
 */
export default function MonsterSprite({ monsterId, name }: MonsterSpriteProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 몹이 바뀌면 이전 몹의 성공/실패 상태를 그대로 쓰면 안 된다.
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [monsterId]);

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
            key={monsterId}
            src={`https://maplestory.io/api/GMS/83/mob/${monsterId}/render/stand`}
            alt={`${name} 그림`}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`max-h-24 w-auto max-w-full object-contain transition-opacity ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}
    </div>
  );
}
