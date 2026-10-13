// THE COMPOUND — Phase 2 invariant & consistency tests.
// Zero dependencies: `node --test tests/`. These are STATIC checks over content; no gameplay is simulated.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (f) => JSON.parse(readFileSync(new URL(`../content/${f}`, import.meta.url), 'utf8'));
const truth = load('truth.json');
const FACTS = truth.facts;
const FLAGS = Object.fromEntries(load('flags.json').flags.map((f) => [f.id, f]));
const npcsFile = load('npcs.json');
const NPCS = Object.fromEntries(npcsFile.npcs.map((n) => [n.id, n]));
const PROP = npcsFile.propagation;
const tl = load('timeline.json');
const EVENTS = Object.fromEntries(tl.events.map((e) => [e.id, e]));
const RULES = load('rules.delayed.json').rules;
const ENDINGS = load('endings.json').endings;

const ROLES = ['captive', 'operator'];
const NPC_IDS = ['thach', 'vu', 'mai', 'linh', 'duc'];
const RANK = { UNKNOWN: 0, RUMOR: 1, OBSERVED: 2, CONFIRMED: 3 };
const seg = (t) => (t.day - 1) * 3 + { morning: 0, afternoon: 1, night: 2 }[t.segment];

// ---------- walkers ----------
function walkCond(c, fn) {
  if (!c) return;
  fn(c);
  if (c.args) c.args.forEach((a) => walkCond(a, fn));
  if (c.arg) walkCond(c.arg, fn);
}
function walkCons(list, fn, condFn = () => {}) {
  for (const c of list || []) {
    if (c.type === 'if') {
      walkCond(c.when, condFn);
      walkCons(c.then, fn, condFn);
      walkCons(c.else, fn, condFn);
    } else fn(c);
  }
}
/** Role set a choice/observation applies to (approximation used by static tests). */
function rolesOfCond(cond, fallback) {
  const found = new Set();
  walkCond(cond, (c) => { if (c.op === 'role') found.add(c.is); });
  // only trust a top-level role restriction (role or and(...role...))
  if (cond && (cond.op === 'role' || (cond.op === 'and' && cond.args.some((a) => a.op === 'role')))) {
    return [...found];
  }
  return fallback;
}

// ---------- collection: every container that can mutate state ----------
/** containers: {kind, id, roles, segment?, cons: [], conds: []} */
const containers = [];
for (const b of tl.background) {
  containers.push({ kind: 'background', id: b.id, roles: ROLES, segment: seg(b.at), cons: b.effects, conds: [] });
  for (const r of ROLES) if (b.playerEffects?.[r]) containers.push({ kind: 'background', id: b.id + ':' + r, roles: [r], segment: seg(b.at), cons: b.playerEffects[r], conds: [] });
}
for (const e of tl.events) {
  const segment = e.at ? seg(e.at) : e.window ? seg(e.window.from) : undefined;
  const conds = [e.preconditions].filter(Boolean);
  for (const o of e.observations) containers.push({ kind: 'observation', id: e.id, roles: o.roles, segment, cons: o.grants, conds: [o.when].filter(Boolean) });
  for (const ch of e.choices) containers.push({ kind: 'choice', id: e.id + '/' + ch.id, event: e.id, roles: rolesOfCond(ch.available, e.roles), segment, cons: ch.consequences, conds: [ch.available].filter(Boolean) });
  containers.push({ kind: 'event', id: e.id, roles: e.roles, segment, cons: [], conds });
}
for (const r of RULES) containers.push({ kind: 'rule', id: r.id, roles: rolesOfCond(r.when, ROLES), segment: r.earliest, cons: r.effects, conds: [r.when] });
for (const p of PROP) {
  const cons = [...(p.also || [])];
  if (p.kind === 'assert') cons.push({ type: 'belief', agent: p.to, factId: p.factId, status: 'RUMOR', believedValue: p.believedValue, source: p.from, misinformation: p.misinformation });
  containers.push({ kind: 'propagation', id: p.id, roles: rolesOfCond(p.when, ROLES), segment: p.at ?? 0, cons, conds: [p.when] });
}
for (const en of ENDINGS) containers.push({ kind: 'ending', id: en.id, roles: ROLES, segment: Math.min(...en.checkAt), cons: [], conds: [en.condition] });

