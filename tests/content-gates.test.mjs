// THE COMPOUND — MVP static content gates (audit §12 test specifications T-B, T-D, T-F, T-G, T-I2, T-M, T-O1, T-O2 +
// defaultChoice/order/epilogue/propagation declarations). These are regression guards for the audit findings fixed on
// 2026-10-13: a future content edit that re-creates F-02, F-05, F-06, F-09, F-12, F-13, F-14 or F-17 fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadContent, supersededIds, seg, NPC_IDS } from '../src/engine/evaluator.mjs';
import { walkCond, walkCons } from './static-checks.mjs';

const C = loadContent();
const ROLES = ['captive', 'operator'];
const FLAGS = Object.fromEntries(C.flags.map((f) => [f.id, f]));
const EVENTS = Object.fromEntries(C.events.map((e) => [e.id, e]));
const dead = supersededIds(C);
const slotOf = (e) => (e.at ? seg(e.at) : e.window ? seg(e.window.from) : null);
const rank = { forced: 0, scheduled: 1, optional: 2 };
const rolesOfChoice = (ch, e) => { const a = ch.available; if (a?.op === 'role') return [a.is]; if (a?.op === 'and') { const r = a.args.find((x) => x.op === 'role'); if (r) return [r.is]; } return e.roles; };

test('T-O1 — initial player stats are declared in content for both roles (audit F-09)', () => {
  for (const r of ROLES) { const p = C.playerInitial?.[r]; assert.ok(p, `playerInitial.${r} missing`); for (const k of ['stress', 'suspicion']) assert.ok(Number.isInteger(p[k]) && p[k] >= 0 && p[k] <= 100, `${r}.${k}`); }
});

test('T-O2 — propagation rules carry an explicit priority; actions/rules have integer priorities (audit O13)', () => {
  for (const p of C.propagation) assert.ok(Number.isInteger(p.priority), `${p.id}: no priority`);
  for (const r of [...C.delayedRules, ...C.intents.actions]) assert.ok(Number.isInteger(r.priority), `${r.id}: no priority`);
});

test('DEFAULTS — every event with choices declares a defaultChoice that is valid for each role it serves (audit F-12)', () => {
  for (const e of C.events) {
    if (!e.choices.length) { assert.equal(e.defaultChoice, undefined, `${e.id}: default on a choice-less event`); continue; }
    assert.ok(e.defaultChoice !== undefined, `${e.id}: no defaultChoice`);
    for (const role of e.roles) {
      const d = typeof e.defaultChoice === 'string' ? e.defaultChoice : e.defaultChoice[role];
      assert.ok(d, `${e.id}: no default for ${role}`);
      const ch = e.choices.find((c) => c.id === d);
      assert.ok(ch, `${e.id}: default ${d} is not a choice`);
      assert.ok(rolesOfChoice(ch, e).includes(role), `${e.id}: default ${d} not available to ${role}`);
    }
  }
});

