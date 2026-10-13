// THE COMPOUND — Phase 3 DYNAMIC tests (reference evaluator). Zero dependencies: `node --test tests/`.
// T01–T10 are the adversarial tests required by the Phase 3 review brief; S/O/WP/CF/ZP are scenario, witness-path,
// counterfactual-sensitivity and zero-player tests. Each test's assertion message states initial state → trigger → expected.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { loadContent, start, run, runSegment, apply, evaluate, scriptedPolicy, passivePolicy, supersededIds, NPC_IDS, RANK, seg } from '../src/engine/evaluator.mjs';
import { SCENARIOS, witnessPolicies } from './corpus.mjs';
import { walkCond, walkCons, visibilityViolations, knowledgePathViolations, butterflyViolations, relayArrivalViolations } from './static-checks.mjs';

const CONTENT = loadContent();
const BASELINE = loadContent({ intents: false });
const TRUTH_SNAPSHOT = JSON.stringify(CONTENT.truth);

/** Run a scenario capturing per-segment snapshots. */
export function trace(content, role, policy) {
  const st = start(content, role);
  const segs = [];
  while (st.segment < 21 && !st.ending) {
    const s = st.segment;
    const ended = runSegment(content, st, policy);
    segs[s] = { phone: st.flags['phone.location'], trust: Object.fromEntries(NPC_IDS.map((n) => [n, st.npcs[n].trustToPlayer])), stress: st.player.stress, suspicion: st.player.suspicion, status: Object.fromEntries(NPC_IDS.map((n) => [n, st.npcs[n].status])), flags: { ...st.flags } };
    if (ended) break;
  }
  return { st, segs };
}

/** Compare a run against a corpus `expect` block; returns mismatches (empty = PASS). */
export function checkExpect(t, exp) {
  const m = [], { st, segs } = t;
  const fired = new Set([...st.firedRules, ...st.firedActions, ...st.firedPropagations]);
  for (const [s, v] of Object.entries(exp.phoneAt || {})) if (segs[s]?.phone !== v) m.push(`phone@${s}: expected ${v}, got ${segs[s]?.phone}`);
  for (const [s, tr] of Object.entries(exp.trustAt || {})) for (const [n, v] of Object.entries(tr)) if (segs[s]?.trust[n] !== v) m.push(`trust.${n}@${s}: expected ${v}, got ${segs[s]?.trust[n]}`);
  for (const id of exp.fired || []) if (!fired.has(id)) m.push(`expected ${id} to fire`);
  for (const id of exp.notFired || []) if (fired.has(id)) m.push(`expected ${id} NOT to fire`);
  for (const [f, v] of Object.entries(exp.flags || {})) if (st.flags[f] !== v) m.push(`flag ${f}: expected ${v}, got ${st.flags[f]}`);
  for (const [n, v] of Object.entries(exp.status || {})) if (st.npcs[n].status !== v) m.push(`${n}.status: expected ${v}, got ${st.npcs[n].status}`);
  for (const [n, facts] of Object.entries(exp.npcBelief || {})) for (const [f, status] of Object.entries(facts)) if (st.npcs[n].knowledge.beliefs[f]?.status !== status) m.push(`${n} believes ${f}: expected ${status}, got ${st.npcs[n].knowledge.beliefs[f]?.status}`);
  for (const n of exp.noActionBy || []) if (st.mutationLog.some((x) => x.cause.kind === 'npc_action' && x.cause.actor === n)) m.push(`${n} acted but should not`);
  for (const e of exp.events || []) if (!st.firedEvents.includes(e)) m.push(`expected event ${e}`);
  for (const e of exp.notEvents || []) if (st.firedEvents.includes(e)) m.push(`expected NO event ${e}`);
  for (const tg of exp.tags || []) if (!st.player.knowledge.tags[tg]) m.push(`expected tag ${tg}`);
  for (const tg of exp.notTags || []) if (st.player.knowledge.tags[tg]) m.push(`expected NO tag ${tg}`);
  if (exp.ending && st.ending !== exp.ending) m.push(`ending: expected ${exp.ending}, got ${st.ending}`);
  return m;
}

/** Exact state just before mutation `seq`, rebuilt by replaying the log onto a fresh start state (no RNG → exact). */
export function stateBefore(content, r, seq) {
  const st = start(content, r.role);
  for (const m of r.st.mutationLog) {
    if (m.seq >= seq) break;
    st.segment = m.at;
    const c = m.consequence;
    if (c.type === 'belief') { // replay with the already-resolved status/source (uncertainty was resolved at grant time)
      const ks = c.agent === 'player' ? st.player.knowledge : st.npcs[c.agent].knowledge;
      const resolved = (c.agent === 'player' ? r.st.player.knowledge : r.st.npcs[c.agent].knowledge).beliefs[c.factId];
      const prev = ks.beliefs[c.factId];
      const status = resolved && resolved.cause === m.cause ? resolved.status : c.status;
      if (!prev || RANK[prev.status] < RANK[status]) ks.beliefs[c.factId] = { factId: c.factId, status, believedValue: c.believedValue, source: c.source, acquiredAt: m.at, cause: m.cause };
      continue;
    }
    if (c.type === 'endGame') { st.ending = c.endingId; continue; }
    apply(content, st, c, m.cause);
  }
  return st;
}

