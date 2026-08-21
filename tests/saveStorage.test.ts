import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { migrateLegacySaveSlots } from '../app/utils/saveStorage';
import {
  LEGACY_STORAGE_KEY_PREFIX,
  SAVE_SLOTS,
  STORAGE_KEY_PREFIX,
} from '../app/constants/calculator';

/**
 * 브라우저 없이 돌리므로 localStorage 를 최소한으로 흉내낸다.
 * 마이그레이션이 쓰는 건 getItem / setItem 뿐이다.
 */
const installFakeStorage = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage;
  return store;
};

describe('저장 슬롯 키 마이그레이션', () => {
  beforeEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('접두어 없던 예전 슬롯을 새 키로 옮긴다', () => {
    const store = installFakeStorage({
      [`${LEGACY_STORAGE_KEY_PREFIX}0`]: '{"slot":0}',
      [`${LEGACY_STORAGE_KEY_PREFIX}2`]: '{"slot":2}',
    });

    migrateLegacySaveSlots();

    assert.equal(store.get(`${STORAGE_KEY_PREFIX}0`), '{"slot":0}');
    assert.equal(store.get(`${STORAGE_KEY_PREFIX}2`), '{"slot":2}');
    // 없던 슬롯을 만들어내지는 않는다.
    assert.equal(store.has(`${STORAGE_KEY_PREFIX}1`), false);
  });

  it('예전 키를 지우지 않는다 (배포를 되돌려도 저장이 남아야 한다)', () => {
    const store = installFakeStorage({
      [`${LEGACY_STORAGE_KEY_PREFIX}0`]: '{"slot":0}',
    });

    migrateLegacySaveSlots();

    assert.equal(store.get(`${LEGACY_STORAGE_KEY_PREFIX}0`), '{"slot":0}');
  });

  it('새 키에 값이 있으면 예전 값으로 덮어쓰지 않는다', () => {
    const store = installFakeStorage({
      [`${STORAGE_KEY_PREFIX}0`]: '{"new":true}',
      [`${LEGACY_STORAGE_KEY_PREFIX}0`]: '{"old":true}',
    });

    migrateLegacySaveSlots();

    assert.equal(store.get(`${STORAGE_KEY_PREFIX}0`), '{"new":true}');
  });

  it('여러 번 불러도 결과가 같다', () => {
    const store = installFakeStorage({
      [`${LEGACY_STORAGE_KEY_PREFIX}1`]: '{"slot":1}',
    });

    migrateLegacySaveSlots();
    store.set(`${STORAGE_KEY_PREFIX}1`, '{"edited":true}');
    migrateLegacySaveSlots();

    assert.equal(store.get(`${STORAGE_KEY_PREFIX}1`), '{"edited":true}');
  });

  it('localStorage 가 막혀 있어도 던지지 않는다', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('보안 정책으로 접근 불가');
      },
      setItem: () => {},
    };

    assert.doesNotThrow(() => migrateLegacySaveSlots());
  });

  it('슬롯 개수 상수를 따라간다', () => {
    const initial: Record<string, string> = {};
    for (let slot = 0; slot < SAVE_SLOTS + 2; slot++) {
      initial[`${LEGACY_STORAGE_KEY_PREFIX}${slot}`] = `{"slot":${slot}}`;
    }
    const store = installFakeStorage(initial);

    migrateLegacySaveSlots();

    assert.equal(store.has(`${STORAGE_KEY_PREFIX}${SAVE_SLOTS - 1}`), true);
    // 슬롯 밖의 예전 값은 건드리지 않는다.
    assert.equal(store.has(`${STORAGE_KEY_PREFIX}${SAVE_SLOTS}`), false);
  });
});
