import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored agent skill packages are not project source.
    ".agents/**",
  ]),
  {
    rules: {
      // React Compiler-era rule that also fires on the bundled shadcn
      // components (carousel, use-mobile) and on idiomatic "read a browser-only
      // value after mount" / SSR-hydration patterns. Keep it visible as a
      // warning rather than failing on valid code.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