// ---------------------------------------------------------------- corpus (built once, reused by T01–T09)
const RUNS = [];
for (const sc of SCENARIOS) RUNS.push({ id: sc.id, role: sc.role, mode: 'intents', ...trace(CONTENT, sc.role, sc.policy) });
for (const sc of SCENARIOS) RUNS.push({ id: sc.id + '/baseline', role: sc.role, mode: 'baseline', ...trace(BASELINE, sc.role, sc.policy) });
for (const wp of witnessPolicies(CONTENT)) RUNS.push({ id: wp.id, role: wp.role, mode: 'intents', wantEnding: wp.ending, ...trace(CONTENT, wp.role, wp.policy) });
for (const role of ['captive', 'operator']) for (const pol of ['first', 'last']) RUNS.push({ id: `ZP_${role}_${pol}`, role, mode: 'intents', ...trace(CONTENT, role, passivePolicy(pol)) });
const INTENT_RUNS = RUNS.filter((r) => r.mode === 'intents');

// =====================================================================================================
test('T01 — NPC never learns a fact without a valid information path (dynamic + adversarial)', () => {
  const ALLOWED_CAUSES = new Set(['engine_init', 'background', 'choice', 'observation', 'delayed_rule', 'propagation', 'npc_action']);
  const violations = [];
  for (const r of RUNS) {
    const held = {}; // agent -> fact -> first seq
    for (const n of NPC_IDS) for (const f of Object.keys(r.st.npcs[n].knowledge.beliefs)) if (r.st.npcs[n].knowledge.beliefs[f].cause.kind === 'engine_init') (held[n] ??= {})[f] = -1;
    for (const m of r.st.mutationLog) {
      const c = m.consequence;
      if (c.type !== 'belief') continue;
      if (!ALLOWED_CAUSES.has(m.cause.kind)) violations.push(`${r.id}: ${c.agent} got ${c.factId} via unknown cause ${m.cause.kind}`);
      const wrong = c.believedValue !== CONTENT.truth.facts[c.factId].value;
      if (c.source !== 'self' && c.source !== 'player' && c.agent !== c.source && !(wrong && c.misinformation)) {
        if (held[c.source]?.[c.factId] === undefined || held[c.source][c.factId] >= m.seq) violations.push(`${r.id} seg ${m.at}: ${c.agent} learns ${c.factId} from ${c.source}, who does not hold it (cause ${JSON.stringify(m.cause)})`);
      }
      if (c.agent !== 'player') (held[c.agent] ??= {})[c.factId] ??= m.seq;
      else (held.player ??= {})[c.factId] ??= m.seq;
    }
  }
  assert.deepEqual(violations, [], violations.join('\n'));
  // adversarial: Mai is given a fact "from Linh" that Linh can never hold → static checker must reject
  const bad = loadContent({ mutate: (b) => { b.intents.actions.push({ id: 'A_X', actor: 'mai', drive: 'D_MAI_SELF_RESCUE', reads: {}, when: { op: 'always' }, earliest: 1, once: true, priority: 1, effects: [{ type: 'belief', agent: 'mai', factId: 'F_THACH_PLANS_OWN_EXIT', status: 'RUMOR', believedValue: true, source: 'linh' }] }); return b; } });
  assert.ok(knowledgePathViolations(bad).some((v) => v.startsWith('A_X')), 'adversarial injection not caught');
  assert.deepEqual(knowledgePathViolations(CONTENT), []);
});

