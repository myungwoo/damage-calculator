/**
 * 주파수 영역으로 변환해 둔 실수 배열.
 * 같은 배열을 여러 번 컨볼루션할 때 정방향 변환을 재사용하기 위해 노출한다.
 */
export interface Spectrum {
  re: Float64Array;
  im: Float64Array;
}

const fft = (
  re: Float64Array,
  im: Float64Array,
  invert: boolean = false
): void => {
  const n = re.length;
  // 바텀업 버터플라이 구현
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tmpRe = re[i];
      re[i] = re[j];
      re[j] = tmpRe;
      const tmpIm = im[i];
      im[i] = im[j];
      im[j] = tmpIm;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((2 * Math.PI) / len) * (invert ? -1 : 1);
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + half];
        const vIm = im[i + j + half];
        // (vRe + i*vIm) * (wRe + i*wIm)
        const xRe = vRe * wRe - vIm * wIm;
        const xIm = vRe * wIm + vIm * wRe;
        // butterfly
        re[i + j] = uRe + xRe;
        im[i + j] = uIm + xIm;
        re[i + j + half] = uRe - xRe;
        im[i + j + half] = uIm - xIm;
        // w *= wlen
        const tRe = wRe * wlenRe - wIm * wlenIm;
        const tIm = wRe * wlenIm + wIm * wlenRe;
        wRe = tRe;
        wIm = tIm;
      }
    }
  }
  if (invert) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
};

/** n 이상인 최소의 2의 거듭제곱 */
export const nextPowerOfTwo = (n: number): number => {
  let size = 1;
  while (size < n) {
    size <<= 1;
  }
  return size;
};

/**
 * 실수 배열을 길이 fftSize로 0-패딩해 정방향 변환한다.
 * fftSize는 컨볼루션 결과 길이 이상인 2의 거듭제곱이어야 한다.
 */
export const fftForward = (
  arr: ArrayLike<number>,
  fftSize: number
): Spectrum => {
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  for (let i = 0; i < arr.length; i++) re[i] = arr[i];
  fft(re, im);
  return { re, im };
};

/**
 * 이미 변환해 둔 스펙트럼과 실수 배열을 컨볼루션한다.
 * 정방향 1회 + 역방향 1회만 수행하므로, 같은 분포를 반복해서 합성할 때
 * fftConvolveArrays(정방향 2회 + 역방향 1회)보다 빠르다.
 */
export const fftConvolveWithSpectrum = (
  arr: ArrayLike<number>,
  spec: Spectrum,
  outLen: number
): Float64Array => {
  const fftSize = spec.re.length;
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  for (let i = 0; i < arr.length; i++) re[i] = arr[i];
  fft(re, im);

  // 스펙트럼 곱
  const specRe = spec.re;
  const specIm = spec.im;
  for (let i = 0; i < fftSize; i++) {
    const tmpRe = re[i] * specRe[i] - im[i] * specIm[i];
    im[i] = re[i] * specIm[i] + im[i] * specRe[i];
    re[i] = tmpRe;
  }

  fft(re, im, true);
  // im[]에는 부동소수점 오차 때문에 0에 근접한 값이 남으므로 버린다
  return re.subarray(0, outLen);
};

/** 두 실수 배열의 컨볼루션 */
export const fftConvolveArrays = (
  arrA: ArrayLike<number>,
  arrB: ArrayLike<number>
): Float64Array => {
  const outLen = arrA.length + arrB.length - 1;
  const fftSize = nextPowerOfTwo(outLen);
  return fftConvolveWithSpectrum(arrA, fftForward(arrB, fftSize), outLen);
};
