/**
 * 한글 이름 검색 (부분 수열 + 초성).
 *
 * 검색어가 이름의 **부분 수열**이면 통과다 — 붙어 있지 않아도 순서만 맞으면 된다.
 * "후회수호"로 "후회의 수호대장"이 나오는 것이 이 규칙이다.
 * 한 글자를 견주는 규칙은 아래 세 가지뿐이고, 나머지는 전부 여기서 파생된다.
 *
 * | 검색어 글자 | 이름 글자와 맞는 조건 | 예 |
 * | --- | --- | --- |
 * | 완성된 음절 | 자모 앞부분이 같다 (초성 · 중성이 같고 종성은 앞부분) | `자` -> `장`, `달` -> `닭` |
 * | 자음 하나 | 그 음절의 초성이 같다 | `ㅅ` -> `수` |
 * | 모음 하나 | 그 음절의 중성이 같거나 겹모음의 첫 글자다 | `ㅗ` -> `호`, `과` |
 *
 * **음절을 앞부분까지만 견주는 것이 IME를 위한 장치다.** 한글은 글자를 조립하는
 * 도중에도 완성된 음절로 보이므로("장"을 치는 동안 `ㅈ` -> `자` -> `장`),
 * 앞부분 일치를 허용하지 않으면 조립 중간에 목록이 비었다가 다시 차는 깜빡임이 생긴다.
 * 같은 이유로 자음 · 모음 한 글자도 그 자리의 초성 · 중성과 견준다 — 초성 검색은
 * 별도 기능이 아니라 이 규칙의 결과다.
 *
 * 반대로 **자음을 종성과는 견주지 않는다.** `ㅁ`이 "감"에 걸리면 초성 검색의
 * 결과가 통째로 흐려진다.
 */

const SYLLABLE_BASE = 0xac00;
const SYLLABLE_COUNT = 11172;
const MEDIAL_COUNT = 21;
const FINAL_COUNT = 28;

/**
 * 초성 · 중성을 호환 자모(U+3131~U+3163)로 늘어놓은 표. 인덱스가 곧 자모 번호다.
 * 키보드로 자음 · 모음 하나만 치면 이 영역의 글자가 들어온다.
 */
const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNGSEONG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';

/** 조합용 자모(U+1100~) 영역. NFC로 합쳐지지 않고 홀로 남은 자모를 위한 것이다. */
const JAMO_CHOSEONG_BASE = 0x1100;
const JAMO_JUNGSEONG_BASE = 0x1161;

/** 겹모음의 첫 모음(중성 번호). 겹모음이 아니면 -1. (ㅘ -> ㅗ) */
const JUNGSEONG_FIRST: readonly number[] = [
  -1, -1, -1, -1, -1, -1, -1, -1, -1, 8, 8, 8, -1, -1, 13, 13, 13, -1, -1, 18,
  -1,
];

/** 겹받침의 첫 자음(종성 번호). 겹받침이 아니면 -1. (ㄺ -> ㄹ) */
const JONGSEONG_FIRST: readonly number[] = [
  -1, -1, -1, 1, -1, 4, 4, -1, -1, 8, 8, 8, 8, 8, 8, 8, -1, -1, 17, -1, -1, -1,
  -1, -1, -1, -1, -1, -1,
];

type QueryUnit =
  | { kind: 'syllable'; cho: number; jung: number; jong: number }
  | { kind: 'choseong'; cho: number }
  | { kind: 'jungseong'; jung: number }
  | { kind: 'plain'; code: number };

export interface HangulMatch {
  /**
   * NFC로 맞춘 이름. **`indices`는 이 글자열 기준이다.**
   * 정규화가 글자 수를 바꿀 수 있어서(NFD로 들어온 이름) 위치와 글자열을 같이 준다 —
   * 강조 표시가 한 글자씩 밀리는 것을 애초에 못 하게 하는 것이다.
   */
  text: string;
  /** 일치한 글자 위치(오름차순). 검색어가 비면 빈 배열이다. */
  indices: number[];
}