test('T02 — no consequence precedes its cause (monotonic log, schedules strictly in the future, seeds before rules)', () => {
  const v = [];
  for (const r of RUNS) {
    let last = -1;
    for (const m of r.st.mutationLog) {
      if (m.at < last) v.push(`${r.id}: seq ${m.seq} at ${m.at} after seq at ${last}`);
      last = m.at;
      if (m.cause.at !== undefined && m.cause.at !== m.at) v.push(`${r.id}: cause.at ${m.cause.at} ≠ mutation.at ${m.at}`);
      if (m.consequence.type === 'schedule' && m.consequence.at <= m.at) v.push(`${r.id}: ${m.cause.ruleId ?? m.cause.actionId ?? m.cause.eventId} schedules ${m.consequence.eventId} at ${m.consequence.at} not after ${m.at}`);
    }
    for (const n of NPC_IDS) for (const b of Object.values(r.st.npcs[n].knowledge.beliefs)) if (b.cause.at !== undefined && b.acquiredAt !== b.cause.at) v.push(`${r.id}: ${n} ${b.factId} acquiredAt ${b.acquiredAt} ≠ cause.at ${b.cause.at}`);
    for (const a of r.st.actionLog) if (a.kind === 'scheduled') { const sch = r.st.mutationLog.find((m) => m.consequence.type === 'schedule' && m.consequence.eventId === a.eventId); if (!sch || sch.at >= a.segment) v.push(`${r.id}: ${a.eventId} fired at ${a.segment} without earlier schedule`); }
  }
  assert.deepEqual(v, [], v.join('\n'));
  assert.deepEqual(butterflyViolations(CONTENT), []);
  const bad = loadContent({ mutate: (b) => { b.intents.actions.find((a) => a.id === 'A_VU_SEES_DUC_CALL').earliest = 5; return b; } });
  assert.ok(butterflyViolations(bad).some((x) => x.startsWith('A_VU_SEES_DUC_CALL')), 'rule opening before its seed not caught');
});

test('T03 — NPC never acts beyond its knowledge (visibility contract, dynamic belief-age check, adversarial)', () => {
  for (const a of CONTENT.intents.actions) assert.deepEqual(visibilityViolations(CONTENT, a.when, a.actor), [], a.id);
  // dynamic: reconstruct the exact state just before each npc_action fired (from the mutation log) and re-evaluate its decision
  const v = [];
  for (const r of INTENT_RUNS) {
    const firstSeqOfAction = new Map();
    for (const m of r.st.mutationLog) if (m.cause.kind === 'npc_action' && !firstSeqOfAction.has(m.cause.actionId + '@' + m.at)) firstSeqOfAction.set(m.cause.actionId + '@' + m.at, m);
    for (const [, m] of firstSeqOfAction) {
      const a = CONTENT.intents.actions.find((x) => x.id === m.cause.actionId);
      const before = stateBefore(CONTENT, r, m.seq);
      before.segment = m.at;
      if (!evaluate(CONTENT, before, a.when)) v.push(`${r.id}: ${a.id} fired at ${m.at} but its decision is false on the state just before it fired`);
      walkCond(a.when, (c) => { if (c.op === 'npcBelieves') { const b = before.npcs[c.npc].knowledge.beliefs[c.factId]; if (b && b.acquiredAt > m.at) v.push(`${r.id}: ${a.id} used a belief from the future`); } });
    }
  }
  assert.deepEqual([...new Set(v)], []);
  // adversarial: Linh "knows" where the phone is from the world flag
  const bad = { op: 'flag', flag: 'phone.location', equals: 'dorm_ceiling' };
  assert.deepEqual(visibilityViolations(CONTENT, bad, 'linh'), ['flag phone.location==dorm_ceiling']);
  assert.deepEqual(visibilityViolations(CONTENT, bad, 'duc'), [], 'the hider may know');
  assert.deepEqual(visibilityViolations(CONTENT, { op: 'stat', stat: 'stress', cmp: '>=', value: 1 }, 'thach'), ['stat stress'], 'STRESS is internal to the player');
  assert.deepEqual(visibilityViolations(CONTENT, { op: 'tag', tag: 'T_C_TOOK_PHONE' }, 'vu'), ['tag (player-private)']);
});

test('T04 — no two incompatible world states coexist (per segment, every run)', () => {
  const NEG = [['F_SEARCH_IS_LEAK_HUNT', 'F_SEARCH_IS_ABOUT_STOLEN_PHONE'], ['F_LINH_RELEASE_IS_LIE', 'F_LINH_RELEASE_DATE_REAL'], ['F_PHONE_TAKEN_BY_DUC', 'F_PHONE_TAKEN_BY_CAPTIVE_PC']];
  const PHONE_VALUES = CONTENT.flags.find((f) => f.id === 'phone.location').values;
  const v = [], rumorContradictions = [];
  for (const r of RUNS) {
    for (const [s, snap] of Object.entries(r.segs)) {
      const f = snap.flags;
      if (f['player.escaped'] && f['player.caught']) v.push(`${r.id}@${s}: escaped ∧ caught`);
      if (f['raid.happened'] && f['transfer.prepStarted']) v.push(`${r.id}@${s}: raid ∧ transfer`);
      if (f['raid.scheduled'] && f['transfer.prepStarted']) v.push(`${r.id}@${s}: raid.scheduled ∧ transfer.prepStarted`);
      if (!PHONE_VALUES.includes(f['phone.location'])) v.push(`${r.id}@${s}: phone.location=${f['phone.location']}`);
      if (f['mai.dealActive'] && snap.status.mai === 'isolated' && !r.st.firedEvents.includes('EV_O_D5A_MAI_DEAL')) v.push(`${r.id}@${s}: deal with isolated Mai`);
      if (f['duc.scapegoated'] && snap.status.duc === 'present' && r.mode === 'intents') v.push(`${r.id}@${s}: Đức scapegoated yet present (audit F-22 pattern)`);
    }
    assert.ok(r.st.mutationLog.filter((m) => m.consequence.type === 'endGame').length <= 1, `${r.id}: two endings`);
    for (const agent of [...NPC_IDS, 'player']) {
      const ks = agent === 'player' ? r.st.player.knowledge : r.st.npcs[agent].knowledge;
      for (const [a, b] of NEG) {
        const x = ks.beliefs[a], y = ks.beliefs[b];
        if (!x || !y) continue;
        if (x.believedValue === true && y.believedValue === true) {
          if (RANK[x.status] >= 2 && RANK[y.status] >= 2) v.push(`${r.id}: ${agent} holds ${a} and ${b} both true at ≥ OBSERVED`);
          else rumorContradictions.push(`${r.id}: ${agent} ${a}(${x.status}) vs ${b}(${y.status})`);
        }
      }
    }
  }
  assert.deepEqual(v, [], v.join('\n'));
  // RUMOR-level contradictions are legal (audit F-18) but must be visible to reviewers:
  test.diagnostic?.(`rumor-level contradictions: ${rumorContradictions.length}`);
});

