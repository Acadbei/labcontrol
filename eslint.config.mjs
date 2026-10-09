import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    // React 18 client effects synchronize fetched data and local preferences; React Compiler is not enabled.
    rules: { 'react-hooks/set-state-in-effect': 'off' }
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '**/*.d.mts'])
]);
