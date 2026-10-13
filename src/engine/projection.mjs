// THE COMPOUND — PLAYER PROJECTION. Everything a UI may show is produced here, from GameState + content, and nothing
// else: no WorldTruth values, no NPC private knowledge, no hidden flags, no attestation of whether a belief is false (audit F-03).
// Stats are shown qualitatively (GDD D10): SUSPICION/STRESS as four bands, TRUST never.
import { evaluate, timeOf, NPC_IDS, RANK } from './core.mjs';

export const SEGMENT_LABEL = { morning: 'Sáng', afternoon: 'Chiều', night: 'Đêm' };
export const LOCATION_LABEL = { dorm: 'Ký túc', yard: 'Sân', canteen: 'Nhà ăn', floor: 'Sàn làm việc', admin: 'Phòng hành chính', mgmt_hall: 'Hành lang quản lý' };
export const ROLE_LABEL = { captive: 'Người bị giam (Captive)', operator: 'Nhân viên quản lý (Operator)' };
export const STATUS_LABEL = { present: 'có mặt', isolated: 'bị cách ly', demoted: 'bị "hạ xuống"', gone: 'không còn ở đây' };
export const BELIEF_LABEL = { RUMOR: 'Tin đồn', OBSERVED: 'Đã quan sát', CONFIRMED: 'Đã xác nhận' };
const BANDS = {
  suspicion: [[90, 'Đánh dấu'], [70, 'Theo dõi'], [40, 'Để ý'], [0, 'Vô hình']],
  stress: [[80, 'Gãy'], [60, 'Méo'], [40, 'Căng'], [0, 'Ổn']],
};
export function band(stat, value) {
  const b = BANDS[stat].find(([min]) => value >= min);
  return { label: b[1], level: 3 - BANDS[stat].indexOf(b) }; // 0..3
}
export const timeLabel = (s) => { const t = timeOf(s); return `Ngày ${t.day} · ${SEGMENT_LABEL[t.segment]}`; };
const vi = (t) => (t && typeof t === 'object' ? t.vi : t) ?? '';

export function npcName(content, id) { return vi(content.npcs.find((n) => n.id === id)?.name) || id; }

/** Player-visible belief list (PlayerVisibleBelief): fact statement + status + source, never the canonical value. */
export function visibleBeliefs(content, st) {
  return Object.values(st.player.knowledge.beliefs)
    .sort((a, b) => a.acquiredAt - b.acquiredAt || (a.factId < b.factId ? -1 : 1))
    .map((b) => ({
      factId: b.factId,
      statement: vi(content.truth.facts[b.factId].statement),
      status: b.status, statusLabel: BELIEF_LABEL[b.status], rank: RANK[b.status],
      believedValue: b.believedValue,
      uncertain: !!b.uncertain,
      source: b.source, sourceLabel: b.source === 'self' ? 'tự mình' : b.source === 'player' ? 'bạn' : npcName(content, b.source),
      acquiredAt: b.acquiredAt, when: timeLabel(b.acquiredAt),
    }));
}

/** NPC presence as the player can perceive it (status is physically observable; trust and knowledge are not). */
export function visibleNpcs(content, st) {
  return NPC_IDS.map((id) => ({ id, name: npcName(content, id), status: st.npcs[id].status, statusLabel: STATUS_LABEL[st.npcs[id].status] }));
}

/** Journal ("Sổ ghi nhớ"): what the player lived through, rebuilt from the action log — summaries, observations, choices. */
export function journal(content, st) {
  const out = [];
  for (const a of st.actionLog) {
    if (a.kind === 'scheduled-skipped') continue;
    if (a.eventId === null) continue; // skipped optional: nothing happened
    const e = content.events.find((x) => x.id === a.eventId);
    const ch = a.choiceId ? e.choices.find((c) => c.id === a.choiceId) : null;
    out.push({
      segment: a.segment, time: timeLabel(a.segment), eventId: e.id, location: LOCATION_LABEL[e.location] ?? e.location,
      summary: vi(e.summary),
      observations: (a.obs ?? []).map((i) => vi(e.observations[i].text)),
      choice: ch ? vi(ch.label) : null,
      kind: a.kind,
    });
  }
  return out;
}

/** Decision tags as plain text (the player's own record of what they did). */
export function visibleTags(content, st) {
  const labels = new Map();
  for (const e of content.events) for (const c of e.choices) for (const q of c.consequences) if (q.type === 'tag') labels.set(q.tag, vi(c.label));
  return Object.values(st.player.knowledge.tags).sort((a, b) => a.at - b.at).map((t) => ({ tag: t.tag, via: t.via, at: t.at, when: timeLabel(t.at), label: labels.get(t.tag) ?? null }));
}

export function playerView(content, st) {
  const t = timeOf(st.segment);
  return {
    role: st.player.role, roleLabel: ROLE_LABEL[st.player.role],
    segment: st.segment, day: t.day, segmentOfDay: t.segment, timeLabel: timeLabel(st.segment),
    stats: { suspicion: band('suspicion', st.player.suspicion), stress: band('stress', st.player.stress) },
    npcs: visibleNpcs(content, st),
    beliefs: visibleBeliefs(content, st),
    tags: visibleTags(content, st),
    journal: journal(content, st),
    ending: st.ending ?? null,
  };
}

// ---------------------------------------------------------------------------------------------
// EPILOGUE — a pure function of the final state (docs/04 §2.4): the ending narrative per role and one card per NPC,
// chosen by Condition AST variants in content/epilogues.json (first matching variant wins).
// ---------------------------------------------------------------------------------------------
function pickVariant(content, st, variants) {
  for (const v of variants || []) {
    if (v.roles && !v.roles.includes(st.player.role)) continue;
    if (evaluate(content, st, v.when)) return v;
  }
  return null;
}

export function epilogue(content, st) {
  if (!st.ending) return null;
  const ep = content.epilogues ?? { endings: {}, npcs: {} };
  const endingDef = content.endings.find((e) => e.id === st.ending);
  const en = ep.endings?.[st.ending];
  const main = pickVariant(content, st, en?.variants);
  const extras = (en?.extras || []).filter((v) => (!v.roles || v.roles.includes(st.player.role)) && evaluate(content, st, v.when)).map((v) => vi(v.text));
  const npcs = NPC_IDS.map((id) => {
    const v = pickVariant(content, st, ep.npcs?.[id]);
    return { id, name: npcName(content, id), status: st.npcs[id].status, statusLabel: STATUS_LABEL[st.npcs[id].status], text: v ? vi(v.text) : '' }; // what each NPC did is told by the card text, never by action ids
  });
  return { id: st.ending, title: vi(endingDef?.title) || st.ending, text: main ? vi(main.text) : '', extras, npcs, endedAt: timeLabel(st.segment) };
}