test('T05 — a rumor never becomes canonical: beliefs ≥ OBSERVED always match truth; status never downgrades; relays cap at OBSERVED', () => {
  for (const r of RUNS) {
    for (const agent of [...NPC_IDS, 'player']) {
      const ks = agent === 'player' ? r.st.player.knowledge : r.st.npcs[agent].knowledge;
      for (const b of Object.values(ks.beliefs)) if (RANK[b.status] >= 2) assert.equal(b.believedValue, CONTENT.truth.facts[b.factId].value, `${r.id}: ${agent} ${b.factId} ${b.status} wrong`);
    }
    const seen = {};
    for (const m of r.st.mutationLog) if (m.consequence.type === 'belief') {
      const k = m.consequence.agent + ':' + m.consequence.factId;
      const prev = seen[k] ?? 0, now = RANK[m.consequence.status];
      assert.ok(now > prev || m.consequence.uncertainAboveStress !== undefined, `${r.id}: ${k} logged ${m.consequence.status} after rank ${prev} (equal-rank grant must be a no-op)`);
      seen[k] = Math.max(prev, now);
    }
  }
  assert.deepEqual(relayArrivalViolations(CONTENT), []);
  // adversarial unit: apply() refuses a wrong OBSERVED, accepts upgrade, ignores downgrade
  const st = start(CONTENT, 'captive');
  assert.throws(() => apply(CONTENT, st, { type: 'belief', agent: 'vu', factId: 'F_DUC_IS_THE_LEAK', status: 'OBSERVED', believedValue: true, source: 'self' }, { kind: 'engine_init' }), /wrong value/);
  apply(CONTENT, st, { type: 'belief', agent: 'vu', factId: 'F_PHONE_EXISTS', status: 'RUMOR', believedValue: true, source: 'self' }, { kind: 'engine_init' });
  apply(CONTENT, st, { type: 'belief', agent: 'vu', factId: 'F_PHONE_EXISTS', status: 'CONFIRMED', believedValue: true, source: 'self' }, { kind: 'engine_init' });
  const n = st.mutationLog.length;
  apply(CONTENT, st, { type: 'belief', agent: 'vu', factId: 'F_PHONE_EXISTS', status: 'RUMOR', believedValue: false, source: 'linh', misinformation: true }, { kind: 'engine_init' });
  assert.equal(st.npcs.vu.knowledge.beliefs.F_PHONE_EXISTS.status, 'CONFIRMED'); assert.equal(st.mutationLog.length, n, 'downgrade must not log');
  const bad = loadContent({ mutate: (b) => { b.propagation.find((p) => p.id === 'PR_LINH_RELAY_LOCATION').arriveAs = 'CONFIRMED'; return b; } });
  assert.deepEqual(relayArrivalViolations(bad), ['PR_LINH_RELAY_LOCATION: arriveAs CONFIRMED']);
});

