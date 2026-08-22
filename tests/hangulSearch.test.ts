import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHangulMatcher,
  matchesHangulSearch,
} from '../app/utils/hangulSearch';
import { monsterPresets } from '../app/data/monsterPresets';

const 후회 = '후회의 수호대장';

test('붙어 있지 않아도 순서만 맞으면 걸린다', () => {
  assert.ok(matchesHangulSearch(후회, '후회수호'));
  assert.ok(matchesHangulSearch(후회, '후수대'));
  assert.ok(matchesHangulSearch(후회, '수호대장'));
  assert.ok(matchesHangulSearch(후회, 후회));
  // 순서가 어긋나면 안 걸린다 — 부분 수열은 순서를 지킨다.
  assert.ok(!matchesHangulSearch(후회, '수호후회'));
  // 이름에 없는 글자가 하나라도 있으면 안 걸린다.
  assert.ok(!matchesHangulSearch(후회, '후회수호대장군'));
});

test('빈 검색어와 공백은 요구 조건에서 뺀다', () => {
  assert.ok(matchesHangulSearch(후회, ''));
  assert.ok(matchesHangulSearch(후회, '   '));
  assert.ok(matchesHangulSearch(후회, '후회 수호'));
  // 이름의 공백 위치와 다르게 띄어 써도 걸린다.
  assert.ok(matchesHangulSearch(후회, '후회수 호'));
});

test('초성만 쳐도 걸린다', () => {
  assert.ok(matchesHangulSearch(후회, 'ㅎㅎㅅㅎ'));
  assert.ok(matchesHangulSearch(후회, 'ㅎㅎㅇㅅㅎㄷㅈ'));
  assert.ok(matchesHangulSearch(후회, 'ㅅㅎㄷㅈ'));
  assert.ok(!matchesHangulSearch(후회, 'ㅎㅎㅎㅎㅎ'));
  // 순서가 어긋난 초성은 안 걸린다.
  assert.ok(!matchesHangulSearch(후회, 'ㄷㅈㅅㅎ'));
});

test('음절과 초성을 섞어 쳐도 걸린다', () => {
  assert.ok(matchesHangulSearch(후회, '후회ㅅㅎ'));
  assert.ok(matchesHangulSearch(후회, 'ㅎ회수ㅈ'));
});

test('자음은 초성에만 걸리고 종성에는 걸리지 않는다', () => {
  // "대장"의 ㅇ은 종성이라 초성 ㅇ으로 세지 않는다.
  assert.ok(matchesHangulSearch('대장', 'ㄷㅈ'));
  assert.ok(!matchesHangulSearch('대장', 'ㄷㅈㅇ'));
  assert.ok(!matchesHangulSearch('감', 'ㄱㅁ'));
});

test('조립이 끝나지 않은 음절도 걸린다 (IME 중간 상태)', () => {
  // "장"을 치는 동안 ㅈ -> 자 -> 장을 거치는데, 중간에 목록이 비면 깜빡인다.
  for (const query of ['수호대ㅈ', '수호대자', '수호대장']) {
    assert.ok(matchesHangulSearch(후회, query), query);
  }
  // 겹받침도 첫 자음까지 찍은 상태에서 걸린다.
  assert.ok(matchesHangulSearch('닭장', '달'));
  assert.ok(matchesHangulSearch('닭장', '닭'));
  assert.ok(!matchesHangulSearch('닭장', '담'));
  // 겹모음도 첫 모음까지 찍은 상태에서 걸린다.
  assert.ok(matchesHangulSearch('과일', '고'));
  assert.ok(!matchesHangulSearch('과일', '기'));
});

test('종성까지 찍은 검색어는 중성을 정확히 견준다', () => {
  assert.ok(matchesHangulSearch('왕', '왕'));
  // 검색어 "옹"은 조립이 끝난 글자라 "왕"으로 넓히지 않는다.
  assert.ok(!matchesHangulSearch('왕', '옹'));
});

test('모음 하나는 중성으로 견준다', () => {
  assert.ok(matchesHangulSearch(후회, 'ㅎㅗ'));
  assert.ok(!matchesHangulSearch('수호', 'ㅎㅏ'));
});

test('한글이 아닌 글자는 대소문자만 무시하고 그대로 견준다', () => {
  assert.ok(matchesHangulSearch('머신 MT-09', 'mt09'));
  assert.ok(matchesHangulSearch('머신 MT-09', '머MT'));
  assert.ok(matchesHangulSearch('Black Bird', 'bkbd'));
  assert.ok(!matchesHangulSearch('Black Bird', 'bdbk'));
});

test('NFD로 들어온 검색어도 같게 본다', () => {
  assert.ok(matchesHangulSearch(후회, '후회수호'.normalize('NFD')));
  assert.ok(matchesHangulSearch(후회.normalize('NFD'), '후회수호'));
});

test('부분 문자열로 걸리던 검색은 전부 그대로 걸린다', () => {
  // 부분 수열은 부분 문자열의 확장이라, 예전 규칙의 결과를 하나도 잃지 않아야 한다.
  const queries = ['자쿰', '주니어', '와이번', '레', 'ㄱ', '나이트'];
  for (const query of queries) {
    const matcher = createHangulMatcher(query);
    const substring = monsterPresets.filter((preset) =>
      preset.name.toLowerCase().includes(query.toLowerCase())
    );
    for (const preset of substring) {
      assert.ok(matcher(preset.name), `${query} -> ${preset.name}`);
    }
  }
});

test('실제 프리셋에서 노리는 몹이 걸린다', () => {
  const byQuery = (query: string) => {
    const matcher = createHangulMatcher(query);
    return monsterPresets.filter((preset) => matcher(preset.name));
  };

  assert.ok(byQuery('후회수호').some((preset) => preset.name === 후회));
  assert.ok(byQuery('ㅁㄱㅅㅎ').some((preset) => preset.name.includes('망각')));
  assert.ok(
    byQuery('ㅋㅇㅅㅈㅋ').some((preset) => preset.name.includes('카오스 자쿰'))
  );
});
