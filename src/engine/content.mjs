// THE COMPOUND — content bundle builder. Pure: takes already-parsed JSON objects (so the same code serves Node and
// the browser) and returns the ContentBundle the engine reads. `contentVersion` is a hash of every content file;
// saves carry it and refuse to load against different content (docs/02 Q5, audit F-21).
import { hashValue } from './hash.mjs';

export const CONTENT_FILES = ['truth.json', 'flags.json', 'npcs.json', 'timeline.json', 'rules.delayed.json', 'endings.json', 'npc.intents.json', 'epilogues.json'];

/**
 * @param raw  { truth, flags, npcs, timeline, rules, endings, intents?, epilogues? } — parsed JSON files
 * @param opts { intents?: boolean (false = Phase 2 baseline, no NPC actions), mutate?: (bundle) => bundle }
 */
export function buildContent(raw, opts = {}) {
  const flagsFile = raw.flags;
  const bundle = {
    contentVersion: hashValue({ truth: raw.truth, flags: raw.flags, npcs: raw.npcs, timeline: raw.timeline, rules: raw.rules, endings: raw.endings, intents: raw.intents ?? null, epilogues: raw.epilogues ?? null }),
    truth: raw.truth,
    flags: flagsFile.flags,
    /** Declared initial player stats per role (audit F-09 / T-O1). */
    playerInitial: flagsFile.playerInitial,
    npcs: raw.npcs.npcs,
    relationships: raw.npcs.relationships,
    propagation: raw.npcs.propagation,
    background: raw.timeline.background,
    events: raw.timeline.events,
    delayedRules: raw.rules.rules,
    endings: raw.endings.endings,
    intents: opts.intents === false ? undefined : raw.intents,
    epilogues: raw.epilogues,
  };
  return opts.mutate ? (opts.mutate(bundle) ?? bundle) : bundle;
}

/** Fetch-based loader for browsers (and anything with a global fetch). `base` = URL of the content directory. */
export async function fetchContent(base, opts = {}) {
  const get = async (f) => { const r = await fetch(new URL(f, base)); if (!r.ok) throw new Error(`cannot load ${f}: ${r.status}`); return r.json(); };
  const [truth, flags, npcs, timeline, rules, endings, intents, epilogues] = await Promise.all(CONTENT_FILES.map(get));
  return buildContent({ truth, flags, npcs, timeline, rules, endings, intents, epilogues }, opts);
}