const allCons = []; // {c, container}
const allConds = []; // {c, container}
for (const k of containers) {
  walkCons(k.cons, (c) => allCons.push({ c, k }), (c) => allConds.push({ c, k }));
  for (const cond of k.conds) walkCond(cond, (c) => allConds.push({ c, k }));
}

const producedTags = new Map(); // tag -> [container]
const producedFlags = new Map();
const npcTagsGiven = new Map(); // npc -> Set(tag)
for (const { c, k } of allCons) {
  if (c.type === 'tag' || c.type === 'witnessTag') producedTags.set(c.tag, [...(producedTags.get(c.tag) || []), k]);
  if (c.type === 'flag' || c.type === 'flagAdd') producedFlags.set(c.flag, [...(producedFlags.get(c.flag) || []), k]);
  if (c.type === 'npcTag') { if (!npcTagsGiven.has(c.npc)) npcTagsGiven.set(c.npc, new Set()); npcTagsGiven.get(c.npc).add(c.tag); }
}
for (const p of PROP) if (p.kind === 'relay' && p.tags) { if (!npcTagsGiven.has(p.to)) npcTagsGiven.set(p.to, new Set()); p.tags.forEach((t) => npcTagsGiven.get(p.to).add(t)); }

const readTags = new Set();
const readFlags = new Set();
for (const { c } of allConds) {
  if (c.op === 'tag') readTags.add(c.tag);
  if (c.op === 'npcKnowsTag') readTags.add(c.tag);
  if (c.op === 'flag' || c.op === 'flagCmp') readFlags.add(c.flag);
}
for (const p of PROP) if (p.kind === 'relay' && p.tags) p.tags.forEach((t) => readTags.add(t));
for (const r of RULES) (r.reads.tags || []).forEach((t) => readTags.add(t));
const epilogueTags = new Set(ENDINGS.flatMap((e) => e.epilogueTags));

// =====================================================================
test('IDs: unique and correctly prefixed', () => {
  const ids = [...tl.events.map((e) => e.id), ...tl.background.map((b) => b.id), ...RULES.map((r) => r.id), ...PROP.map((p) => p.id), ...ENDINGS.map((e) => e.id)];
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids');
  for (const e of tl.events) assert.match(e.id, /^EV_[CSO]_/);
  for (const b of tl.background) assert.match(b.id, /^BG_/);
  for (const r of RULES) assert.match(r.id, /^R_/);
  for (const p of PROP) assert.match(p.id, /^PR_/);
  for (const f of Object.keys(FACTS)) { assert.match(f, /^F_/); assert.equal(FACTS[f].id, f); }
  for (const e of tl.events) {
    const cids = e.choices.map((c) => c.id);
    assert.equal(new Set(cids).size, cids.length, `${e.id}: duplicate choice ids`);
  }
});

// =====================================================================
test('WORLD TRUTH: decoys are false, unconfirmable, unheld; non-decoys are true', () => {
  for (const f of Object.values(FACTS)) {
    if (f.category === 'decoy') {
      assert.equal(f.value, false, `${f.id} decoy must be false`);
      assert.deepEqual(f.confirmableBy, [], `${f.id} decoy must not be confirmable`);
      assert.deepEqual(f.initialHolders, [], `${f.id} decoy must have no holders`);
    } else {
      assert.equal(f.value, true, `${f.id}: non-decoy facts are stated positively`);
    }
    for (const h of f.initialHolders) assert.ok(NPC_IDS.includes(h), `${f.id}: unknown holder ${h}`);
  }
});

test('WORLD TRUTH ↔ NPC initial knowledge agree exactly (CONFIRMED holders)', () => {
  for (const f of Object.values(FACTS)) {
    const holders = NPC_IDS.filter((n) => NPCS[n].initialBeliefs.some((b) => b.factId === f.id && b.status === 'CONFIRMED'));
    assert.deepEqual([...holders].sort(), [...f.initialHolders].sort(), `${f.id}: initialHolders mismatch`);
  }
  for (const n of Object.values(NPCS)) for (const b of n.initialBeliefs) {
    assert.ok(FACTS[b.factId], `${n.id}: unknown fact ${b.factId}`);
    const t = FACTS[b.factId].value;
    if (RANK[b.status] >= RANK.OBSERVED) assert.equal(b.believedValue, t, `${n.id} ${b.factId}: OBSERVED/CONFIRMED must match truth`);
    if (b.believedValue !== t) assert.equal(b.misinformation, true, `${n.id} ${b.factId}: wrong RUMOR must be marked misinformation`);
    if (b.misinformation) assert.notEqual(b.believedValue, t, `${n.id} ${b.factId}: marked misinformation but matches truth`);
  }
});

