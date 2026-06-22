/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_TEAM_CODE?: string;
  readonly VITE_EMAIL?: string;
  readonly VITE_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// CSS View Transition API (no siempre tipada en lib.dom).
interface Document {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition: () => void;
  };
}