test('T-B — every STRESS/SUSPICION gate on an event is within the statically reachable range for its role (audit F-02/F-23)', () => {
  // Upper bound per segment: start + background + best positive delta among forced events + best among optional events (one each) + convergence rules.
  const bound = {};
  for (const role of ROLES) {
    const max = { stress: C.playerInitial[role].stress, suspicion: C.playerInitial[role].suspicion };
    bound[role] = [];
    for (let s = 0; s <= 20; s++) {
      bound[role][s] = { ...max }; // bound at the START of segment s (what an observation/choice can see)
      const add = (c, acc) => { if (c.type === 'stat' && c.delta > 0) acc[c.stat] = (acc[c.stat] || 0) + c.delta; if (c.type === 'setStat') acc[c.stat] = Math.max(acc[c.stat] || 0, c.value); };
      const bg = {}; for (const b of C.background.filter((b) => seg(b.at) === s)) walkCons([...b.effects, ...(b.playerEffects?.[role] || [])], (c) => add(c, bg));
      const best = { forced: {}, optional: {}, scheduled: {} };
      for (const e of C.events) {
        if (!e.roles.includes(role)) continue;
        const here = e.at ? seg(e.at) === s : e.window ? s >= seg(e.window.from) && s <= seg(e.window.to) && (!e.window.segments || e.window.segments.includes(['morning', 'afternoon', 'night'][s % 3])) : true;
        if (!here) continue;
        const ev = {}; for (const o of e.observations) if (o.roles.includes(role)) walkCons(o.grants, (c) => add(c, ev));
        let bestCh = {}; for (const ch of e.choices) { if (!rolesOfChoice(ch, e).includes(role)) continue; const d = {}; walkCons(ch.consequences, (c) => add(c, d)); if ((d.stress || 0) + (d.suspicion || 0) > (bestCh.stress || 0) + (bestCh.suspicion || 0)) bestCh = d; }
        for (const k of ['stress', 'suspicion']) best[e.trigger][k] = Math.max(best[e.trigger][k] || 0, (ev[k] || 0) + (bestCh[k] || 0));
      }
      const conv = {}; for (const r of [...C.delayedRules.filter((r) => !dead.has(r.id)), ...C.intents.actions]) if (s >= r.earliest && s <= (r.latest ?? 20)) walkCons(r.effects, (c) => add(c, conv));
      for (const p of C.propagation) if (!dead.has(p.id) && (p.at === undefined || p.at === s)) walkCons(p.also, (c) => add(c, conv));
      for (const k of ['stress', 'suspicion']) max[k] = Math.min(100, max[k] + (bg[k] || 0) + (best.forced[k] || 0) + (best.scheduled[k] || 0) + (best.optional[k] || 0) + (conv[k] || 0));
    }
  }
  const violations = [];
  const check = (cond, e, role, where) => walkCond(cond, (c) => { if (c.op === 'stat' && (c.cmp === '>=' || c.cmp === '>')) { const s = slotOf(e); if (s === null) return; const b = bound[role][s][c.stat]; if (b < c.value) violations.push(`${e.id}/${where} (${role}): needs ${c.stat} ${c.cmp} ${c.value} at seg ${s}, static max ${b}`); } });
  for (const e of C.events) for (const role of e.roles) {
    check(e.preconditions, e, role, 'preconditions');
    for (const o of e.observations) if (o.roles.includes(role)) { check(o.when, e, role, 'observation'); walkCons(o.grants, () => {}, (c) => check(c, e, role, 'observation-grant')); walkCons(o.grants, (g) => { if (g.uncertainAboveStress !== undefined && g.uncertainAboveStress > 0) { const s = slotOf(e); if (s !== null && bound[role][s].stress < g.uncertainAboveStress) violations.push(`${e.id} (${role}): uncertainAboveStress ${g.uncertainAboveStress} unreachable at seg ${s} (max ${bound[role][s].stress})`); } }); }
    for (const ch of e.choices) if (rolesOfChoice(ch, e).includes(role)) { check(ch.available, e, role, ch.id); walkCons(ch.consequences, () => {}, (c) => check(c, e, role, ch.id)); }
  }
  assert.deepEqual(violations, [], violations.join('\n'));
  assert.ok(bound.captive[7].stress >= 45, `captive stress bound at seg 7 is ${bound.captive[7].stress}; the slice misperception needs 45 (F-02)`);
});