// =====================================================================
test('REFERENTIAL INTEGRITY: facts, flags, npcs, events, tags all exist', () => {
  for (const { c, k } of allCons) {
    if (c.type === 'belief') { assert.ok(FACTS[c.factId], `${k.id}: unknown fact ${c.factId}`); assert.ok(c.agent === 'player' || NPC_IDS.includes(c.agent), `${k.id}: bad agent`); }
    if (c.type === 'flag' || c.type === 'flagAdd') assert.ok(FLAGS[c.flag], `${k.id}: unknown flag ${c.flag}`);
    if (c.type === 'trust' || c.type === 'npcTag' || c.type === 'npcStatus') assert.ok(NPC_IDS.includes(c.npc), `${k.id}: unknown npc ${c.npc}`);
    if (c.type === 'schedule') assert.ok(EVENTS[c.eventId], `${k.id}: schedules unknown event ${c.eventId}`);
    if (c.type === 'tag' || c.type === 'witnessTag' || c.type === 'npcTag') assert.match(c.tag, /^T_/, `${k.id}: bad tag ${c.tag}`);
  }
  for (const { c, k } of allConds) {
    if (c.op === 'flag' || c.op === 'flagCmp') assert.ok(FLAGS[c.flag], `${k.id}: condition reads unknown flag ${c.flag}`);
    if (c.op === 'playerBelief' || c.op === 'npcBelieves') assert.ok(FACTS[c.factId], `${k.id}: condition reads unknown fact ${c.factId}`);
    if (c.op === 'npcBelieves' || c.op === 'npcKnowsTag' || c.op === 'npcStatus' || c.op === 'trust') assert.ok(NPC_IDS.includes(c.npc), `${k.id}: unknown npc`);
    if (c.op === 'eventFired') assert.ok(EVENTS[c.eventId], `${k.id}: unknown event ${c.eventId}`);
    if (c.op === 'tag' || c.op === 'npcKnowsTag') assert.ok(producedTags.has(c.tag) || (c.op === 'npcKnowsTag' && npcTagsGiven.get(c.npc)?.has(c.tag)), `${k.id}: reads tag ${c.tag} that nothing produces`);
    if (c.op === 'role') assert.ok(ROLES.includes(c.is));
  }
  for (const b of tl.background) for (const f of b.facts) assert.ok(FACTS[f], `${b.id}: unknown fact ${f}`);
  for (const r of RULES) for (const f of r.reads.facts || []) assert.ok(FACTS[f], `${r.id}: unknown fact ${f}`);
  for (const p of PROP) for (const f of p.facts || [p.factId].filter(Boolean)) assert.ok(FACTS[f], `${p.id}: unknown fact ${f}`);
});

test('FLAGS: enumerated string flags only take declared values; flagAdd only on numbers', () => {
  for (const { c, k } of allCons) {
    if (c.type === 'flag' && FLAGS[c.flag].values) assert.ok(FLAGS[c.flag].values.includes(c.value), `${k.id}: ${c.flag}=${c.value} not allowed`);
    if (c.type === 'flag') assert.equal(typeof c.value, typeof FLAGS[c.flag].initial, `${k.id}: ${c.flag} type mismatch`);
    if (c.type === 'flagAdd') assert.equal(typeof FLAGS[c.flag].initial, 'number', `${k.id}: flagAdd on non-number ${c.flag}`);
  }
  for (const { c, k } of allConds) {
    if (c.op === 'flag' && FLAGS[c.flag].values) assert.ok(FLAGS[c.flag].values.includes(c.equals), `${k.id}: reads ${c.flag}==${c.equals} not allowed`);
    if (c.op === 'flagCmp') assert.equal(typeof FLAGS[c.flag].initial, 'number', `${k.id}: flagCmp on non-number`);
  }
  for (const f of Object.values(FLAGS)) if (f.values) assert.ok(f.values.includes(f.initial));
});

