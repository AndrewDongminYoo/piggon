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
    "supabase/.branches/**",
    "supabase/.temp/**",
  ]),
  {
    // Keep LAST so it wins the settings merge over eslint-config-next.
    settings: {
      react: {
        // Pin the React version so eslint-plugin-react skips auto-detection.
        // detectReactVersion() calls context.getFilename(), removed in ESLint 10.
        version: "19.2",
      },
    },
  },
]);

export default eslintConfig;
