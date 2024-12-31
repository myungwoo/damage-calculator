const fft = (re: number[], im: number[], invert: boolean = false): void => {
  const n = re.length;
  // 바텀업 버터플라이 구현
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((2 * Math.PI) / len) * (invert ? -1 : 1);
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < len >> 1; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + (len >> 1)];
        const vIm = im[i + j + (len >> 1)];
        // (vRe + ivIm) * (wRe + i*wIm)
        const xRe = vRe * wRe - vIm * wIm;
        const xIm = vRe * wIm + vIm * wRe;
        // butterfly
        re[i + j] = uRe + xRe;
        im[i + j] = uIm + xIm;
        re[i + j + (len >> 1)] = uRe - xRe;
        im[i + j + (len >> 1)] = uIm - xIm;
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

const fftConvolveArrays = (arrA: number[], arrB: number[]): number[] => {
  const outLen = arrA.length + arrB.length - 1;
  let size = 1;
  while (size < outLen) {
    size <<= 1; // 2의 거듭제곱으로
  }
  // re, im 준비
  const reA = new Array(size).fill(0);
  const imA = new Array(size).fill(0);
  const reB = new Array(size).fill(0);
  const imB = new Array(size).fill(0);

  // arrA, arrB 복사
  for (let i = 0; i < arrA.length; i++) reA[i] = arrA[i];
  for (let i = 0; i < arrB.length; i++) reB[i] = arrB[i];

  // FFT
  fft(reA, imA);
  fft(reB, imB);

  // A * B (스펙트럼 곱)
  for (let i = 0; i < size; i++) {
    const tmpRe = reA[i] * reB[i] - imA[i] * imB[i];
    const tmpIm = reA[i] * imB[i] + imA[i] * reB[i];
    reA[i] = tmpRe;
    imA[i] = tmpIm;
  }

  // iFFT
  fft(reA, imA, true);

  // reA[0..outLen-1], imA[]는 0 근접해야 함(소수 오차 존재)
  // 결과를 실수배열로 반환
  const result = new Array(outLen).fill(0);
  for (let i = 0; i < outLen; i++) {
    result[i] = reA[i]; // (imA[i]는 오차 때문에 약간 있을 수 있으나 ~0)
  }
  return result;
};

export { fftConvolveArrays };