test('T06 — replay divergence never corrupts shared facts: WorldTruth frozen, canonical background identical, runs deterministic', () => {
  assert.equal(JSON.stringify(CONTENT.truth), TRUTH_SNAPSHOT, 'WorldTruth changed during the corpus');
  assert.throws(() => { CONTENT.truth.facts.F_TRANSFER_DAY7.value = false; }, 'truth must be frozen');
  assert.ok(Object.isFrozen(CONTENT.truth));
  const bg = (r) => JSON.stringify(r.st.mutationLog.filter((m) => m.cause.kind === 'background' && m.consequence.type !== 'stat').map((m) => [m.at, m.cause.backgroundId, m.consequence]));
  const ref = bg(RUNS[0]);
  for (const r of RUNS) assert.equal(bg(r), ref, `${r.id}: canonical background differs`);
  for (const r of RUNS) for (const n of NPC_IDS) assert.deepEqual(Object.values(r.st.npcs[n].knowledge.beliefs).filter((b) => b.cause.kind === 'engine_init').map((b) => b.factId).sort(), CONTENT.npcs.find((x) => x.id === n).initialBeliefs.map((b) => b.factId).sort(), `${r.id}: ${n} initial knowledge differs`);
  for (const sc of SCENARIOS.slice(0, 3)) { const a = trace(CONTENT, sc.role, sc.policy), b = trace(CONTENT, sc.role, sc.policy); assert.equal(JSON.stringify(a.st.mutationLog), JSON.stringify(b.st.mutationLog), `${sc.id}: non-deterministic`); }
  // divergence comes only from choices / NPC intents / asymmetry / causality — never from a random source
  for (const f of ['content/timeline.json', 'content/npcs.json', 'content/rules.delayed.json', 'content/npc.intents.json', 'src/engine/evaluator.mjs']) assert.ok(!/Math\.random|"seed"|\brandom\b/.test(readFileSync(new URL('../' + f, import.meta.url), 'utf8')), `${f} uses randomness`);
});

test('T07 — delayed consequences never silently disappear: every schedule fires or is logged as skipped; liveness report', () => {
  for (const r of RUNS) {
    for (const m of r.st.mutationLog.filter((m) => m.consequence.type === 'schedule')) {
      if (r.st.ending && m.consequence.at > r.st.segment) continue; // game ended first — allowed
      const fired = r.st.actionLog.some((a) => a.eventId === m.consequence.eventId && a.segment === m.consequence.at);
      assert.ok(fired, `${r.id}: ${m.consequence.eventId} scheduled for ${m.consequence.at} vanished`);
    }
    assert.equal(new Set(r.st.firedRules).size, r.st.firedRules.length, `${r.id}: a once-rule fired twice`);
    assert.equal(new Set(r.st.firedActions).size, r.st.firedActions.length, `${r.id}: an action fired twice`);
  }
  const dead = supersededIds(CONTENT);
  const live = [...CONTENT.delayedRules.map((r) => r.id).filter((id) => !dead.has(id)), ...CONTENT.intents.actions.map((a) => a.id), ...CONTENT.propagation.map((p) => p.id).filter((id) => !dead.has(id))];
  const fired = new Set(INTENT_RUNS.flatMap((r) => [...r.st.firedRules, ...r.st.firedActions, ...r.st.firedPropagations]));
  const never = live.filter((id) => !fired.has(id));
  // MVP: every live rule, action and propagation fires in at least one corpus run (Phase 3 had two dead ones — audit F-01 cascade).
  assert.deepEqual(never.sort(), [], `never fired in corpus: ${never.join(', ')}`);
});

