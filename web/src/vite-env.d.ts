// / <reference types="vite/client" />

/** ISO-8601 timestamp injected by Vite (`define` in vite.config.ts) — the moment
 *  this bundle was built (production) or the dev server started (local). The
 *  header version badge shows it as the local "startup time". */
declare const __BUILD_TIME__: string;
