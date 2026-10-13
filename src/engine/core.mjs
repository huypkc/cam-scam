// THE COMPOUND — ENGINE CORE (MVP). Executes docs/02 §4 (segment lifecycle) plus the Phase 3 NPC Intent Layer.
// Environment-neutral: no Node imports, so the same module runs in `node --test`, the CLI and the browser.
//
// Guarantees (each backed by a test in tests/):
//   • WorldTruth is deep-frozen and never part of GameState or saves (T06).
//   • `apply()` is the single mutation entry point; every mutation carries a CausalOrigin (T01/T02).
//   • Every event, rule, action and propagation step is applied atomically: a thrown invariant rolls the state back
//     to the pre-step snapshot (ATOMIC tests).
//   • Ordering never depends on file order: forced/scheduled events sort by (order, forced-before-scheduled, id),
//     rules/actions by (priority, id), propagation by (priority, id), endings by priority (ORDER tests).
//   • No RNG. A run is a pure function of (content, role, decisions); `replay()` rebuilds it, `stateHash()` proves it.
import { hashValue } from './hash.mjs';

export const ENGINE_ORDERING = {
  initialStats: { stress: 0, suspicion: 0 },  // fallback only; content/flags.json `playerInitial` is authoritative (F-09, ratified 2026-10-13)
  clamp: 'per-mutation',                       // F-08, ratified
  equalRankBeliefGrant: 'no-op',               // F-11, ratified
  relayAcquiredAt: 'arrival-segment',          // F-11, ratified
  eventOrder: 'order-field, then forced-before-scheduled, then id',   // Q2 + O12, ratified (file/queue order never matters)
  propagationOrder: 'priority-then-id',        // O13, ratified (file order is irrelevant)
  convergence: ['propagation', 'npc_actions', 'delayed_rules', 'clamp'],
  endingStopsImmediately: true,
};

export const RANK = { UNKNOWN: 0, RUMOR: 1, OBSERVED: 2, CONFIRMED: 3 };
export const NPC_IDS = ['thach', 'vu', 'mai', 'linh', 'duc'];
export const SEG_OF_DAY = ['morning', 'afternoon', 'night'];
export const TOTAL_SEGMENTS = 21;
export const seg = (t) => (t.day - 1) * 3 + { morning: 0, afternoon: 1, night: 2 }[t.segment];
export const timeOf = (s) => ({ day: Math.floor(s / 3) + 1, segment: SEG_OF_DAY[s % 3] });
const cmp = (a, op, b) => { const r = { '<': a < b, '<=': a <= b, '==': a === b, '>=': a >= b, '>': a > b }[op]; if (r === undefined) throw new Error(`unknown comparison op ${op}`); return r; };
const clone = (x) => structuredClone(x);
const byId = (a, b) => (a < b ? -1 : a > b ? 1 : 0); // code-point compare, locale-independent

/** Rules/propagations superseded by loaded NpcActions (Phase 2 ids kept in files for diffing). */
export function supersededIds(content) {
  return new Set((content.intents?.actions ?? []).flatMap((a) => a.supersedes ?? []));
}

export function deepFreeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; }

/** Thrown by an interactive policy when the engine needs a decision the caller has not supplied yet. */
export class NeedInput extends Error {
  constructor(request) { super('NeedInput'); this.request = request; }
}

// ---------------------------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------------------------
export function start(content, role, opts = {}) {
  if (!['captive', 'operator'].includes(role)) throw new Error(`unknown role ${role}`);
  deepFreeze(content.truth); // T06: WorldTruth is never written (deep: facts and their fields)
  const npcs = {};
  for (const n of content.npcs) {
    npcs[n.id] = { id: n.id, trustToPlayer: n.initialTrust[role], status: 'present', knowledge: { beliefs: {}, tags: {} } };
    for (const b of n.initialBeliefs) {
      npcs[n.id].knowledge.beliefs[b.factId] = { factId: b.factId, status: b.status, believedValue: b.believedValue, source: b.source, acquiredAt: 0, cause: { kind: 'engine_init' }, misinformation: b.misinformation };
    }
  }
  const init = content.playerInitial?.[role] ?? ENGINE_ORDERING.initialStats;
  return {
    meta: { saveVersion: 2, contentVersion: content.contentVersion ?? content.truth.version, createdAt: opts.createdAt ?? 'deterministic' },
    segment: 0,
    player: { role, stress: init.stress, suspicion: init.suspicion, location: 'dorm', knowledge: { beliefs: {}, tags: {} } },
    npcs,
    flags: Object.fromEntries(content.flags.map((f) => [f.id, f.initial])),
    firedEvents: [], firedRules: [], firedPropagations: [], firedActions: [], propagationLog: [],
    queue: [], mutationLog: [], actionLog: [], decisions: [], ending: undefined,
  };
}

