/**
 * 테마는 사이트 전체가 공유하는 설정이다.
 *
 * mapleland.myungwoo.kr 은 유틸 여러 개가 한 오리진을 쓰고(myungwoo.github.io 도
 * 마찬가지다), 다크모드를 앱마다 따로 기억하면 같은 사이트인데 화면이 튄다.
 * 그래서 이 키는 일부러 앱 접두어 없이 공유하고, 값 집합('light' | 'dark' | 'system')을
 * 다른 유틸과 맞춘다. 모르는 값을 만나면 덮어쓰지 말고 시스템 설정으로 취급할 것 —
 * 예전에 이 앱이 'system' 을 무효 값으로 보고 덮어써서, 다른 유틸의 선택을 지웠다.
 */
export const THEME_STORAGE_KEY = 'ml:theme';

/** 접두어를 붙이기 전에 쓰던 키. 새 키가 없을 때 한 번 복사해 온다. */
export const LEGACY_THEME_STORAGE_KEY = 'theme';
