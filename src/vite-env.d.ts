/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_APP_BASE_URL: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_CURRENCY: string;
  readonly VITE_SERVICE_WORKER_ENABLED: string;
  readonly VITE_I18N_SI_ENABLED: string;
  readonly VITE_I18N_TA_ENABLED: string;
  readonly VITE_BUILD_TIME: string;
  readonly VITE_GIT_COMMIT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}