// ---------------------------------------------------------------------------------------------
// CONDITIONS
// ---------------------------------------------------------------------------------------------
export function evaluate(content, st, c) {
  if (!c) return true;
  switch (c.op) {
    case 'always': return true;
    case 'and': return c.args.every((a) => evaluate(content, st, a));
    case 'or': return c.args.some((a) => evaluate(content, st, a));
    case 'not': return !evaluate(content, st, c.arg);
    case 'role': return st.player.role === c.is;
    case 'segment': return cmp(st.segment, c.cmp, c.value);
    case 'stat': return cmp(st.player[c.stat], c.cmp, c.value);
    case 'trust': return cmp(st.npcs[c.npc].trustToPlayer, c.cmp, c.value);
    case 'tag': return !!st.player.knowledge.tags[c.tag];
    case 'flag': return st.flags[c.flag] === c.equals;
    case 'flagCmp': return cmp(st.flags[c.flag], c.cmp, c.value);
    case 'playerBelief': { const b = st.player.knowledge.beliefs[c.factId]; return !!b && RANK[b.status] >= RANK[c.minStatus] && (c.believedValue === undefined || b.believedValue === c.believedValue); }
    case 'npcBelieves': { const b = st.npcs[c.npc].knowledge.beliefs[c.factId]; return !!b && RANK[b.status] >= RANK[c.minStatus] && (c.believedValue === undefined || b.believedValue === c.believedValue); }
    case 'npcKnowsTag': return !!st.npcs[c.npc].knowledge.tags[c.tag];
    case 'npcStatus': return st.npcs[c.npc].status === c.is;
    case 'eventFired': return st.firedEvents.includes(c.eventId);
    default: throw new Error(`unknown condition op ${c.op}`);
  }
}

// ---------------------------------------------------------------------------------------------
// APPLY — the single mutation entry point
// ---------------------------------------------------------------------------------------------
const clampStat = (v) => Math.max(0, Math.min(100, v));
const clampTrust = (v) => Math.max(-3, Math.min(3, v));
const STATS = new Set(['stress', 'suspicion']);

