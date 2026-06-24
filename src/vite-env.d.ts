/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_BACKEND_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_DRIVE_FILE_IMPORT_ENABLED?: string;
  readonly VITE_GOOGLE_GMAIL_IMPORT_ENABLED?: string;
  readonly VITE_GOOGLE_INTEGRATION_ENABLED?: string;
  readonly VITE_GOOGLE_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
