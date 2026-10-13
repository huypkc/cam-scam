// THE COMPOUND — Node entry point for the engine: content loading from disk + re-export of the environment-neutral
// core (src/engine/core.mjs). Tests, the CLI, the trace generator and the local server import from here.
// Historical note: in Phase 3 this file WAS the reference evaluator; the logic now lives in core.mjs unchanged in
// semantics, hardened with atomic steps, explicit ordering fields, a decision log, replay and save/load.
import { readFileSync } from 'node:fs';
import { buildContent, CONTENT_FILES } from './content.mjs';

export * from './core.mjs';
export { buildContent, CONTENT_FILES } from './content.mjs';
export { hashValue, canonicalJson, fnv1a64 } from './hash.mjs';

/** Load content/*.json from disk. opts: { dir?: URL, intents?: boolean, mutate?: (bundle) => bundle }. */
export function loadContent(opts = {}) {
  const dir = opts.dir ?? new URL('../../content/', import.meta.url);
  const load = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const [truth, flags, npcs, timeline, rules, endings, intents, epilogues] = CONTENT_FILES.map(load);
  return buildContent({ truth, flags, npcs, timeline, rules, endings, intents, epilogues }, opts);
}
