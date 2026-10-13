// THE COMPOUND — INTERACTIVE SESSION. Wraps the engine for UIs (CLI, browser): the game is driven by a list of
// decisions; every call rebuilds the committed state by deterministic replay and asks the engine what it needs next.
// Consequences of this design (all tested in tests/session.test.mjs):
//   • a save is just (role, decisions) + hashes — loading is replay, so save/load and replay are the same guarantee;
//   • the UI can never corrupt the state: it only appends decisions the engine itself offered;
//   • "advance time" is implicit — segments with nothing to decide run through on their own, NPCs included.
import { replay, activeObservations, availableChoices, apply, serialize, deserialize, stateHash, TOTAL_SEGMENTS } from './core.mjs';
import { playerView, epilogue, LOCATION_LABEL, timeLabel } from './projection.mjs';

const vi = (t) => (t && typeof t === 'object' ? t.vi : t) ?? '';

export class Session {
  constructor(content, role, decisions = []) {
    this.content = content;
    this.role = role;
    this.decisions = [...decisions];
    this._refresh();
  }

  static fromSave(content, save) {
    const st = deserialize(content, save); // throws on any mismatch
    return new Session(content, st.player.role, save.decisions);
  }

  _refresh() { this._commit(this.decisions); }

  /** Replay a candidate decision list; only on success does it become the session's decisions/state/request. */
  _commit(decisions) {
    const r = replay(this.content, this.role, decisions, TOTAL_SEGMENTS); // throws on any engine invariant → nothing below runs
    this.decisions = decisions;
    this.state = r.st;
    this.request = r.complete ? null : r.request;
  }

  get ended() { return !!this.state.ending; }
  get hash() { return stateHash(this.state); }

  /** What the engine needs now. */
  prompt() {
    const st = this.state, C = this.content;
    if (st.ending) return { kind: 'ended', ending: st.ending, time: timeLabel(st.segment) };
    if (!this.request) return { kind: 'ended', ending: null, time: timeLabel(st.segment) }; // 21 segments elapsed without an ending (cannot happen: E_TRANSFER is `always`)
    if (this.request.kind === 'optional') {
      return { kind: 'optional', time: timeLabel(st.segment), segment: st.segment, options: this.request.options.map((id) => { const e = C.events.find((x) => x.id === id); return { id, summary: vi(e.summary), location: LOCATION_LABEL[e.location] ?? e.location }; }) };
    }
    // choice: preview the event exactly as the engine will fire it (observations first, then availability)
    const e = C.events.find((x) => x.id === this.request.eventId);
    const preview = structuredClone(st);
    const seen = activeObservations(C, preview, e);
    const observations = seen.map((o) => ({ text: vi(o.text), uncertain: o.grants.some((g) => g.type === 'belief' && g.agent === 'player' && g.uncertainAboveStress !== undefined && preview.player.stress >= g.uncertainAboveStress) }));
    for (const o of seen) for (const g of o.grants) apply(C, preview, g, { kind: 'observation', eventId: e.id, at: preview.segment });
    const choices = availableChoices(C, preview, e).map((c) => ({ id: c.id, label: vi(c.label) }));
    return { kind: 'choice', time: timeLabel(st.segment), segment: st.segment, eventId: e.id, trigger: e.trigger, summary: vi(e.summary), location: LOCATION_LABEL[e.location] ?? e.location, observations, choices };
  }

  /** Answer a 'choice' prompt. */
  choose(choiceId) {
    const p = this.prompt();
    if (p.kind !== 'choice') throw new Error(`choose: no choice pending (prompt is ${p.kind})`);
    if (!p.choices.some((c) => c.id === choiceId)) throw new Error(`choose: '${choiceId}' is not offered (${p.choices.map((c) => c.id).join(', ')})`);
    this._commit([...this.decisions, { k: 'c', e: p.eventId, c: choiceId }]); // a decision the engine rejects is never kept
    return this.prompt();
  }

  /** Answer an 'optional' prompt: an event id, or null to let the segment pass. */
  pick(eventId) {
    const p = this.prompt();
    if (p.kind !== 'optional') throw new Error(`pick: no optional pending (prompt is ${p.kind})`);
    if (eventId !== null && !p.options.some((o) => o.id === eventId)) throw new Error(`pick: '${eventId}' is not offered`);
    this._commit([...this.decisions, { k: 'o', e: eventId }]);
    return this.prompt();
  }

  /** Everything the UI renders: the player projection + the pending prompt (+ epilogue when ended). */
  view() {
    return { ...playerView(this.content, this.state), prompt: this.prompt(), epilogue: epilogue(this.content, this.state) };
  }

  save(extra = {}) { return serialize(this.content, this.state, extra); }
}

/** Drive a session with a policy until it ends (used by tests and the CLI's "watch the world" mode). */
export function autoplay(session, policy, maxSteps = 500) {
  for (let i = 0; i < maxSteps; i++) {
    const p = session.prompt();
    if (p.kind === 'ended') return p;
    if (p.kind === 'optional') { const e = policy.pickOptional(p.options.map((o) => session.content.events.find((x) => x.id === o.id)), session.state); session.pick(e ? e.id : null); }
    else { const e = session.content.events.find((x) => x.id === p.eventId); session.choose(policy.choose(e, p.choices.map((c) => e.choices.find((x) => x.id === c.id)), session.state)); }
  }
  throw new Error('autoplay: did not finish');
}
