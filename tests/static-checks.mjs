// THE COMPOUND — Phase 3 static checkers shared by tests (so adversarial tests can inject broken content
// and assert the checker rejects it). Pure functions over a ContentBundle; no I/O.
import { NPC_IDS, seg } from '../src/engine/evaluator.mjs';

export function walkCond(c, fn) { if (!c) return; fn(c); if (c.args) c.args.forEach((a) => walkCond(a, fn)); if (c.arg) walkCond(c.arg, fn); }
export function walkCons(list, fn, condFn = () => {}) { for (const c of list || []) { if (c.type === 'if') { walkCond(c.when, condFn); walkCons(c.then, fn, condFn); walkCons(c.else, fn, condFn); } else fn(c); } }

/** Visibility contract (types.ts §9b). Returns a list of violations (empty = readable by actor). */
export function visibilityViolations(content, cond, actor) {
  const FLAGS = Object.fromEntries(content.flags.map((f) => [f.id, f]));
  const out = [];
  walkCond(cond, (c) => {
    switch (c.op) {
      case 'always': case 'and': case 'or': case 'not': case 'role': case 'segment': return;
      case 'npcBelieves': case 'npcKnowsTag': case 'npcStatus': case 'trust':
        if (c.npc !== actor) out.push(`${c.op} about ${c.npc}`); return;
      case 'stat':
        if (!(c.stat === 'suspicion' && ['thach', 'vu'].includes(actor))) out.push(`stat ${c.stat}`); return;
      case 'flag': case 'flagCmp': {
        const f = FLAGS[c.flag];
        if (!f) { out.push(`unknown flag ${c.flag}`); return; }
        const ok = f.visibleTo === 'all' || (Array.isArray(f.visibleTo) && f.visibleTo.includes(actor)) || (c.op === 'flag' && f.visibleByValue?.[String(c.equals)]?.includes(actor));
        if (!ok) out.push(`flag ${c.flag}${c.op === 'flag' ? '==' + c.equals : ''}`); return;
      }
      case 'tag': case 'playerBelief': case 'eventFired': out.push(`${c.op} (player-private)`); return;
      default: out.push(`unknown op ${c.op}`);
    }
  });
  return out;
}

/** Facts each NPC can ever hold: initial + every grant targeting it (events, background, rules, actions, asserts) + relays (fixpoint). */
export function reachableFacts(content) {
  const reach = Object.fromEntries(NPC_IDS.map((n) => [n, new Set(content.npcs.find((x) => x.id === n).initialBeliefs.map((b) => b.factId))]));
  const grant = (c) => { if (c.type === 'belief' && c.agent !== 'player') reach[c.agent].add(c.factId); };
  for (const b of content.background) b.effects.forEach(grant);
  for (const e of content.events) { e.observations.forEach((o) => walkCons(o.grants, grant)); e.choices.forEach((ch) => walkCons(ch.consequences, grant)); }
  for (const r of content.delayedRules) walkCons(r.effects, grant);
  for (const p of content.propagation) { if (p.kind === 'assert') reach[p.to].add(p.factId); walkCons(p.also, grant); }
  for (const a of content.intents?.actions || []) walkCons(a.effects, grant);
  let changed = true;
  while (changed) { changed = false; for (const p of content.propagation) if (p.kind === 'relay') for (const f of p.facts || []) if (reach[p.from].has(f) && !reach[p.to].has(f)) { reach[p.to].add(f); changed = true; } }
  return reach;
}

/** Gate C (knowledge) over actions: unreachable npcBelieves, sources that cannot know what they tell. */
export function knowledgePathViolations(content) {
  const reach = reachableFacts(content), out = [];
  for (const a of content.intents?.actions || []) {
    walkCond(a.when, (c) => { if (c.op === 'npcBelieves' && !reach[c.npc].has(c.factId)) out.push(`${a.id}: ${c.npc} can never learn ${c.factId}`); });
    walkCons(a.effects, (c) => {
      if (c.type === 'belief' && c.source !== 'self' && c.source !== 'player' && !c.misinformation && !reach[c.source].has(c.factId)) out.push(`${a.id}: ${c.source} tells ${c.factId} it can never hold`);
    });
  }
  return out;
}

/** BUTTERFLY (dynamic-rule version of Test 17): a rule/action must not open before any seed of its reads exists. */
export function butterflyViolations(content) {
  const produced = new Map(); // flag/tag -> min segment of a producer
  const note = (key, s) => produced.set(key, Math.min(produced.get(key) ?? 99, s));
  for (const b of content.background) { const s = seg(b.at); walkCons(b.effects, (c) => { if (c.type === 'flag' || c.type === 'flagAdd') note(c.flag, s); }); }
  for (const e of content.events) {
    const s = e.at ? seg(e.at) : e.window ? seg(e.window.from) : 0;
    const f = (c) => { if (c.type === 'flag' || c.type === 'flagAdd') note(c.flag, s); if (c.type === 'tag' || c.type === 'witnessTag') note(c.tag, s); };
    e.observations.forEach((o) => walkCons(o.grants, f)); e.choices.forEach((ch) => walkCons(ch.consequences, f));
  }
  for (const r of [...content.delayedRules, ...(content.intents?.actions || [])]) walkCons(r.effects, (c) => { if (c.type === 'flag' || c.type === 'flagAdd') note(c.flag, r.earliest); if (c.type === 'tag' || c.type === 'witnessTag') note(c.tag, r.earliest); });
  for (const p of content.propagation) walkCons(p.also, (c) => { if (c.type === 'flag') note(c.flag, p.at ?? 0); });
  const out = [];
  for (const r of [...content.delayedRules, ...(content.intents?.actions || [])]) {
    const seeds = [...(r.reads.tags || []), ...(r.reads.flags || [])].map((k) => produced.get(k) ?? 0);
    if (seeds.length && Math.min(...seeds) > r.earliest) out.push(`${r.id}: earliest ${r.earliest} but first seed at ${Math.min(...seeds)}`);
  }
  return out;
}

/** Relay rules may never promote a belief past OBSERVED (CONFIRMED needs authority or physical evidence, not hearsay). */
export function relayArrivalViolations(content) {
  return content.propagation.filter((p) => p.kind === 'relay' && p.arriveAs && !['RUMOR', 'OBSERVED'].includes(p.arriveAs)).map((p) => `${p.id}: arriveAs ${p.arriveAs}`);
}