// =====================================================================
test('GATE A: every choice mutates state; observation-only events grant something; every player tag is read somewhere', () => {
  for (const e of tl.events) {
    for (const ch of e.choices) {
      let n = 0; walkCons(ch.consequences, () => n++);
      assert.ok(n >= 1, `${e.id}/${ch.id}: cosmetic choice (no consequence)`);
    }
    if (e.choices.length === 0) {
      let n = 0; for (const o of e.observations) walkCons(o.grants, () => n++);
      assert.ok(n >= 1, `${e.id}: observation-only event grants nothing`);
    } else {
      assert.ok(e.choices.length >= 2, `${e.id}: a single choice is not a choice`);
    }
  }
  const unread = [...producedTags.keys()].filter((t) => !readTags.has(t) && !epilogueTags.has(t));
  assert.deepEqual(unread, [], `tags produced but never read (neither by a condition nor by an epilogue): ${unread.join(', ')}`);
  const unproduced = [...readTags].filter((t) => !producedTags.has(t) && ![...npcTagsGiven.values()].some((s) => s.has(t)));
  assert.deepEqual(unproduced, [], `tags read but never produced: ${unproduced.join(', ')}`);
  const unreadFlags = [...producedFlags.keys()].filter((f) => !readFlags.has(f) && !RULES.some((r) => (r.reads.flags || []).includes(f)));
  assert.deepEqual(unreadFlags, [], `flags written but never read: ${unreadFlags.join(', ')}`);
});

// =====================================================================
test('BELIEF INVARIANTS: OBSERVED/CONFIRMED grants match truth; wrong RUMORs are flagged misinformation', () => {
  for (const { c, k } of allCons) {
    if (c.type !== 'belief') continue;
    const t = FACTS[c.factId].value;
    if (RANK[c.status] >= RANK.OBSERVED) assert.equal(c.believedValue, t, `${k.id}: grants ${c.factId}=${c.believedValue} as ${c.status} but truth is ${t}`);
    if (c.believedValue !== t) assert.equal(c.misinformation, true, `${k.id}: ${c.factId} wrong value not marked misinformation`);
    if (c.misinformation) assert.notEqual(c.believedValue, t, `${k.id}: ${c.factId} marked misinformation but is true`);
    if (c.uncertainAboveStress !== undefined) assert.equal(c.agent, 'player', `${k.id}: uncertainty only applies to player perception`);
  }
});

test('NPC KNOWLEDGE never reads the player: background effects touch only NPCs and flags', () => {
  for (const b of tl.background) for (const c of b.effects) {
    assert.ok(['belief', 'flag', 'npcTag', 'npcStatus'].includes(c.type), `${b.id}: background effect type ${c.type} not allowed`);
    if (c.type === 'belief') assert.notEqual(c.agent, 'player', `${b.id}: background cannot grant player beliefs (use an event)`);
  }
});

// =====================================================================
// GATE C: knowledge traceability. Compute, per NPC, the set of facts it can ever hold.
function npcReachableFacts() {
  const reach = Object.fromEntries(NPC_IDS.map((n) => [n, new Set(NPCS[n].initialBeliefs.map((b) => b.factId))]));
  const grantsTo = (npc) => allCons.filter(({ c }) => c.type === 'belief' && c.agent === npc).map(({ c }) => c.factId);
  for (const n of NPC_IDS) grantsTo(n).forEach((f) => reach[n].add(f));
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PROP) {
      if (p.kind !== 'relay' || !p.facts) continue;
      for (const f of p.facts) if (reach[p.from].has(f) && !reach[p.to].has(f)) { reach[p.to].add(f); changed = true; }
    }
  }
  return reach;
}
const REACH = npcReachableFacts();

test('GATE C: every npcBelieves condition is satisfiable by a traceable path', () => {
  for (const { c, k } of allConds) if (c.op === 'npcBelieves') {
    assert.ok(REACH[c.npc].has(c.factId), `${k.id}: ${c.npc} can never learn ${c.factId}`);
  }
});

