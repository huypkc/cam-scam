// THE COMPOUND — Phase 3 STATIC tests for the NPC Intent Layer (content/npc.intents.json).
// Gate C extended to the behaviour layer (PO decision P2): an NPC may only DECIDE on what it can know.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadContent, NPC_IDS } from '../src/engine/evaluator.mjs';

const C = loadContent();
const I = C.intents;
const FLAGS = Object.fromEntries(C.flags.map((f) => [f.id, f]));
const FACTS = C.truth.facts;
const RULE_IDS = new Set([...C.delayedRules.map((r) => r.id), ...C.propagation.map((p) => p.id)]);
const EVENT_IDS = new Set(C.events.map((e) => e.id));

import { walkCond, walkCons, visibilityViolations as _vv, reachableFacts } from './static-checks.mjs';
const visibilityViolations = (cond, actor) => _vv(C, cond, actor);

test('INTENTS: ids, prefixes, actor/drive/supersedes references', () => {
  const drives = new Set();
  for (const d of I.drives) { assert.match(d.id, /^D_/); assert.ok(NPC_IDS.includes(d.npc), d.id); assert.ok(!drives.has(d.id), 'dup drive'); drives.add(d.id); }
  const ids = new Set();
  for (const a of I.actions) {
    assert.match(a.id, /^A_/); assert.ok(!ids.has(a.id), `dup action ${a.id}`); ids.add(a.id);
    assert.ok(NPC_IDS.includes(a.actor), `${a.id}: bad actor`);
    const d = I.drives.find((x) => x.id === a.drive);
    assert.ok(d, `${a.id}: unknown drive ${a.drive}`);
    assert.equal(d.npc, a.actor, `${a.id}: drive ${a.drive} belongs to ${d.npc}, not actor ${a.actor}`);
    for (const s of a.supersedes || []) assert.ok(RULE_IDS.has(s), `${a.id}: supersedes unknown rule ${s}`);
    assert.ok(a.earliest >= 0 && (a.latest ?? a.earliest) >= a.earliest && (a.latest ?? 20) <= 20, `${a.id}: bad window`);
    assert.equal(typeof a.priority, 'number');
    walkCons(a.effects, (c) => {
      if (c.type === 'schedule') { assert.ok(EVENT_IDS.has(c.eventId), `${a.id}: schedules unknown ${c.eventId}`); assert.ok(c.at > a.earliest, `${a.id}: schedules ${c.eventId} at ${c.at} not after earliest ${a.earliest}`); }
      if (c.type === 'flag' || c.type === 'flagAdd') assert.ok(FLAGS[c.flag], `${a.id}: unknown flag ${c.flag}`);
      if (c.type === 'belief') assert.ok(FACTS[c.factId], `${a.id}: unknown fact ${c.factId}`);
    });
  }
  // every NPC with a drive has at least one action or an explicit "expressed by Phase 2 rules" note
  for (const d of I.drives) {
    const has = I.actions.some((a) => a.drive === d.id) || /PR_|Phase 2/.test(d.description.vi);
    assert.ok(has, `${d.id}: drive with no action and no note`);
  }
});

test('INTENTS: each superseded Phase 2 rule is superseded by exactly one action', () => {
  const seen = new Map();
  for (const a of I.actions) for (const s of a.supersedes || []) { assert.ok(!seen.has(s), `${s} superseded twice (${seen.get(s)}, ${a.id})`); seen.set(s, a.id); }
  assert.ok(seen.size >= 6, `expected ≥6 superseded rules (docs/04 §2.3), got ${seen.size}`);
});

test('GATE C (behaviour): every NpcAction decision reads only what the actor can know', () => {
  for (const a of I.actions) {
    const v = visibilityViolations(a.when, a.actor);
    assert.deepEqual(v, [], `${a.id} (${a.actor}) decides on: ${v.join(', ')}`);
  }
});

