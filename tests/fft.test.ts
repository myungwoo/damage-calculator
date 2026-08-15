import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fftConvolveArrays,
  fftConvolveWithSpectrum,
  fftForward,
  nextPowerOfTwo,
} from '../app/utils/fft';
import { createRandom } from './helpers/reference';

/** 정의 그대로 계산하는 컨볼루션 */
const naiveConvolve = (a: number[], b: number[]): number[] => {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] += a[i] * b[j];
    }
  }
  return out;
};

const randomArray = (length: number, seed: number): number[] => {
  const random = createRandom(seed);
  return Array.from({ length }, () => random() / length);
};

describe('nextPowerOfTwo', () => {
  it('n 이상인 최소의 2의 거듭제곱을 돌려준다', () => {
    assert.equal(nextPowerOfTwo(1), 1);
    assert.equal(nextPowerOfTwo(2), 2);
    assert.equal(nextPowerOfTwo(3), 4);
    assert.equal(nextPowerOfTwo(32767), 32768);
    assert.equal(nextPowerOfTwo(32768), 32768);
    assert.equal(nextPowerOfTwo(32769), 65536);
  });

  it('HP 해상도 상한에서 FFT 길이가 32768을 넘지 않는다', () => {
    // damageCalculator의 MAX_HP_RESOLUTION = 16383 근거
    assert.equal(nextPowerOfTwo(2 * (16383 + 1) - 1), 32768);
    assert.equal(nextPowerOfTwo(2 * (16384 + 1) - 1), 65536);
  });
});

describe('fftConvolveArrays', () => {
  it('정의대로 계산한 컨볼루션과 일치한다', () => {
    for (const length of [1, 7, 64, 300, 1001]) {
      const a = randomArray(length, length * 17 + 1);
      const b = randomArray(length, length * 31 + 2);
      const actual = fftConvolveArrays(a, b);
      const expected = naiveConvolve(a, b);

      assert.equal(actual.length, expected.length);
      for (let i = 0; i < expected.length; i++) {
        assert.ok(
          Math.abs(actual[i] - expected[i]) < 1e-12,
          `길이 ${length}, 인덱스 ${i}: ${actual[i]} !== ${expected[i]}`
        );
      }
    }
  });

  it('길이가 다른 배열도 처리한다', () => {
    const a = randomArray(50, 3);
    const b = randomArray(120, 4);
    const actual = fftConvolveArrays(a, b);
    const expected = naiveConvolve(a, b);

    assert.equal(actual.length, expected.length);
    for (let i = 0; i < expected.length; i++) {
      assert.ok(Math.abs(actual[i] - expected[i]) < 1e-12);
    }
  });
});

describe('fftConvolveWithSpectrum', () => {
  it('미리 변환해 둔 스펙트럼을 써도 결과가 같다', () => {
    const a = randomArray(300, 11);
    const b = randomArray(300, 12);
    const outLen = a.length + b.length - 1;

    const expected = fftConvolveArrays(a, b);
    const spectrum = fftForward(b, nextPowerOfTwo(outLen));
    const actual = fftConvolveWithSpectrum(a, spectrum, outLen);

    assert.equal(actual.length, expected.length);
    for (let i = 0; i < expected.length; i++) {
      assert.ok(Math.abs(actual[i] - expected[i]) < 1e-12);
    }
  });

  it('같은 스펙트럼을 여러 번 재사용해도 값이 변하지 않는다', () => {
    const a = randomArray(128, 21);
    const b = randomArray(128, 22);
    const outLen = a.length + b.length - 1;
    const spectrum = fftForward(b, nextPowerOfTwo(outLen));

    const first = Array.from(fftConvolveWithSpectrum(a, spectrum, outLen));
    const second = Array.from(fftConvolveWithSpectrum(a, spectrum, outLen));

    assert.deepEqual(second, first);
  });
});
