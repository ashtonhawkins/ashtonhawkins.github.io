import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import astroPlugin from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

const astroConfigs = astroPlugin.configs["flat/recommended"];

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "public",
      ".astro",
      "postcss.config.cjs",
      "tailwind.config.mjs",
      "astro.config.ts",
      "tsconfig.json",
      "eslint.config.js",
      "scripts/aggregate.ts",
      "src/components/resume/**/*",
      "src/pages/resume.astro"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroConfigs,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      react: reactPlugin
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off"
    }
  },
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      react: reactPlugin
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off"
    }
  },
  {
    files: ["src/**/*.astro"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        extraFileExtensions: [".astro"]
      }
    },
    rules: {
      "astro/no-set-html-directive": "error"
    }
  }
);