test('GATE C (behaviour): PropagationRule conditions obey visibility for `from`, except declared exceptions with a reason', () => {
  const exc = new Map(I.visibilityExceptions.map((e) => [e.ruleId, e]));
  for (const e of I.visibilityExceptions) { assert.ok(RULE_IDS.has(e.ruleId) || I.actions.some((a) => a.id === e.ruleId), `exception for unknown ${e.ruleId}`); assert.ok(e.reason?.vi?.length > 20, `${e.ruleId}: exception needs a real reason`); }
  const dead = new Set(I.actions.flatMap((a) => a.supersedes || []));
  for (const p of C.propagation) {
    if (dead.has(p.id)) continue;
    const v = visibilityViolations(p.when, p.from);
    if (v.length) assert.ok(exc.has(p.id), `${p.id} (${p.from}) reads ${v.join(', ')} with no declared exception`);
    else assert.ok(!exc.has(p.id), `${p.id}: exception declared but no violation (stale)`);
  }
});

test('INTENTS: resolution (`effects`) may read only visible state or declared `touches`', () => {
  for (const a of I.actions) {
    const touchF = new Set(a.touches?.flags || []), touchT = new Set(a.touches?.tags || []);
    walkCons(a.effects, () => {}, (c) => {
      walkCond(c, (x) => {
        if ((x.op === 'flag' || x.op === 'flagCmp') && !touchF.has(x.flag)) assert.deepEqual(visibilityViolations(x, a.actor), [], `${a.id}: resolution reads flag ${x.flag} not in touches`);
        if (x.op === 'tag') assert.ok(touchT.has(x.tag), `${a.id}: resolution reads player tag ${x.tag} not in touches`);
        if (['npcBelieves', 'npcKnowsTag', 'trust'].includes(x.op) && x.npc !== a.actor) assert.fail(`${a.id}: resolution reads ${x.op} of ${x.npc}`);
        if (x.op === 'playerBelief' || x.op === 'eventFired') assert.fail(`${a.id}: resolution reads ${x.op}`);
      });
    });
    for (const f of touchF) assert.ok(FLAGS[f], `${a.id}: touches unknown flag ${f}`);
  }
});

test('INTENTS: `reads` documents exactly the flags/facts the decision uses (same contract as DelayedRule)', () => {
  for (const a of I.actions) {
    const flags = new Set(), facts = new Set(), tags = new Set();
    walkCond(a.when, (c) => { if (c.op === 'flag' || c.op === 'flagCmp') flags.add(c.flag); if (c.op === 'npcBelieves') facts.add(c.factId); if (c.op === 'tag') tags.add(c.tag); });
    assert.deepEqual([...flags].sort(), [...(a.reads.flags || [])].sort(), `${a.id}: reads.flags`);
    assert.deepEqual([...facts].sort(), [...(a.reads.facts || [])].sort(), `${a.id}: reads.facts`);
    assert.deepEqual([...tags].sort(), [...(a.reads.tags || [])].sort(), `${a.id}: reads.tags`);
  }
});

test('GATE C (knowledge): action belief grants and npcBelieves conditions stay inside the reachable-knowledge fixpoint', () => {
  const reach = reachableFacts(C);
  for (const a of I.actions) {
    walkCond(a.when, (c) => { if (c.op === 'npcBelieves') assert.ok(reach[c.npc].has(c.factId), `${a.id}: ${c.npc} can never learn ${c.factId}`); });
    walkCons(a.effects, (c) => {
      if (c.type !== 'belief' || c.source === 'self' || c.source === 'player' || c.misinformation) return;
      assert.ok(reach[c.source].has(c.factId), `${a.id}: ${c.source} tells ${c.factId} it can never hold`);
    }, (cond) => walkCond(cond, (c) => { if (c.op === 'npcBelieves') assert.ok(reach[c.npc].has(c.factId), `${a.id}: resolution asks ${c.npc} about unreachable ${c.factId}`); }));
    // OBSERVED/CONFIRMED self-grants must be physical contact: the action must `touch` something or be a once-off inspection
    walkCons(a.effects, (c) => {
      if (c.type === 'belief' && c.source === 'self' && c.status !== 'RUMOR') assert.ok(a.touches?.flags?.length, `${a.id}: ${c.agent} self-${c.status} ${c.factId} without touching anything (audit F-04 / T-I3)`);
      if (c.type === 'belief' && c.status !== 'RUMOR') assert.equal(c.believedValue, FACTS[c.factId].value, `${a.id}: ${c.factId} ${c.status} wrong value`);
      if (c.type === 'belief' && c.believedValue !== FACTS[c.factId].value) assert.equal(c.misinformation, true, `${a.id}: wrong value not attested`);
    });
  }
});