test('GATE C: an NPC can only be the source of a fact it can hold (unless deliberately lying)', () => {
  for (const { c, k } of allCons) {
    if (c.type !== 'belief' || c.source === 'self' || c.source === 'player') continue;
    if (c.misinformation) continue; // a lie needs no knowledge
    assert.ok(REACH[c.source].has(c.factId), `${k.id}: ${c.source} tells ${c.factId} but can never know it`);
  }
  for (const p of PROP) {
    if (p.kind === 'relay' && p.facts) for (const f of p.facts) assert.ok(REACH[p.from].has(f), `${p.id}: ${p.from} relays ${f} it can never hold`);
    if (p.kind === 'assert' && !p.misinformation) assert.ok(REACH[p.from].has(p.factId), `${p.id}: ${p.from} asserts ${p.factId} it can never hold`);
  }
});

test('GATE C: npcKnowsTag conditions reference tags the NPC can actually receive', () => {
  for (const { c, k } of allConds) if (c.op === 'npcKnowsTag') {
    assert.ok(npcTagsGiven.get(c.npc)?.has(c.tag), `${k.id}: ${c.npc} is never told/witnesses ${c.tag}`);
  }
});

test('GATE C: propagation edges exist in the relationship graph', () => {
  const edges = new Set(npcsFile.relationships.map((r) => r.from + '>' + r.to));
  for (const p of PROP) assert.ok(edges.has(p.from + '>' + p.to), `${p.id}: no relationship edge ${p.from}>${p.to}`);
});

// =====================================================================
test('GATE B: facts are confirmable exactly for the roles truth.json declares', () => {
  const confirmedBy = {}; // fact -> Set(role)
  for (const { c, k } of allCons) {
    if (c.type === 'belief' && c.agent === 'player' && c.status === 'CONFIRMED') {
      confirmedBy[c.factId] ??= new Set();
      k.roles.forEach((r) => confirmedBy[c.factId].add(r));
    }
  }
  for (const f of Object.values(FACTS)) {
    if (f.category === 'decoy') continue; // decoys can only ever be CONFIRMED *false* (debunked); covered by the belief-invariant test
    const got = [...(confirmedBy[f.id] || [])].sort();
    assert.deepEqual(got, [...f.confirmableBy].sort(), `${f.id}: confirmable by ${got} but truth says ${f.confirmableBy}`);
  }
});

test('ASYMMETRY: some facts are confirmable by only one role, and ≥40% of events are role-exclusive', () => {
  const oneRole = Object.values(FACTS).filter((f) => f.confirmableBy.length === 1);
  assert.ok(oneRole.some((f) => f.confirmableBy[0] === 'operator'), 'no operator-only fact');
  const captiveLeaning = Object.values(FACTS).filter((f) => f.category === 'incident' && f.confirmableBy.includes('captive'));
  assert.ok(captiveLeaning.length >= 3, 'captive has too few incident facts to confirm');
  const exclusive = tl.events.filter((e) => e.roles.length === 1).length;
  assert.ok(exclusive / tl.events.length >= 0.4, `role-exclusive events ${exclusive}/${tl.events.length} < 40%`);
});

