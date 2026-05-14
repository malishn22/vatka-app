export const isTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