export function apply(content, st, c, cause) {
  if (st.ending && c.type !== 'endGame') throw new Error(`apply after ending (${JSON.stringify(cause)})`);
  if (c.type === 'if') {
    const branch = evaluate(content, st, c.when) ? c.then : c.else;
    for (const x of branch || []) apply(content, st, x, cause);
    return st;
  }
  const log = () => st.mutationLog.push({ seq: st.mutationLog.length, at: st.segment, cause, consequence: clone(c) });
  switch (c.type) {
    case 'stat': if (!STATS.has(c.stat)) throw new Error(`unknown stat ${c.stat}`); st.player[c.stat] = clampStat(st.player[c.stat] + c.delta); log(); break;
    case 'setStat': if (!STATS.has(c.stat)) throw new Error(`unknown stat ${c.stat}`); st.player[c.stat] = clampStat(c.value); log(); break;
    case 'trust': npcOf(st, c.npc).trustToPlayer = clampTrust(st.npcs[c.npc].trustToPlayer + c.delta); log(); break;
    case 'tag': st.player.knowledge.tags[c.tag] = { tag: c.tag, via: 'self', at: st.segment, cause }; log(); break;
    case 'witnessTag': st.player.knowledge.tags[c.tag] = { tag: c.tag, via: 'witness', at: st.segment, cause }; log(); break;
    case 'flag': {
      const def = content.flags.find((f) => f.id === c.flag);
      if (!def) throw new Error(`unknown flag ${c.flag}`);
      if (def.values && !def.values.includes(c.value)) throw new Error(`flag ${c.flag}: value ${c.value} not declared`);
      st.flags[c.flag] = c.value; log(); break;
    }
    case 'flagAdd': if (typeof st.flags[c.flag] !== 'number') throw new Error(`flagAdd on non-numeric flag ${c.flag}`); st.flags[c.flag] += c.delta; log(); break;
    case 'npcTag': { // idempotent: an NPC that already holds the tag keeps its first acquisition (no re-log), like equal-rank beliefs
      const ks = npcOf(st, c.npc).knowledge;
      if (ks.tags[c.tag]) break;
      ks.tags[c.tag] = { tag: c.tag, via: c.via, source: c.source, at: st.segment, cause }; log(); break;
    }
    case 'npcStatus': npcOf(st, c.npc).status = c.status; log(); break;
    case 'schedule': {
      if (!content.events.some((e) => e.id === c.eventId)) throw new Error(`schedule: unknown event ${c.eventId}`);
      if (c.at <= st.segment) throw new Error(`schedule: ${c.eventId} at ${c.at} is not in the future of ${st.segment}`);
      st.queue.push({ eventId: c.eventId, at: c.at, cause }); log(); break;
    }
    case 'endGame': st.ending = c.endingId; log(); break;
    case 'belief': {
      const fact = content.truth.facts[c.factId];
      if (!fact) throw new Error(`unknown fact ${c.factId}`);
      const truthV = fact.value;
      let status = c.status, source = c.source, uncertain;
      if (c.agent === 'player' && c.uncertainAboveStress !== undefined && st.player.stress >= c.uncertainAboveStress) { status = 'RUMOR'; source = 'self'; uncertain = true; }
      if (RANK[status] >= RANK.OBSERVED && c.believedValue !== truthV) throw new Error(`apply: ${c.factId} granted ${status} with wrong value (cause ${JSON.stringify(cause)})`);
      const ks = c.agent === 'player' ? st.player.knowledge : npcOf(st, c.agent).knowledge;
      const prev = ks.beliefs[c.factId];
      if (prev && RANK[prev.status] >= RANK[status]) break; // never downgrade; equal rank = no-op (F-11)
      ks.beliefs[c.factId] = { factId: c.factId, status, believedValue: c.believedValue, source, acquiredAt: st.segment, uncertain, misinformation: c.misinformation, cause };
      log();
      break;
    }
    default: throw new Error(`unknown consequence type ${c.type}`);
  }
  return st;
}
function npcOf(st, id) { const n = st.npcs[id]; if (!n) throw new Error(`unknown npc ${id}`); return n; }

/**
 * Atomic step: run `fn(st)`; if it throws, restore `st` to its exact pre-call contents and rethrow.
 * Used around every event, propagation rule, NPC action, delayed rule and background occurrence, so a failed
 * invariant can never leave a half-applied world (PO requirement "atomic world-state mutations").
 */