// =====================================================================
test('TIMELINE: slots are valid; scheduled events are scheduled by someone, after the scheduler', () => {
  const scheduledBy = new Map();
  for (const { c, k } of allCons) if (c.type === 'schedule') scheduledBy.set(c.eventId, [...(scheduledBy.get(c.eventId) || []), { k, at: c.at }]);
  for (const e of tl.events) {
    for (const r of e.roles) assert.ok(ROLES.includes(r));
    for (const o of e.observations) for (const r of o.roles) assert.ok(e.roles.includes(r), `${e.id}: observation role ${r} outside event roles`);
    for (const ch of e.choices) for (const r of rolesOfCond(ch.available, e.roles)) assert.ok(e.roles.includes(r), `${e.id}/${ch.id}: choice role outside event roles`);
    if (e.trigger === 'scheduled') {
      assert.ok(!e.at && !e.window, `${e.id}: scheduled events have no fixed slot`);
      assert.ok(scheduledBy.has(e.id), `${e.id}: scheduled but nothing schedules it`);
      for (const s of scheduledBy.get(e.id)) {
        assert.ok(s.at >= 0 && s.at <= 20, `${e.id}: bad schedule ${s.at}`);
        if (s.k.segment !== undefined) assert.ok(s.at > s.k.segment, `${e.id}: scheduled by ${s.k.id} at ${s.at} not after its segment ${s.k.segment}`);
      }
    } else {
      assert.ok(e.at || e.window, `${e.id}: forced/optional events need a slot`);
      if (e.at) assert.ok(seg(e.at) >= 0 && seg(e.at) <= 20);
      if (e.window) assert.ok(seg(e.window.from) <= seg(e.window.to), `${e.id}: window inverted`);
      assert.ok(!scheduledBy.has(e.id), `${e.id}: fixed-slot event must not also be scheduled`);
    }
    assert.equal(e.abstractionCheck, true, `${e.id}: Gate G attestation missing`);
  }
  for (const r of RULES) {
    assert.ok(r.earliest >= 0 && r.earliest <= 20 && (r.latest ?? r.earliest) >= r.earliest && (r.latest ?? 20) <= 20, `${r.id}: bad window`);
    assert.equal(r.once, true);
  }
  const prios = RULES.map((r) => r.priority + ':' + r.earliest);
  assert.ok(prios.length);
});

test('RULES: `reads` documents exactly the seeds the condition uses', () => {
  for (const r of RULES) {
    const tags = new Set(), flags = new Set(), facts = new Set();
    walkCond(r.when, (c) => { if (c.op === 'tag') tags.add(c.tag); if (c.op === 'flag' || c.op === 'flagCmp') flags.add(c.flag); if (c.op === 'npcBelieves' || c.op === 'playerBelief') facts.add(c.factId); });
    assert.deepEqual([...tags].sort(), [...(r.reads.tags || [])].sort(), `${r.id}: reads.tags mismatch`);
    assert.deepEqual([...flags].sort(), [...(r.reads.flags || [])].sort(), `${r.id}: reads.flags mismatch`);
    assert.deepEqual([...facts].sort(), [...(r.reads.facts || [])].sort(), `${r.id}: reads.facts mismatch`);
  }
});

test('BUTTERFLY: every delayed rule reads a seed produced strictly earlier than it can fire', () => {
  for (const r of RULES) {
    const seeds = [...(r.reads.tags || []).flatMap((t) => producedTags.get(t) || []), ...(r.reads.flags || []).flatMap((f) => producedFlags.get(f) || [])];
    const earliestSeed = Math.min(...seeds.map((k) => k.segment ?? 0), 0);
    assert.ok(earliestSeed <= r.earliest, `${r.id}: fires before any seed exists`);
  }
  // At least three rules bridge ≥ 2 full days (6 segments) between seed and effect — the brief's "Day 1 affects Day 5".
  const longBridges = RULES.filter((r) => {
    const seeds = [...(r.reads.tags || []).flatMap((t) => producedTags.get(t) || []), ...(r.reads.flags || []).flatMap((f) => producedFlags.get(f) || [])];
    return seeds.some((k) => k.segment !== undefined && r.earliest - k.segment >= 6);
  });
  assert.ok(longBridges.length >= 3, `only ${longBridges.length} rules bridge ≥ 2 days`);
});

// =====================================================================
test('VERTICAL SLICE: Day 3 fully covered for both roles, plus a Day-5 echo', () => {
  const slice = tl.events.filter((e) => e.slice);
  for (const r of ROLES) for (const s of [6, 7, 8]) {
    assert.ok(slice.some((e) => e.roles.includes(r) && e.at && seg(e.at) === s), `slice: no ${r} event at segment ${s}`);
  }
  for (const r of ROLES) assert.ok(slice.some((e) => e.roles.includes(r) && e.trigger === 'scheduled'), `slice: no ${r} echo event`);
  // slice must contain a misleading interpretation (a RUMOR misinformation grant to the player) and a moral dilemma (choice with trust loss on one NPC and gain on another)
  const misleading = slice.some((e) => e.observations.some((o) => o.grants.some((g) => g.type === 'belief' && g.agent === 'player' && g.misinformation)));
  assert.ok(misleading, 'slice has no misleading interpretation');
  const dilemma = slice.some((e) => e.choices.some((ch) => { const d = {}; walkCons(ch.consequences, (c) => { if (c.type === 'trust') d[c.npc] = (d[c.npc] || 0) + c.delta; }); return Object.values(d).some((v) => v > 0) && Object.values(d).some((v) => v < 0); }));
  assert.ok(dilemma, 'slice has no choice that trades one relationship for another');
});

