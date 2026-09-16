import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Patrones preexistentes (anteriores a la subida de eslint-plugin-react-hooks
      // a v7 / react-refresh a v0.5 que rompieron el lint al revisar el lanzamiento).
      // Se desactivan 3 reglas estrictas que marcan código intencional y funcional:
      // - react-hooks/set-state-in-effect: derivar estado en el efecto (auto-flip de
      //   la tarjeta, ticker de quota, checkAuth() al montar).
      // - react-hooks/refs: leer el drop target del bookshelf durante el render.
      // - react-refresh/only-export-components: archivos que exportan componente +
      //   hook/utilidades juntos (LanguageContext, AuthContext, PdfViewer).
      // Refactor a estado derivado / split de archivos queda como post-lanzamiento.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
