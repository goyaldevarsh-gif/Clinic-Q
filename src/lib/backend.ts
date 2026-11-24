/** Demo (localStorage) by default. Real mode needs VITE_BACKEND=firebase and VITE_FIREBASE_CONFIG='{"apiKey":...}' at build time. */
function parse(): Record<string, string> | null {
  try { const raw = import.meta.env.VITE_FIREBASE_CONFIG as string | undefined; return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export const FB_CONFIG = parse();
export const USE_FB = import.meta.env.VITE_BACKEND === 'firebase' && !!FB_CONFIG;