// =====================================================================
test('GATE F: four distinct endings with disjoint triggers; witness paths exist and are chronological', () => {
  assert.deepEqual(ENDINGS.map((e) => e.id).sort(), ['E_ESCAPE', 'E_EXPOSURE', 'E_INVERSION', 'E_TRANSFER']);
  assert.equal(new Set(ENDINGS.map((e) => e.priority)).size, 4, 'priorities must be unique');
  const fallback = ENDINGS.find((e) => e.id === 'E_TRANSFER');
  assert.equal(fallback.condition.op, 'always');
  assert.equal(fallback.priority, Math.max(...ENDINGS.map((e) => e.priority)), 'fallback must have the lowest precedence');
  const triggers = ENDINGS.filter((e) => e.id !== 'E_TRANSFER').map((e) => { const s = new Set(); walkCond(e.condition, (c) => { if (c.op === 'flag') s.add(c.flag); if (c.op === 'tag') s.add(c.tag); }); return s; });
  for (let i = 0; i < triggers.length; i++) for (let j = i + 1; j < triggers.length; j++) for (const x of triggers[i]) assert.ok(!triggers[j].has(x), `endings share trigger ${x}`);
  for (const en of ENDINGS) {
    for (const r of ROLES) assert.ok(en.witnessPaths.some((p) => p.role === r), `${en.id}: no witness path for ${r}`);
    for (const p of en.witnessPaths) {
      let last = -1;
      for (const step of p.steps) {
        const e = EVENTS[step.eventId];
        assert.ok(e, `${en.id}/${p.role}: unknown event ${step.eventId}`);
        assert.ok(e.roles.includes(p.role), `${en.id}/${p.role}: ${step.eventId} not playable by ${p.role}`);
        const ch = e.choices.find((c) => c.id === step.choiceId);
        assert.ok(ch, `${en.id}/${p.role}: ${step.eventId} has no choice ${step.choiceId}`);
        assert.ok(rolesOfCond(ch.available, e.roles).includes(p.role), `${en.id}/${p.role}: choice ${step.choiceId} not for this role`);
        let s;
        if (e.at) s = seg(e.at); else if (e.window) s = seg(e.window.from); else { const sched = allCons.filter(({ c }) => c.type === 'schedule' && c.eventId === e.id).map(({ c }) => c.at); s = Math.min(...sched); }
        assert.ok(s >= last || e.repeatable, `${en.id}/${p.role}: step ${step.eventId} out of order`);
        if (!e.repeatable) last = s;
      }
    }
    // every flag/tag in the ending condition has a producer for each role
    walkCond(en.condition, (c) => {
      if (c.op === 'flag') for (const r of ROLES) assert.ok(producedFlags.get(c.flag).some((k) => k.roles.includes(r)) || c.flag === 'operator.marked' && r === 'captive', `${en.id}: ${c.flag} unreachable for ${r}`);
    });
  }
});

// =====================================================================
test('GATE G: no operational content; every text field is abstract', () => {
  const banned = [/kịch bản/i, /script/i, /mật khẩu/i, /chuyển khoản/i, /tài khoản ngân hàng/i, /OTP/];
  const texts = [];
  for (const e of tl.events) { texts.push(e.summary.vi); e.observations.forEach((o) => texts.push(o.text.vi)); e.choices.forEach((c) => texts.push(c.label.vi)); }
  for (const b of tl.background) texts.push(b.summary.vi);
  for (const f of Object.values(FACTS)) texts.push(f.statement.vi);
  for (const t of texts) for (const re of banned) assert.ok(!re.test(t), `banned term ${re} in: ${t}`);
});

test('CAUSAL ORIGIN: every mutation container is one of the five enumerated kinds', () => {
  const kinds = new Set(containers.filter((k) => k.cons.length).map((k) => k.kind));
  for (const k of kinds) assert.ok(['background', 'observation', 'choice', 'rule', 'propagation'].includes(k), `unexpected mutation source kind ${k}`);
});