export interface HangulMatcher {
  /** 검색어가 이름의 부분 수열인가. */
  matches(target: string): boolean;
  /** 일치한 자리까지 같이 준다. 안 걸리면 null. */
  match(target: string): HangulMatch | null;
}

/**
 * 검색어 · 이름을 같은 기준으로 맞춘다. macOS 클립보드처럼 NFD로 들어오는 글자가 있다.
 * **소문자 변환은 여기서 하지 않는다** — 글자 수가 바뀔 수 있어서 강조 표시 위치가
 * 밀리고, 이름 전체를 새 글자열로 만드는 비용도 든다. 대소문자는 `fold`가 글자마다 접는다.
 */
function toNfc(value: string): string {
  return value.normalize('NFC');
}

/** 한글 음절 · 자모 영역. 여기에는 대소문자가 없다. */
function isHangul(code: number): boolean {
  return (
    (code >= SYLLABLE_BASE && code < SYLLABLE_BASE + SYLLABLE_COUNT) ||
    (code >= 0x3130 && code <= 0x318f) ||
    (code >= 0x1100 && code <= 0x11ff)
  );
}

/**
 * 대소문자만 무시하는 글자 접기.
 *
 * ASCII와 한글은 산술로 끝내고, 그 밖의 글자만 일반 경로로 보낸다.
 * **한글을 먼저 걸러내는 것이 성능의 핵심이다** — 일반 경로는 글자마다 새 글자열을
 * 만들어서, 그냥 두면 검색어에 알파벳이 하나 있을 때 이름의 한글 전부가 그 경로를 탄다
 * (438종에 86us. 한글을 걸러내면 30us다).
 */
function fold(code: number): number {
  if (code >= 0x41 && code <= 0x5a) {
    return code + 0x20;
  }
  if (code < 0x80 || isHangul(code)) {
    return code;
  }
  return String.fromCharCode(code).toLowerCase().charCodeAt(0);
}

/** 검색어 한 글자를 견주는 규칙으로 바꾼다. 한글이 아니면 글자 그대로 비교한다. */
function toQueryUnit(code: number): QueryUnit {
  const offset = code - SYLLABLE_BASE;
  if (offset >= 0 && offset < SYLLABLE_COUNT) {
    return {
      kind: 'syllable',
      cho: Math.floor(offset / (MEDIAL_COUNT * FINAL_COUNT)),
      jung: Math.floor(offset / FINAL_COUNT) % MEDIAL_COUNT,
      jong: offset % FINAL_COUNT,
    };
  }

  const compatConsonant = CHOSEONG.indexOf(String.fromCharCode(code));
  if (compatConsonant !== -1) {
    return { kind: 'choseong', cho: compatConsonant };
  }

  const compatVowel = JUNGSEONG.indexOf(String.fromCharCode(code));
  if (compatVowel !== -1) {
    return { kind: 'jungseong', jung: compatVowel };
  }

  // 홀로 남은 조합용 자모. 호환 자모와 같은 순서라 번호를 그대로 쓴다.
  const jamoCho = code - JAMO_CHOSEONG_BASE;
  if (jamoCho >= 0 && jamoCho < CHOSEONG.length) {
    return { kind: 'choseong', cho: jamoCho };
  }
  const jamoJung = code - JAMO_JUNGSEONG_BASE;
  if (jamoJung >= 0 && jamoJung < JUNGSEONG.length) {
    return { kind: 'jungseong', jung: jamoJung };
  }

  return { kind: 'plain', code: fold(code) };
}

/** 중성이 같거나, 이름 쪽 겹모음의 첫 모음이 검색어 모음이면 통과다. */
function jungseongMatches(queryJung: number, targetJung: number): boolean {
  return queryJung === targetJung || JUNGSEONG_FIRST[targetJung] === queryJung;
}