test('T-D — a choice/precondition that reads a flag or tag has a producer that runs before it (audit F-05, order across forced/scheduled/optional)', () => {
  // producers: key -> [{at, key: [order, rank, id]}] where `at` is the first segment the value is readable
  const producers = new Map();
  const put = (k, at, sortKey) => (producers.get(k) ?? producers.set(k, []).get(k)).push({ at, sortKey });
  const keysOf = (cons, fn) => walkCons(cons, (c) => { if (c.type === 'flag' || c.type === 'flagAdd') fn('flag:' + c.flag); if (c.type === 'tag' || c.type === 'witnessTag') fn('tag:' + c.tag); });
  for (const b of C.background) keysOf([...b.effects, ...Object.values(b.playerEffects || {}).flat()], (k) => put(k, seg(b.at), [-Infinity]));
  const schedAt = (id) => { const ats = []; const scan = (cons) => walkCons(cons, (c) => { if (c.type === 'schedule' && c.eventId === id) ats.push(c.at); }); for (const e of C.events) { e.observations.forEach((o) => scan(o.grants)); e.choices.forEach((ch) => scan(ch.consequences)); } for (const r of [...C.delayedRules, ...C.intents.actions]) scan(r.effects); return ats.length ? Math.min(...ats) : null; };
  const eventKey = (e) => [e.order ?? 0, rank[e.trigger], e.id];
  const eventAt = (e) => (e.trigger === 'scheduled' ? schedAt(e.id) : slotOf(e));
  for (const e of C.events) { const at = eventAt(e); if (at === null) continue; e.observations.forEach((o) => keysOf(o.grants, (k) => put(k, at, eventKey(e)))); e.choices.forEach((ch) => keysOf(ch.consequences, (k) => put(k, at, eventKey(e)))); }
  for (const r of [...C.delayedRules.filter((r) => !dead.has(r.id)), ...C.intents.actions]) keysOf(r.effects, (k) => put(k, r.earliest + 1, [-Infinity]));
  for (const p of C.propagation) if (!dead.has(p.id)) keysOf(p.also || [], (k) => put(k, (p.at ?? 0) + 1, [-Infinity]));
  const before = (a, b) => { for (let i = 0; i < 3; i++) { if (a[i] === undefined || b[i] === undefined) return a[0] === -Infinity; if (a[i] < b[i]) return true; if (a[i] > b[i]) return false; } return false; };
  const violations = [];
  for (const e of C.events) {
    const at = eventAt(e); if (at === null) continue;
    const own = new Set(); e.observations.forEach((o) => keysOf(o.grants, (k) => own.add(k)));
    const reads = []; walkCond(e.preconditions, (c) => { if (c.op === 'flag' || c.op === 'flagCmp') reads.push(['flag:' + c.flag, 'preconditions']); if (c.op === 'tag') reads.push(['tag:' + c.tag, 'preconditions']); });
    for (const ch of e.choices) walkCond(ch.available, (c) => { if (c.op === 'flag' || c.op === 'flagCmp') reads.push(['flag:' + c.flag, ch.id]); if (c.op === 'tag') reads.push(['tag:' + c.tag, ch.id]); });
    for (const [k, where] of reads) {
      if (own.has(k)) continue;
      const ps = producers.get(k) || [];
      const ok = ps.some((p) => p.at < at || (p.at === at && before(p.sortKey, eventKey(e))));
      if (!ok) {
        const flag = k.startsWith('flag:') && FLAGS[k.slice(5)];
        if (flag && where !== 'preconditions') { // reading the INITIAL value is a legitimate read (e.g. `== false`)
          const initialReads = []; walkCond(e.choices.find((c) => c.id === where).available, (c) => { if ((c.op === 'flag' && c.flag === flag.id && c.equals === flag.initial)) initialReads.push(c); });
          if (initialReads.length) continue;
        }
        if (flag && where === 'preconditions') { const init = []; walkCond(e.preconditions, (c) => { if (c.op === 'flag' && c.flag === flag.id && c.equals === flag.initial) init.push(c); }); if (init.length) continue; }
        violations.push(`${e.id}/${where} reads ${k} at seg ${at} but no producer runs before it (producers: ${ps.map((p) => p.at).join(',') || 'none'})`);
      }
    }
  }
  assert.deepEqual(violations, [], violations.join('\n'));
});