test('T08 — phone scenario never violates access constraints: every phone.location transition has an authorised actor', () => {
  const ALLOWED = {
    'mai_drawer>dorm_ceiling': ['background:BG_D3M_THEFT'],
    'dorm_ceiling>yard_cache': ['choice:EV_C_D4A_PHONE_DECISION'], 'dorm_ceiling>player': ['choice:EV_C_D4A_PHONE_DECISION'],
    'player>linh': ['choice:EV_C_D4N_LINH_OFFER'], 'linh>thach': ['npc_action:linh'], 'yard_cache>player': ['observation:EV_C_D5A_PHONE_CONTENTS'],
    'dorm_ceiling>mai': ['npc_action:mai'],
    'vu_locker>player': ['choice:EV_S_D5A_PHONE_FOUND_BY_VU'], 'vu_locker>thach': ['choice:EV_S_D5A_PHONE_FOUND_BY_VU', 'npc_action:vu', 'propagation:PR_VU_REPORTS_PHONE'],
    'player>thach': ['choice:EV_O_D5A_PHONE_CONTENTS', 'delayed_rule:R_SUSPICION_SWEEP'], 'player>mai': ['choice:EV_O_D5A_PHONE_CONTENTS'], 'player>destroyed': ['choice:EV_O_D5A_PHONE_CONTENTS'],
    'dorm_ceiling>thach': ['npc_action:thach', 'delayed_rule:R_THACH_RAID_CEILING', 'delayed_rule:R_THACH_RECOVERS_PHONE_QUIET'],
    'dorm_ceiling>vu_locker': ['npc_action:vu', 'delayed_rule:R_VU_CEILING_CHECK'],
  };
  const seen = new Set();
  for (const r of RUNS) {
    let cur = 'mai_drawer';
    for (const m of r.st.mutationLog) {
      if (m.consequence.type !== 'flag' || m.consequence.flag !== 'phone.location') continue;
      if (m.consequence.value === cur) continue; // re-assertion of the current holder (observation of EV_C_D5A_PHONE_CONTENTS) is not a move
      const key = `${cur}>${m.consequence.value}`;
      const actor = m.cause.kind === 'npc_action' ? `npc_action:${m.cause.actor}` : m.cause.kind === 'delayed_rule' ? `delayed_rule:${m.cause.ruleId}` : m.cause.kind === 'propagation' ? `propagation:${m.cause.ruleId}` : m.cause.kind === 'background' ? `background:${m.cause.backgroundId}` : `${m.cause.kind}:${m.cause.eventId}`;
      assert.ok(ALLOWED[key]?.includes(actor), `${r.id} seg ${m.at}: transition ${key} by ${actor} not authorised`);
      if (m.cause.kind === 'npc_action') { // the actor must have been able to know / touch the source location
        const a = CONTENT.intents.actions.find((x) => x.id === m.cause.actionId);
        assert.ok(a.touches?.flags?.includes('phone.location') || a.reads.flags?.includes('phone.location'), `${a.id} moved the phone without reading or touching it`);
      }
      seen.add(key); cur = m.consequence.value;
    }
  }
  // adversarial: an action by Linh that takes the phone from the ceiling must be rejected statically (she cannot know it is there)
  const inj = { id: 'A_LINH_STEAL', actor: 'linh', drive: 'D_LINH_EARN_RELEASE', reads: { flags: ['phone.location'] }, when: { op: 'flag', flag: 'phone.location', equals: 'dorm_ceiling' }, earliest: 8, once: true, priority: 1, effects: [{ type: 'flag', flag: 'phone.location', value: 'linh' }] };
  assert.deepEqual(visibilityViolations(CONTENT, inj.when, 'linh'), ['flag phone.location==dorm_ceiling']);
  test.diagnostic?.(`phone transitions exercised by corpus: ${[...seen].join(', ')}`);
  assert.ok(seen.size >= 9, `corpus exercises only ${seen.size} transitions`);
});

test('T09 — NPC intention never contradicts its beliefs (scapegoat needs a reason; shield needs a reason; hand-up needs no shield)', () => {
  for (const r of INTENT_RUNS) {
    for (const m of r.st.mutationLog) {
      if (m.cause.kind !== 'npc_action') continue;
      const th = r.st.npcs.thach.knowledge, vu = r.st.npcs.vu.knowledge;
      if (m.consequence.type === 'flag' && m.consequence.flag === 'duc.scapegoated') {
        const reason = (th.beliefs.F_PHONE_TAKEN_BY_DUC && th.beliefs.F_PHONE_TAKEN_BY_DUC.acquiredAt <= m.at && th.beliefs.F_PHONE_TAKEN_BY_DUC.cause.seq !== m.seq) || (th.tags.T_C_COVERED_DUC_SEARCH && th.tags.T_C_COVERED_DUC_SEARCH.at <= m.at);
        assert.ok(reason, `${r.id} seg ${m.at}: Thạch scapegoated Đức without a reason he could hold`);
      }
      if (m.cause.actionId === 'A_VU_SHIELD_PHONE') {
        const reason = (r.role === 'captive' && r.segs[m.at].trust.vu >= 2) || vu.tags.T_O_TOLD_VU_HIDE?.at <= m.at || (vu.beliefs.F_DUC_WANTS_TO_CALL_MOTHER && RANK[vu.beliefs.F_DUC_WANTS_TO_CALL_MOTHER.status] >= 3);
        assert.ok(reason, `${r.id}: Vũ shielded the phone with no reason`);
      }
      if (m.cause.actionId === 'A_VU_HAND_UP') assert.ok(!r.st.firedActions.includes('A_VU_SHIELD_PHONE'), `${r.id}: Vũ handed up after deciding to shield`);
    }
  }
  // static: no action requires a belief and then grants its negation to itself
  for (const a of CONTENT.intents.actions) {
    const needs = new Set(); walkCond(a.when, (c) => { if (c.op === 'npcBelieves' && c.npc === a.actor) needs.add(c.factId + ':' + (c.believedValue ?? true)); });
    walkCons(a.effects, (c) => { if (c.type === 'belief' && c.agent === a.actor) assert.ok(!needs.has(c.factId + ':' + !c.believedValue), `${a.id}: believes X then asserts ¬X`); });
  }
});

