/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin, for example http://127.0.0.1:3000. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