test('T-F — no silent absorbing state: every declared flag value is read somewhere or marked terminal (audit F-06)', () => {
  const read = new Set();
  const collect = (cond) => walkCond(cond, (c) => { if (c.op === 'flag') read.add(c.flag + '=' + c.equals); });
  for (const e of C.events) { collect(e.preconditions); e.observations.forEach((o) => { collect(o.when); walkCons(o.grants, () => {}, collect); }); e.choices.forEach((ch) => { collect(ch.available); walkCons(ch.consequences, () => {}, collect); }); }
  for (const r of [...C.delayedRules.filter((r) => !dead.has(r.id)), ...C.intents.actions]) { collect(r.when); walkCons(r.effects, () => {}, collect); }
  for (const p of C.propagation) if (!dead.has(p.id)) collect(p.when);
  for (const en of C.endings) collect(en.condition);
  for (const v of Object.values(C.epilogues.endings)) [...(v.variants || []), ...(v.extras || [])].forEach((x) => collect(x.when));
  for (const cards of Object.values(C.epilogues.npcs)) cards.forEach((x) => collect(x.when));
  for (const f of C.flags) for (const v of f.values || []) {
    const isInitial = v === f.initial;
    assert.ok(read.has(f.id + '=' + v) || (f.terminal || []).includes(v) || isInitial, `${f.id}=${v}: written but never read and not terminal`);
  }
});

test('T-G — within one convergence pass, a rule/action that reads a flag runs after every rule/action that writes it, unless the pair is declared in allowReadBeforeWrite AND provably value-disjoint (audit F-14, §12 T-G)', () => {
  const live = [...C.delayedRules.filter((r) => !dead.has(r.id)).map((r) => ({ ...r, kind: 'rule' })), ...C.intents.actions.map((a) => ({ ...a, kind: 'action' }))];
  const writes = (r) => { const s = new Set(); walkCons(r.effects, (c) => { if (c.type === 'flag' || c.type === 'flagAdd') s.add(c.flag); }); return s; };
  const reads = (r) => { const s = new Set(); walkCond(r.when, (c) => { if (c.op === 'flag' || c.op === 'flagCmp') s.add(c.flag); }); return s; };
  // values a writer can store in `flag` (null = unbounded, e.g. flagAdd) and values a reader tests `flag` against (null = unbounded, e.g. flagCmp)
  const written = (w, flag) => { const v = new Set(); let any = false; walkCons(w.effects, (c) => { if (c.type === 'flag' && c.flag === flag) v.add(c.value); if (c.type === 'flagAdd' && c.flag === flag) any = true; }); return any ? null : v; };
  const tested = (r, flag) => { const v = new Set(); let any = false; walkCond(r.when, (c) => { if (c.op === 'flag' && c.flag === flag) v.add(c.equals); if (c.op === 'flagCmp' && c.flag === flag) any = true; }); return any ? null : v; };
  const declared = C.intents.allowReadBeforeWrite ?? [];
  const used = new Set();
  const violations = [];
  for (const w of live) for (const r of live) {
    if (w.id === r.id) continue;
    const overlap = w.earliest <= (r.latest ?? 20) && r.earliest <= (w.latest ?? 20);
    if (!overlap) continue;
    const shared = [...writes(w)].filter((f) => reads(r).has(f));
    if (!shared.length) continue;
    // actions run before rules (6a' before 6b): an action writer always precedes a rule reader; a rule writer never precedes an action reader
    const order = (x) => (x.kind === 'action' ? 0 : 1);
    const ok = order(w) < order(r) || (order(w) === order(r) && w.priority < r.priority);
    if (ok) continue;
    for (const f of shared) {
      const d = declared.findIndex((x) => x.reader === r.id && x.writer === w.id && x.flag === f);
      if (d < 0) { violations.push(`${r.id} (prio ${r.priority}) reads ${f} written by ${w.id} (prio ${w.priority}) in the same pass`); continue; }
      used.add(d);
      const wv = written(w, f), rv = tested(r, f);
      if (wv === null || rv === null || [...wv].some((v) => rv.has(v))) violations.push(`allowReadBeforeWrite[${d}] (${r.id} ← ${w.id}, ${f}) is NOT value-disjoint: writer stores {${wv ? [...wv].join(',') : '*'}}, reader tests {${rv ? [...rv].join(',') : '*'}}`);
    }
  }
  assert.deepEqual(violations, [], violations.join('\n'));
  declared.forEach((x, i) => {
    assert.ok(typeof x.why === 'string' && x.why.length > 20, `allowReadBeforeWrite[${i}]: no reason given`);
    assert.ok(used.has(i), `allowReadBeforeWrite[${i}] (${x.reader} ← ${x.writer}, ${x.flag}) names a pair that is not in conflict — stale declaration`);
  });
});