export function transact(st, fn) {
  const snapshot = clone(st);
  try { return fn(st); } catch (e) {
    for (const k of Object.keys(st)) delete st[k];
    Object.assign(st, snapshot);
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------
// SEGMENT LIFECYCLE (docs/02 §4 + Phase 3 step 6a')
// ---------------------------------------------------------------------------------------------
function eventSlotMatches(e, s) {
  if (e.at) return seg(e.at) === s;
  if (e.window) {
    if (s < seg(e.window.from) || s > seg(e.window.to)) return false;
    return !e.window.segments || e.window.segments.includes(SEG_OF_DAY[s % 3]);
  }
  return false;
}
export function eventPlayable(content, st, e) {
  return e.roles.includes(st.player.role) && (e.repeatable || !st.firedEvents.includes(e.id)) && evaluate(content, st, e.preconditions);
}
export function availableChoices(content, st, e) {
  return e.choices.filter((ch) => evaluate(content, st, ch.available));
}
/** Observations the current player would receive from `e` right now (texts + grants), in declaration order. */
export function activeObservations(content, st, e) {
  return e.observations.filter((o) => o.roles.includes(st.player.role) && evaluate(content, st, o.when));
}

function recordDecision(st, d) { st.decisions.push(d); }

/** Fire an event atomically: observations grant first, then the chosen choice. `choose(e, avail, st)` returns a choice id. */
function fireEvent(content, st, e, choose, kind) {
  transact(st, () => {
    const seen = activeObservations(content, st, e);
    const obs = seen.map((o) => e.observations.indexOf(o)); // journal: which observation texts the player received
    for (const o of seen) {
      for (const g of o.grants) apply(content, st, g, { kind: 'observation', eventId: e.id, at: st.segment });
    }
    st.firedEvents.push(e.id);
    if (e.choices.length === 0) { st.actionLog.push({ segment: st.segment, eventId: e.id, choiceId: null, kind, obs }); return; }
    const avail = availableChoices(content, st, e);
    if (avail.length === 0) throw new Error(`${e.id} at seg ${st.segment}: no available choice`);
    const chosenId = choose(e, avail, st);
    const ch = avail.find((c) => c.id === chosenId);
    if (!ch) throw new Error(`${e.id} at seg ${st.segment}: choice '${chosenId}' not available (available: ${avail.map((c) => c.id)})`);
    recordDecision(st, { k: 'c', e: e.id, c: ch.id });
    st.actionLog.push({ segment: st.segment, eventId: e.id, choiceId: ch.id, kind, obs });
    for (const c of ch.consequences) apply(content, st, c, { kind: 'choice', eventId: e.id, choiceId: ch.id, at: st.segment });
  });
}

export function optionalEventsAt(content, st) {
  return content.events.filter((e) => e.trigger === 'optional' && eventSlotMatches(e, st.segment) && eventPlayable(content, st, e)).sort((a, b) => byId(a.id, b.id));
}

/** Forced and scheduled events due at segment s, in canonical order (order field, forced before scheduled, id) — never file or queue order. */
function dueEvents(content, st, s) {
  const items = [];
  for (const e of content.events) if (e.trigger === 'forced' && eventSlotMatches(e, s)) items.push({ e, kind: 'forced', rank: 0 });
  for (const q of st.queue) if (q.at === s) items.push({ e: content.events.find((x) => x.id === q.eventId), kind: 'scheduled', rank: 1 });
  return items.sort((a, b) => (a.e.order ?? 0) - (b.e.order ?? 0) || a.rank - b.rank || byId(a.e.id, b.e.id));
}

/**
 * Run one segment. `policy` = { choose(e, avail, st) -> choiceId, pickOptional(list, st) -> event | null }.
 * Returns true if the game ended.
 */
export function runSegment(content, st, policy) {
  if (st.ending) throw new Error('runSegment after ending');
  const s = st.segment;
  // 1. background (order field, then id)
  const bgs = content.background.filter((b) => seg(b.at) === s).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || byId(a.id, b.id));
  for (const b of bgs) transact(st, () => {
    for (const c of b.effects) apply(content, st, c, { kind: 'background', backgroundId: b.id, at: s });
    for (const c of b.playerEffects?.[st.player.role] || []) apply(content, st, c, { kind: 'background', backgroundId: b.id, at: s });
  });
  // 2+3. forced and scheduled events in canonical order (scheduled ones leave the queue whether or not they fire)
  const due = dueEvents(content, st, s);
  st.queue = st.queue.filter((q) => q.at !== s);
  for (const { e, kind } of due) {
    if (eventPlayable(content, st, e)) fireEvent(content, st, e, policy.choose, kind);
    else if (kind === 'scheduled') st.actionLog.push({ segment: s, eventId: e.id, choiceId: null, kind: 'scheduled-skipped' });
  }
  // 4. ≤ 1 optional. The pick is a decision of its own and commits BEFORE the event it opens fires: a run cut right
  //    after the pick replays to "optional picked, choice pending" (the engine then asks for the choice), so a save
  //    taken at that point holds exactly the decisions the player made (REPLAY / SAVE-LOAD tests).
  const opt = optionalEventsAt(content, st);
  if (opt.length) {
    const picked = policy.pickOptional(opt, st);
    if (picked && !opt.includes(picked)) throw new Error(`optional ${picked.id} not offered at seg ${s}`);
    transact(st, () => {
      recordDecision(st, { k: 'o', e: picked ? picked.id : null });
      if (!picked) st.actionLog.push({ segment: s, eventId: null, choiceId: 'skip', kind: 'optional', offered: opt.map((e) => e.id) });
    });
    if (picked) fireEvent(content, st, picked, policy.choose, 'optional'); // atomic on its own; a pending choice leaves no trace beyond the pick
  }
  // 5. ending check (priority ascending; the first true ending wins and stops the run)
  for (const en of [...content.endings].sort((a, b) => a.priority - b.priority)) {
    if (en.checkAt.includes(s) && evaluate(content, st, en.condition)) {
      transact(st, () => apply(content, st, { type: 'endGame', endingId: en.id }, { kind: 'ending', endingId: en.id, at: s }));
      return true;
    }
  }
  // 6. convergence
  convergence(content, st);
  st.segment = s + 1;
  return false;
}

export function convergence(content, st) {
  const s = st.segment;
  const dead = supersededIds(content);
  if (content.engineOptions?.rulesBeforePropagation) delayedRules(content, st, dead); // SENSITIVITY TEST ONLY (CF-8)
  // 6a. propagation (priority, id)
  const props = [...content.propagation].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || byId(a.id, b.id));
  for (const p of props) {
    if (dead.has(p.id) || (p.once && st.firedPropagations.includes(p.id))) continue;
    if (p.kind === 'assert') {
      if (p.at !== undefined && p.at !== s) continue;
      if (!evaluate(content, st, p.when)) continue;
      transact(st, () => {
        const cause = { kind: 'propagation', ruleId: p.id, from: p.from, to: p.to, at: s };
        if (p.factId) apply(content, st, { type: 'belief', agent: p.to, factId: p.factId, status: 'RUMOR', believedValue: p.believedValue, source: p.from, misinformation: p.misinformation || undefined }, cause);
        for (const c of p.also || []) apply(content, st, c, cause);
        st.firedPropagations.push(p.id);
      });
    } else {
      if (!evaluate(content, st, p.when)) continue;
      transact(st, () => {
        const from = st.npcs[p.from].knowledge, cause = { kind: 'propagation', ruleId: p.id, from: p.from, to: p.to, at: s };
        let moved = 0;
        for (const f of p.facts || []) {
          const b = from.beliefs[f];
          if (!b || b.acquiredAt > s - p.delay) continue;
          const before = st.mutationLog.length;
          // relay inherits the source's attestation (audit F-10): a relayed lie is still a lie
          apply(content, st, { type: 'belief', agent: p.to, factId: f, status: p.arriveAs || 'RUMOR', believedValue: b.believedValue, source: p.from, misinformation: b.believedValue !== content.truth.facts[f].value ? true : undefined }, cause);
          if (st.mutationLog.length > before) moved++;
        }
        for (const t of p.tags || []) {
          const r = from.tags[t];
          if (!r || r.at > s - p.delay || st.npcs[p.to].knowledge.tags[t]) continue;
          apply(content, st, { type: 'npcTag', npc: p.to, tag: t, via: 'told', source: p.from }, cause); moved++;
        }
        if (moved && !st.firedPropagations.includes(p.id)) st.firedPropagations.push(p.id); // recorded once per run, even for repeating relays
        if (moved) st.propagationLog.push({ at: s, ruleId: p.id, moved });
      });
    }
  }
  // 6a'. NPC actions (Phase 3): (priority, id); max one per actor per convergence
  if (content.intents) {
    const acted = new Set();
    const actions = [...content.intents.actions].sort((a, b) => a.priority - b.priority || byId(a.id, b.id));
    for (const a of actions) {
      if (acted.has(a.actor) || s < a.earliest || s > (a.latest ?? 20)) continue;
      if (a.once && st.firedActions.includes(a.id)) continue;
      if (st.npcs[a.actor].status === 'gone') continue;
      if (!evaluate(content, st, a.when)) continue;
      transact(st, () => {
        const cause = { kind: 'npc_action', actor: a.actor, actionId: a.id, driveId: a.drive, at: s };
        for (const c of a.effects) apply(content, st, c, cause);
        st.firedActions.push(a.id);
      });
      acted.add(a.actor);
    }
  }
  // 6b. delayed rules (priority, id)
  if (!content.engineOptions?.rulesBeforePropagation) delayedRules(content, st, dead);
  // 6c. clamp (already per-mutation; harmless)
  st.player.stress = clampStat(st.player.stress); st.player.suspicion = clampStat(st.player.suspicion);
}