test('T10 — no unauthorised scope expansion (counts, dependencies, no UI, no G8, no randomness)', () => {
  assert.equal(CONTENT.npcs.length, 5); assert.equal(CONTENT.endings.length, 4); assert.equal(CONTENT.events.length, 49);
  assert.equal(CONTENT.events.reduce((n, e) => n + e.choices.length, 0), 131);
  assert.ok(CONTENT.flags.length <= 40 && CONTENT.flags.length === 25, `flags ${CONTENT.flags.length}`);
  const liveRules = CONTENT.delayedRules.length - supersededIds(CONTENT).size + CONTENT.intents.actions.length + 1; // +1 PR superseded counted separately below
  assert.ok(CONTENT.delayedRules.filter((r) => !supersededIds(CONTENT).has(r.id)).length + CONTENT.intents.actions.length <= 21, `live rules+actions ${liveRules} > 21 (docs/04 P6)`);
  for (const a of CONTENT.intents.actions) walkCons(a.effects, (c) => { if (c.type === 'schedule') assert.ok(CONTENT.events.some((e) => e.id === c.eventId && e.trigger === 'scheduled'), `${a.id} schedules a non-scheduled or new event`); });
  for (const e of CONTENT.events) assert.ok(['forced', 'optional', 'scheduled'].includes(e.trigger), 'G8 (free NPC-directed actions) must not be implemented');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(!pkg.dependencies && !pkg.devDependencies, 'zero dependencies');
  assert.ok(!existsSync(new URL('../node_modules', import.meta.url)), 'nothing installed');
  assert.deepEqual(readdirSync(new URL('../src/engine', import.meta.url)).sort(), ['content.mjs', 'core.mjs', 'evaluator.mjs', 'hash.mjs', 'projection.mjs', 'session.mjs', 'types.ts'], 'engine dir holds exactly the MVP modules');
  assert.ok(!existsSync(new URL('../content/locations.json', import.meta.url)), 'no location system (G8 deferred, P4)');
});

// =====================================================================================================
for (const sc of SCENARIOS) {
  test(`SCENARIO ${sc.id} (${sc.role}) — ${sc.title}`, () => {
    const r = RUNS.find((x) => x.id === sc.id);
    const m = checkExpect(r, sc.expect);
    assert.deepEqual(m, [], `docs claim: ${sc.docsClaim ?? '—'}\n${sc.knownGap ? 'KNOWN GAP: ' + sc.knownGap + '\n' : ''}mismatches:\n${m.join('\n')}`);
    if (sc.baselineExpect) { const b = RUNS.find((x) => x.id === sc.id + '/baseline'); const mb = checkExpect(b, sc.baselineExpect); assert.deepEqual(mb, [], `baseline (Phase 2 rules) mismatches:\n${mb.join('\n')}`); }
  });
}

test('GATE F (dynamic) — every ending is reached by at least one run per role; witness-path self-sufficiency report', () => {
  const reached = {};
  for (const r of RUNS) if (r.st.ending) (reached[r.st.ending] ??= new Set()).add(r.role);
  for (const en of CONTENT.endings) for (const role of ['captive', 'operator']) assert.ok(reached[en.id]?.has(role), `${en.id} never reached by ${role} in corpus`);
  const wp = RUNS.filter((r) => r.wantEnding).map((r) => `${r.id}: ${r.st.ending === r.wantEnding ? 'OK' : 'reached ' + r.st.ending}`);
  // audit F-19 fixed: every witness path is self-sufficient — with each event's defaultChoice as fill-in it reaches its ending.
  assert.deepEqual(wp.filter((x) => !x.endsWith('OK')), [], wp.join('\n'));
});

test('CF-6 sensitivity — convergence priority decides the race: Vũ checking before Thạch raids changes who holds the phone', () => {
  const sc = SCENARIOS.find((s) => s.id === 'S1_PASSIVE');
  const alt = loadContent({ mutate: (b) => { const a = b.intents.actions.find((x) => x.id === 'A_VU_ROUTINE_CEILING_CHECK'); a.priority = 5; a.earliest = 11; return b; } });
  const base = trace(CONTENT, 'captive', sc.policy), mod = trace(alt, 'captive', sc.policy);
  assert.equal(base.segs[11].phone, 'thach'); assert.equal(mod.segs[11].phone, 'vu_locker');
  assert.ok(mod.st.firedActions.includes('A_THACH_RAID_WHERE_I_BELIEVE'), 'Thạch still decides to raid…'); assert.equal(mod.segs[12].phone, 'vu_locker', '…but finds nothing');
});