test('T-M — no event observation reads a flag or tag that one of its own choices writes (audit F-13)', () => {
  for (const e of C.events) {
    const written = new Set(); e.choices.forEach((ch) => walkCons(ch.consequences, (c) => { if (c.type === 'flag' || c.type === 'flagAdd') written.add('flag:' + c.flag); if (c.type === 'tag' || c.type === 'witnessTag') written.add('tag:' + c.tag); }));
    for (const o of e.observations) walkCond(o.when, (c) => { if (c.op === 'flag' || c.op === 'flagCmp') assert.ok(!written.has('flag:' + c.flag), `${e.id}: observation reads ${c.flag} that a choice of the same event writes`); if (c.op === 'tag') assert.ok(!written.has('tag:' + c.tag), `${e.id}: observation reads ${c.tag} written by its own choice`); });
  }
});

test('T-I2 — type conformance: misinformation only ever `true`; uncertainAboveStress only on player grants; once/repeatable booleans', () => {
  const grants = [];
  for (const e of C.events) { e.observations.forEach((o) => walkCons(o.grants, (c) => grants.push([e.id, c]))); e.choices.forEach((ch) => walkCons(ch.consequences, (c) => grants.push([e.id, c]))); }
  for (const b of C.background) walkCons(b.effects, (c) => grants.push([b.id, c]));
  for (const r of [...C.delayedRules, ...C.intents.actions]) walkCons(r.effects, (c) => grants.push([r.id, c]));
  for (const p of C.propagation) { assert.ok(p.misinformation === undefined || p.misinformation === true, `${p.id}: misinformation must be true or absent`); walkCons(p.also, (c) => grants.push([p.id, c])); }
  for (const [id, c] of grants) if (c.type === 'belief') {
    assert.ok(c.misinformation === undefined || c.misinformation === true, `${id}: misinformation:false is not a value`);
    if (c.uncertainAboveStress !== undefined) assert.equal(c.agent, 'player', `${id}: uncertainAboveStress on an NPC grant`);
    if (c.misinformation) assert.notEqual(c.believedValue, C.truth.facts[c.factId].value, `${id}: attested misinformation that is actually true`);
  }
  for (const r of C.delayedRules) assert.equal(typeof r.once, 'boolean');
  for (const a of C.intents.actions) assert.equal(typeof a.once, 'boolean');
  for (const e of C.events) if (e.repeatable !== undefined) assert.equal(typeof e.repeatable, 'boolean');
});

