import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettier from 'eslint-plugin-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "prettier"
  ),
  {
    rules: {
      "prettier/prettier": ["error", {
        singleQuote: true,
        semi: true,
        tabWidth: 2,
        trailingComma: "es5",
        printWidth: 80,
        bracketSpacing: true,
        arrowParens: "always",
      }]
    },
    plugins: {
      prettier,
    }
  }
];

export default eslintConfig;