test('CF-7 sensitivity — Linh→Thạch delay 0 does not change the outcome with current windows, but changes when Thạch knows', () => {
  const sc = SCENARIOS.find((s) => s.id === 'S1_PASSIVE');
  const alt = loadContent({ mutate: (b) => { b.propagation.find((p) => p.id === 'PR_LINH_RELAY_LOCATION').delay = 0; return b; } });
  const base = trace(CONTENT, 'captive', sc.policy), mod = trace(alt, 'captive', sc.policy);
  const firstGrant = (t) => t.st.mutationLog.find((m) => m.consequence.type === 'belief' && m.consequence.agent === 'thach' && m.consequence.factId === 'F_PHONE_HIDDEN_DORM_CEILING');
  assert.equal(firstGrant(base).at, 11); assert.equal(firstGrant(base).cause.ruleId, 'PR_LINH_RELAY_LOCATION');
  assert.equal(firstGrant(mod).at, 10, 'with delay 0 Linh relays in the same convergence pass as Đức confides (file order 6a)');
  assert.equal(base.segs[11].phone, mod.segs[11].phone);
  const alt2 = loadContent({ mutate: (b) => { b.propagation.find((p) => p.id === 'PR_LINH_RELAY_LOCATION').delay = 0; b.intents.actions.find((x) => x.id === 'A_THACH_RAID_WHERE_I_BELIEVE').earliest = 10; return b; } });
  assert.equal(trace(alt2, 'captive', sc.policy).segs[10].phone, 'thach', 'with an earlier window the delay matters');
});

test('CF-8 sensitivity — swapping 6a/6b (rules before propagation) kills the Day-4 interrogation (protects audit O1)', () => {
  const sc = SCENARIOS.find((s) => s.id === 'S1_PASSIVE');
  const alt = loadContent(); alt.engineOptions = { rulesBeforePropagation: true };
  const base = trace(CONTENT, 'captive', sc.policy), mod = trace(alt, 'captive', sc.policy);
  assert.ok(base.st.firedRules.includes('R_INTERROGATION_D4')); assert.ok(!mod.st.firedRules.includes('R_INTERROGATION_D4'));
});

test('ZP — zero-player runs complete for both roles under both default policies and the NPC chain runs on its own', () => {
  for (const r of RUNS.filter((x) => x.id.startsWith('ZP_'))) {
    assert.ok(r.st.ending, `${r.id}: no ending`);
    assert.ok(r.st.firedRules.includes('R_TRANSFER_PREP') || r.st.firedRules.includes('R_EXPOSURE_RAID'), `${r.id}: no day-7 rule`);
    if (r.role === 'captive') assert.ok(r.st.firedPropagations.includes('PR_LINH_TIP_CAPTIVE'), `${r.id}: Linh never tips`);
    assert.ok(r.st.firedActions.includes('A_THACH_RAID_WHERE_I_BELIEVE') || r.st.firedActions.includes('A_VU_ROUTINE_CEILING_CHECK'), `${r.id}: nobody looks for the phone`);
  }
});

test('T-C trust-gate reachability (audit F-01) — Captive CAN reach trust.vu ≥ 2 before segment 14 with MVP content', () => {
  // Upper bound: initial + best positive trust.vu delta per captive-playable event before seg 14 (excluding VU_TALK itself)
  // + every positive delta in live rules/actions opening before 14. Loose (ignores exclusivity), so a bound of 1 is conservative proof.
  const forCaptive = (ch) => { let ok = true; walkCond(ch.available, (c) => { if (c.op === 'role' && c.is !== 'captive') ok = false; }); return ok; };
  let max = CONTENT.npcs.find((n) => n.id === 'vu').initialTrust.captive;
  const parts = [];
  for (const e of CONTENT.events) {
    if (!e.roles.includes('captive') || e.id === 'EV_C_D5N_VU_TALK') continue;
    const s = e.at ? seg(e.at) : e.window ? seg(e.window.from) : Math.min(...[...CONTENT.delayedRules, ...CONTENT.intents.actions].flatMap((r) => r.effects).filter((c) => c.type === 'schedule' && c.eventId === e.id).map((c) => c.at), 99);
    if (s >= 14) continue;
    let best = 0;
    for (const ch of e.choices.filter(forCaptive)) { let d = 0; walkCons(ch.consequences, (c) => { if (c.type === 'trust' && c.npc === 'vu' && c.delta > 0) d += c.delta; }); best = Math.max(best, d); }
    if (best) { max += best; parts.push(`${e.id}+${best}`); }
  }
  const dead = supersededIds(CONTENT);
  for (const r of [...CONTENT.delayedRules.filter((r) => !dead.has(r.id)), ...CONTENT.intents.actions]) if (r.earliest < 14) walkCons(r.effects, (c) => { if (c.type === 'trust' && c.npc === 'vu' && c.delta > 0) { max += c.delta; parts.push(`${r.id}+${c.delta}`); } });
  assert.ok(max >= 2, `upper bound on trust.vu at seg 14 for Captive is ${max} (${parts.join(', ')}); docs/04 §3.4 row 3 needs ≥ 2 (audit F-01)`);
  // and the bound is realised by an actual run (S3): trust.vu == 2 at segment 13
  const s3 = RUNS.find((r) => r.id === 'S3_VU_TRUST'); assert.equal(s3.segs[13].trust.vu, 2);
});
