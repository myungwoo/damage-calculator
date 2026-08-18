import { useCallback, useEffect, useRef } from 'react';

interface MonsterHistoryState {
  monsterId: string;
}

const isMonsterHistoryState = (state: unknown): state is MonsterHistoryState =>
  typeof state === 'object' &&
  state !== null &&
  typeof (state as MonsterHistoryState).monsterId === 'string';

/**
 * 소환 대상으로 넘어간 것을 브라우저 뒤로가기로 되돌린다.
 *
 * **URL은 건드리지 않는다.** `pushState`에 주소를 넘기지 않으면 지금 주소 그대로
 * 히스토리 항목만 하나 쌓인다. 그래서 정적 배포(GitHub Pages)에 라우팅을 붙이거나
 * 계산기 상태를 주소에 싣지 않고도 뒤로가기 버튼이 살아난다.
 *
 * 쌓는 시점은 **소환 대상 이름을 눌렀을 때뿐이다.** 드롭다운으로 고르는 것까지 쌓으면
 * 몹을 여러 개 훑어본 뒤에는 뒤로가기를 수십 번 눌러야 페이지를 벗어나게 된다.
 * "링크를 눌러 갔으니 뒤로가기로 돌아온다"까지만 지킨다.
 *
 * 지금 보고 있는 몹은 `replaceState`로 항상 현재 항목에 적어 둔다. 이걸 빼면
 * 드롭다운으로 고른 몹이 항목에 반영되지 않아서, 소환 링크를 눌렀다가 돌아왔을 때
 * 엉뚱한 몹으로 돌아간다.
 *
 * **기존 state를 반드시 펼쳐서 함께 넣는다.** App Router는 자기 표식(`__NA`)이 없는
 * 항목으로 되돌아가면 `window.location.reload()`로 페이지를 통째로 새로 띄운다.
 * 그러면 계산기 입력이 전부 초기화된다. Next가 `pushState`를 감싸서 표식을 옮겨 주긴
 * 하지만, 그 감싸기는 **부모 효과라 이 훅의 첫 `replaceState`보다 늦게 걸린다.**
 * 그래서 훅이 직접 합쳐 준다.
 */
export const useMonsterHistory = (
  selectedMonsterId: string,
  onSelect: (monsterId: string) => void
) => {
  // popstate로 되돌리는 중에는 항목을 새로 쌓지 않는다.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, monsterId: selectedMonsterId },
      ''
    );
  }, [selectedMonsterId]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!isMonsterHistoryState(event.state)) {
        return;
      }
      onSelectRef.current(event.state.monsterId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return useCallback((monsterId: string) => {
    // 주소를 안 넘기면 지금 주소 그대로 항목만 쌓인다.
    window.history.pushState({ ...window.history.state, monsterId }, '');
  }, []);
};