function delayedRules(content, st, dead) {
  const s = st.segment;
  const rules = content.delayedRules.filter((r) => !dead.has(r.id)).sort((a, b) => a.priority - b.priority || byId(a.id, b.id));
  for (const r of rules) {
    if (st.firedRules.includes(r.id) || s < r.earliest || s > (r.latest ?? 20)) continue;
    if (!evaluate(content, st, r.when)) continue;
    transact(st, () => {
      for (const c of r.effects) apply(content, st, c, { kind: 'delayed_rule', ruleId: r.id, at: s });
      st.firedRules.push(r.id);
    });
  }
}

// ---------------------------------------------------------------------------------------------
// POLICIES & RUNNERS
// ---------------------------------------------------------------------------------------------
/**
 * Scripted policy: `script` = { [eventId]: choiceId | (avail, st) => choiceId }, `optionals` = ordered list of event ids
 * to pick when offered (others skipped). Unlisted events fall back to `fallback`:
 * 'default' (event.defaultChoice, else first available) | 'first' | 'last'.
 */
export function scriptedPolicy(script = {}, optionals = [], fallback = 'default') {
  const want = new Set(optionals);
  return {
    choose(e, avail, st) {
      const s = script[e.id];
      if (s !== undefined) return typeof s === 'function' ? s(avail, st) : s;
      return fallbackChoice(e, avail, fallback);
    },
    pickOptional(list) { return list.find((e) => want.has(e.id)) ?? null; },
  };
}
/** Which role the available choices belong to (per-role defaultChoice maps); derived from top-level `role` restrictions. */
function roleOfAvail(e, avail) {
  for (const c of avail) {
    const a = c.available;
    if (a?.op === 'role') return a.is;
    if (a?.op === 'and') { const r = a.args.find((x) => x.op === 'role'); if (r) return r.is; }
  }
  return e.roles[0];
}
export function fallbackChoice(e, avail, fallback = 'default') {
  if (fallback === 'last') return avail[avail.length - 1].id;
  if (fallback === 'default' && e.defaultChoice !== undefined) {
    const d = typeof e.defaultChoice === 'string' ? e.defaultChoice : e.defaultChoice[avail[0] && e.roles.length === 1 ? e.roles[0] : roleOfAvail(e, avail)];
    if (d && avail.some((c) => c.id === d)) return d;
  }
  return avail[0].id;
}
/** Zero-player policy (audit F-12): skip every optional; forced/scheduled take the declared defaultChoice ('default'), or first/last. */
export const passivePolicy = (which = 'default') => scriptedPolicy({}, [], which);

