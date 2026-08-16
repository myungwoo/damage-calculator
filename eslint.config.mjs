import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import prettier from 'eslint-plugin-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    rules: {
      // 포맷 규칙은 .prettierrc.json 하나만 본다.
      // 여기에 옵션을 다시 적으면 `npm run format`과 어긋날 수 있다.
      'prettier/prettier': 'error',
    },
    plugins: {
      prettier,
    },
  },
];

export default eslintConfig;