test('INTENTS: no two actions of different NPCs write the same flag at the same priority in overlapping windows (docs/04 R-E4)', () => {
  const writes = [];
  for (const a of I.actions) walkCons(a.effects, (c) => { if (c.type === 'flag' || c.type === 'flagAdd') writes.push({ a, flag: c.flag }); });
  for (let i = 0; i < writes.length; i++) for (let j = i + 1; j < writes.length; j++) {
    const x = writes[i], y = writes[j];
    if (x.a.id === y.a.id || x.a.actor === y.a.actor || x.flag !== y.flag) continue;
    const overlap = x.a.earliest <= (y.a.latest ?? 20) && y.a.earliest <= (x.a.latest ?? 20);
    if (overlap) assert.notEqual(x.a.priority, y.a.priority, `${x.a.id} and ${y.a.id} both write ${x.flag} at priority ${x.a.priority}`);
  }
});

test('INTENTS: new flags are read somewhere; flag visibility declarations are well-formed', () => {
  const read = new Set(), written = new Set();
  const collect = (cond) => walkCond(cond, (c) => { if (c.op === 'flag' || c.op === 'flagCmp') read.add(c.flag); });
  for (const a of I.actions) { collect(a.when); walkCons(a.effects, (c) => { if (c.type === 'flag' || c.type === 'flagAdd') written.add(c.flag); }, collect); }
  for (const r of C.delayedRules) collect(r.when);
  for (const p of C.propagation) collect(p.when);
  for (const e of C.events) { collect(e.preconditions); e.observations.forEach((o) => collect(o.when)); e.choices.forEach((ch) => { collect(ch.available); walkCons(ch.consequences, () => {}, collect); }); }
  for (const en of C.endings) collect(en.condition);
  for (const f of written) assert.ok(read.has(f), `flag ${f} written by an action but never read`);
  for (const f of C.flags) {
    if (f.visibleTo !== undefined) assert.ok(f.visibleTo === 'all' || (Array.isArray(f.visibleTo) && f.visibleTo.every((n) => NPC_IDS.includes(n))), `${f.id}: bad visibleTo`);
    if (f.visibleByValue) for (const [v, who] of Object.entries(f.visibleByValue)) { assert.ok(f.values.includes(v), `${f.id}: visibleByValue for unknown value ${v}`); assert.ok(who.every((n) => NPC_IDS.includes(n)), `${f.id}: bad npc in visibleByValue`); }
    for (const t of f.terminal || []) assert.ok(f.values.includes(t), `${f.id}: terminal value ${t} not in values`);
  }
  assert.ok(C.flags.length <= 40, `GDD R1: flag cap 40, have ${C.flags.length}`);
});

test('GATE G (Phase 3 content): intent texts carry no operational detail; D9: no real places, organisations or cases are named anywhere', () => {
  const banned = [/kịch bản/i, /script/i, /mật khẩu/i, /chuyển khoản/i, /tài khoản ngân hàng/i, /OTP/];
  const texts = [];
  for (const d of I.drives) texts.push(d.name.vi, d.description.vi);
  for (const a of I.actions) texts.push(a.description.vi);
  for (const e of I.visibilityExceptions) texts.push(e.reason.vi);
  for (const t of texts) for (const re of banned) assert.ok(!re.test(t), `banned term ${re} in: ${t}`);
  // D9 — fully fictional identities: a conservative list of real-world places / organisations associated with the theme must not appear in any content or doc text.
  const real = [/campuchia/i, /cambodia/i, /myanmar/i, /miến điện/i, /myawaddy/i, /sihanoukville/i, /kk park/i, /bavet/i, /tam thái tử/i, /golden triangle/i, /tam giác vàng/i, /philippines/i, /lào\b/i, /\blaos\b/i, /thái lan/i, /thailand/i, /dubai/i, /interpol/i, /bộ công an/i];
  const files = ['content/truth.json', 'content/flags.json', 'content/npcs.json', 'content/timeline.json', 'content/rules.delayed.json', 'content/npc.intents.json', 'content/endings.json', 'docs/01-phase1-gdd-lite.md', 'docs/02-phase2-architecture.md'];
  for (const f of files) { const txt = readFileSync(new URL('../' + f, import.meta.url), 'utf8'); for (const re of real) assert.ok(!re.test(txt), `${f}: real-world reference ${re} (D9)`); }
});