test('EPILOGUES — every condition references existing flags/tags/facts/npcs/events; every ending and NPC has a fallback card; no truth operator exists', () => {
  const tags = new Set(); for (const e of C.events) e.choices.forEach((ch) => walkCons(ch.consequences, (c) => { if (c.type === 'tag' || c.type === 'witnessTag') tags.add(c.tag); })); for (const e of C.events) e.observations.forEach((o) => walkCons(o.grants, (c) => { if (c.type === 'witnessTag' || c.type === 'tag') tags.add(c.tag); })); for (const r of [...C.delayedRules, ...C.intents.actions]) walkCons(r.effects, (c) => { if (c.type === 'tag' || c.type === 'witnessTag') tags.add(c.tag); });
  const checkCond = (cond, where) => walkCond(cond, (c) => {
    assert.ok(['always', 'and', 'or', 'not', 'role', 'segment', 'stat', 'trust', 'tag', 'flag', 'flagCmp', 'playerBelief', 'npcBelieves', 'npcKnowsTag', 'npcStatus', 'eventFired'].includes(c.op), `${where}: unknown op ${c.op}`);
    if (c.op === 'flag' || c.op === 'flagCmp') { assert.ok(FLAGS[c.flag], `${where}: unknown flag ${c.flag}`); if (c.op === 'flag' && FLAGS[c.flag].values) assert.ok(FLAGS[c.flag].values.includes(c.equals), `${where}: ${c.flag}=${c.equals} undeclared`); }
    if (c.op === 'tag') assert.ok(tags.has(c.tag), `${where}: unknown tag ${c.tag}`);
    if (c.op === 'npcKnowsTag') assert.ok(NPC_IDS.includes(c.npc), where);
    if (c.op === 'npcBelieves' || c.op === 'playerBelief') assert.ok(C.truth.facts[c.factId], `${where}: unknown fact ${c.factId}`);
    if (c.op === 'npcStatus' || c.op === 'trust' || c.op === 'npcBelieves' || c.op === 'npcKnowsTag') assert.ok(NPC_IDS.includes(c.npc), `${where}: unknown npc ${c.npc}`);
    if (c.op === 'eventFired') assert.ok(EVENTS[c.eventId], where);
  });
  for (const en of C.endings) {
    const ep = C.epilogues.endings[en.id]; assert.ok(ep, `${en.id}: no epilogue`);
    for (const role of ROLES) assert.ok(ep.variants.some((v) => (!v.roles || v.roles.includes(role)) && v.when.op === 'always'), `${en.id}: no fallback variant for ${role}`);
    [...ep.variants, ...(ep.extras || [])].forEach((v, i) => { checkCond(v.when, `${en.id}#${i}`); assert.ok(v.text?.vi?.length > 20, `${en.id}#${i}: text`); });
  }
  for (const n of NPC_IDS) { const cards = C.epilogues.npcs[n]; assert.ok(cards?.length >= 3, `${n}: cards`); assert.ok(cards.at(-1).when.op === 'always', `${n}: last card must be a fallback`); cards.forEach((v, i) => { checkCond(v.when, `${n}#${i}`); assert.ok(v.text?.vi?.length > 20); }); }
  // Gate G / D9 lexical scan extends to the MVP content files
  const banned = [/kịch bản/i, /mật khẩu/i, /chuyển khoản/i, /tài khoản ngân hàng/i, /OTP/, /campuchia/i, /cambodia/i, /myanmar/i, /sihanoukville/i, /kk park/i, /philippines/i, /thái lan/i, /interpol/i, /bộ công an/i];
  for (const f of ['content/epilogues.json', 'src/web/index.html', 'src/web/app.mjs', 'src/cli/play.mjs']) { const txt = readFileSync(new URL('../' + f, import.meta.url), 'utf8'); for (const re of banned) assert.ok(!re.test(txt), `${f}: ${re}`); }
});

test('VISIBILITY declarations — every flag an NPC reads is declared visible to it, including the MVP additions (Mai reads the tip flag)', () => {
  const tip = FLAGS['thach.hasCaptiveTip'];
  assert.deepEqual([...tip.visibleTo].sort(), ['mai', 'thach', 'vu']);
  assert.ok(FLAGS['phone.location'].terminal.includes('mai') && FLAGS['phone.location'].terminal.includes('linh'));
  assert.deepEqual(C.intents.visibilityExceptions, [], 'no visibility exceptions remain');
});