/** Replays a recorded decision list; throws NeedInput when the list runs out (used by interactive sessions). */
export function replayPolicy(decisions, onExhausted = 'throw') {
  let i = 0;
  const next = () => (i < decisions.length ? decisions[i++] : null);
  return {
    choose(e, avail, st) {
      const d = next();
      if (!d) { if (onExhausted === 'throw') throw new NeedInput({ kind: 'choice', eventId: e.id, choices: avail.map((c) => c.id) }); return fallbackChoice(e, avail, onExhausted); }
      if (d.k !== 'c' || d.e !== e.id) throw new Error(`replay: expected choice for ${e.id} at seg ${st.segment}, log has ${JSON.stringify(d)}`);
      return d.c;
    },
    pickOptional(list, st) {
      const d = next();
      if (!d) { if (onExhausted === 'throw') throw new NeedInput({ kind: 'optional', options: list.map((e) => e.id) }); return null; }
      if (d.k !== 'o') throw new Error(`replay: expected optional pick at seg ${st.segment}, log has ${JSON.stringify(d)}`);
      if (d.e === null) return null;
      const e = list.find((x) => x.id === d.e);
      if (!e) throw new Error(`replay: optional ${d.e} not offered at seg ${st.segment} (offered: ${list.map((x) => x.id)})`);
      return e;
    },
    get consumed() { return i; },
  };
}

