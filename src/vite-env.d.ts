/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL?: string
  readonly VITE_ROOT_DOMAIN?: string
  readonly VITE_DEFAULT_TENANT_SLUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