function unitMatches(unit: QueryUnit, code: number): boolean {
  if (unit.kind === 'plain') {
    return unit.code === fold(code);
  }

  const offset = code - SYLLABLE_BASE;
  if (offset < 0 || offset >= SYLLABLE_COUNT) {
    return false;
  }
  const cho = Math.floor(offset / (MEDIAL_COUNT * FINAL_COUNT));
  const jung = Math.floor(offset / FINAL_COUNT) % MEDIAL_COUNT;
  const jong = offset % FINAL_COUNT;

  if (unit.kind === 'choseong') {
    return unit.cho === cho;
  }
  if (unit.kind === 'jungseong') {
    return jungseongMatches(unit.jung, jung);
  }

  if (unit.cho !== cho) {
    return false;
  }
  // 종성까지 찍은 검색어는 조립이 끝난 것이므로 중성을 정확히 견준다.
  if (unit.jong !== 0) {
    return (
      unit.jung === jung &&
      (unit.jong === jong || JONGSEONG_FIRST[jong] === unit.jong)
    );
  }
  return jungseongMatches(unit.jung, jung);
}

/**
 * 검색어를 규칙 배열로 미리 컴파일한 판정기를 만든다.
 *
 * 이름 하나마다 검색어를 다시 해석하면 낭비다 — 몹 438종에 매 타자마다 도는 자리라
 * 검색어 해석은 한 번만 하고, 이름 쪽은 글자 코드만 훑는다.
 * 검색어가 비면 전부 통과다.
 */
export function createHangulMatcher(query: string): HangulMatcher {
  // 검색어의 공백은 요구 조건에서 뺀다. "후회 수호"의 공백을 이름에서도 찾게 하면
  // 붙여 쓴 이름이 안 걸려서, 공백을 넣는 쪽이 오히려 결과가 좁아진다.
  const normalized = toNfc(query).replace(/\s+/g, '');

  const units: QueryUnit[] = [];
  for (let i = 0; i < normalized.length; i += 1) {
    units.push(toQueryUnit(normalized.charCodeAt(i)));
  }

  /**
   * 앞에서부터 욕심껏 맞춰 **가장 이른 끝 위치**를 찾는다. 부분 수열은 이렇게 맞춰도
   * 최적이다 — 글자 판정이 서로 독립이라 나중 후보를 택해서 더 잘 맞는 경우가 없다.
   * 안 걸리면 -1.
   */
  const findEnd = (name: string): number => {
    let at = 0;
    for (let u = 0; u < units.length; u += 1) {
      const unit = units[u];
      while (at < name.length && !unitMatches(unit, name.charCodeAt(at))) {
        at += 1;
      }
      if (at >= name.length) {
        return -1;
      }
      at += 1;
    }
    return at;
  };

  return {
    matches: (target: string) =>
      units.length === 0 || findEnd(toNfc(target)) !== -1,

    match: (target: string) => {
      const text = toNfc(target);
      if (units.length === 0) {
        return { text, indices: [] };
      }
      const end = findEnd(text);
      if (end === -1) {
        return null;
      }

      /**
       * 끝 위치에서 **거꾸로 다시 맞춰** 강조할 자리를 정한다.
       * 앞에서부터 맞춘 자리를 그대로 쓰면 붙어 있는 일치를 흩어 놓는다 —
       * "가가나"에서 "가나"를 찾으면 0 · 2를 잡아 사이 글자를 건너뛴 것처럼 보인다.
       * 같은 끝 위치에서 뒤에서부터 당기면 그 안에서 폭이 가장 좁은 일치가 되므로,
       * 붙어 있는 구간은 항상 붙은 채로 강조된다(1 · 2).
       */
      const indices = new Array<number>(units.length);
      let at = end - 1;
      for (let u = units.length - 1; u >= 0; u -= 1) {
        while (at >= 0 && !unitMatches(units[u], text.charCodeAt(at))) {
          at -= 1;
        }
        // 앞에서 이미 맞춰 봤으므로 여기서 못 찾는 경우는 없다.
        if (at < 0) {
          return null;
        }
        indices[u] = at;
        at -= 1;
      }
      return { text, indices };
    },
  };
}

/** 한 번만 쓸 때를 위한 감싸개. 목록을 거를 때는 `createHangulMatcher`를 쓴다. */
export function matchesHangulSearch(target: string, query: string): boolean {
  return createHangulMatcher(query).matches(target);
}