export function run(content, role, policy, until = TOTAL_SEGMENTS) {
  const st = start(content, role);
  while (st.segment < until && !st.ending) if (runSegment(content, st, policy)) break;
  return st;
}

/** Deterministic replay: same content + role + decisions ⇒ identical state (verified by stateHash in tests and saves). */
export function replay(content, role, decisions, until = TOTAL_SEGMENTS) {
  const policy = replayPolicy(decisions, 'throw');
  const st = start(content, role);
  try {
    while (st.segment < until && !st.ending) if (runSegment(content, st, policy)) break;
  } catch (e) {
    if (!(e instanceof NeedInput)) throw e;
    // ran out of decisions mid-segment: the pending step was rolled back by transact (earlier steps of the segment stay committed); the state is the last committed point
    return { st, complete: false, request: e.request };
  }
  return { st, complete: true, request: null };
}

/** Hash of everything that defines a run's state (meta.createdAt excluded). */
export function stateHash(st) {
  const { meta, ...rest } = st;
  return hashValue({ contentVersion: meta.contentVersion, saveVersion: meta.saveVersion, ...rest });
}

/** Snapshot helper used by traces: what the world looks like right now. */
export function snapshot(st) {
  return {
    seg: st.segment, stress: st.player.stress, suspicion: st.player.suspicion, phone: st.flags['phone.location'],
    trust: Object.fromEntries(NPC_IDS.map((n) => [n, st.npcs[n].trustToPlayer])),
    status: Object.fromEntries(NPC_IDS.filter((n) => st.npcs[n].status !== 'present').map((n) => [n, st.npcs[n].status])),
    ending: st.ending,
  };
}

// ---------------------------------------------------------------------------------------------
// SAVE / LOAD — a save is the decision log plus a hash of the state it must reproduce
// ---------------------------------------------------------------------------------------------
export const SAVE_FORMAT = 'the-compound-save';

export function serialize(content, st, extra = {}) {
  const body = { format: SAVE_FORMAT, saveVersion: 2, contentVersion: content.contentVersion, role: st.player.role, segment: st.segment, ending: st.ending ?? null, decisions: clone(st.decisions), stateHash: stateHash(st) };
  return { ...body, checksum: hashValue(body), savedAt: extra.savedAt ?? null, label: extra.label ?? null };
}

/** Verifies format, checksum and contentVersion, replays the decisions and verifies the resulting state hash. */
export function deserialize(content, save) {
  if (!save || save.format !== SAVE_FORMAT || save.saveVersion !== 2) throw new Error('save: unknown format');
  const { checksum, savedAt, label, ...body } = save;
  if (hashValue(body) !== checksum) throw new Error('save: checksum mismatch (file edited or corrupted)');
  if (body.contentVersion !== content.contentVersion) throw new Error(`save: content version ${body.contentVersion} ≠ loaded content ${content.contentVersion}`);
  const { st, complete } = replay(content, body.role, body.decisions);
  if (!complete && body.ending) throw new Error('save: decisions incomplete for a finished game');
  if (st.segment !== body.segment || (st.ending ?? null) !== body.ending) throw new Error(`save: header says segment ${body.segment}/ending ${body.ending}, replay reached segment ${st.segment}/ending ${st.ending ?? null}`);
  if (stateHash(st) !== body.stateHash) throw new Error('save: replay produced a different state (non-deterministic engine or tampered log)');
  return st;
}
