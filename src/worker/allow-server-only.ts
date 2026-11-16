/**
 * The worker and scripts run under plain Node (tsx), outside Next.js. Some shared
 * modules start with `import "server-only"`, a marker that only Next.js can
 * resolve; under Node it throws "Cannot find module 'server-only'" (which made
 * the worker crash every time it re-checked pending domains). Those modules are
 * genuinely server code, so here the marker is mapped to an empty module.
 *
 * Import this FIRST, before anything else.
 */
import Module from "node:module";
import path from "node:path";

const EMPTY = path.join(__dirname, "server-only-empty.ts");

const M = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const original = M._resolveFilename;
M._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request === "server-only") return EMPTY;
  return original.call(this, request, ...rest);
};
