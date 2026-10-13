/**
 * THE COMPOUND — Engine type definitions.
 * Phase 2: ARCHITECTURE ONLY. No gameplay implementation lives here.
 *
 * Three layers that must never be conflated:
 *   WORLD TRUTH      -> `WorldTruth`        (immutable, loaded from content/truth.json, never in a save)
 *   PLAYER KNOWLEDGE -> `PlayerState.knowledge`  (beliefs, may be wrong)
 *   NPC KNOWLEDGE    -> `NpcState.knowledge`     (beliefs, acquired only through traceable paths)
 *
 * Every mutation of `GameState` is a `Mutation` with an explicit `CausalOrigin`.
 * The engine exposes exactly one mutation entry point (`EngineApi.apply`).
 */

// =====================================================================
// 1. IDENTIFIERS & TIME
// =====================================================================

export type RoleId = 'captive' | 'operator';

export type NpcId = 'thach' | 'vu' | 'mai' | 'linh' | 'duc';

/** Agents that can hold knowledge. `player` is the PC of the current run. */
export type AgentId = NpcId | 'player';

/**
 * Both player characters exist in the world in every run.
 * The one not being played follows the canonical default path
 * (encoded as `role` branches inside conditions — see docs/02, Q1).
 */
export type PcId = 'pc_captive' | 'pc_operator';

export type LocationId = 'dorm' | 'yard' | 'canteen' | 'floor' | 'admin' | 'mgmt_hall';

export type SegmentOfDay = 'morning' | 'afternoon' | 'night';

export interface TimeRef {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  segment: SegmentOfDay;
}

/** 0..20. (day-1)*3 + {morning:0, afternoon:1, night:2} */
export type SegmentIndex = number;

export const SEGMENTS_PER_DAY = 3;
export const TOTAL_SEGMENTS = 21;
export const SEGMENT_ORDINAL: Record<SegmentOfDay, number> = { morning: 0, afternoon: 1, night: 2 };

export function toSegmentIndex(t: TimeRef): SegmentIndex {
  return (t.day - 1) * SEGMENTS_PER_DAY + SEGMENT_ORDINAL[t.segment];
}

export function fromSegmentIndex(i: SegmentIndex): TimeRef {
  const day = (Math.floor(i / SEGMENTS_PER_DAY) + 1) as TimeRef['day'];
  const segment = (['morning', 'afternoon', 'night'] as const)[i % SEGMENTS_PER_DAY];
  return { day, segment };
}

export type FactId = `F_${string}`;
export type TagId = `T_${string}`;
/** Dotted namespace, e.g. `phone.location`, `escape.routeKnown`. */
export type FlagId = string;
export type EventId = `EV_${string}`;
export type BackgroundId = `BG_${string}`;
export type ChoiceId = string;
export type RuleId = `R_${string}`;
export type PropagationRuleId = `PR_${string}`;
/** Phase 3 — NPC Intent Layer. */
export type NpcActionId = `A_${string}`;
export type NpcDriveId = `D_${string}`;
export type EndingId = 'E_ESCAPE' | 'E_EXPOSURE' | 'E_TRANSFER' | 'E_INVERSION';

export interface LocalizedText {
  vi: string;
  en?: string;
}

// =====================================================================
// 2. WORLD TRUTH (immutable)
// =====================================================================

export type FactCategory =
  | 'background' // the compound's situation (transfer, raid, debts)
  | 'identity'   // who an NPC really is / wants
  | 'incident'   // what actually happened around the phone
  | 'decoy';     // a FALSE proposition that exists so rumors can reference it

/**
 * A proposition about the world with a canonical truth value.
 * Facts are IMMUTABLE within a run and identical across runs/roles.
 * Anything that can change because of the player is NOT a fact; it is a `WorldFlag`.
 */
export interface Fact {
  readonly id: FactId;
  readonly value: boolean;
  readonly category: FactCategory;
  readonly statement: LocalizedText;
  /** NPCs who hold this fact as CONFIRMED at segment 0. Must match content/npcs.json (tested). */
  readonly initialHolders: readonly NpcId[];
  /** Roles for which some event grants CONFIRMED status. Decoys: always []. (tested) */
  readonly confirmableBy: readonly RoleId[];
  /** Authoring notes: observable hints before the fact is revealed. */
  readonly foreshadow?: readonly string[];
}

export interface WorldTruth {
  readonly version: string;
  readonly facts: Readonly<Record<FactId, Fact>>;
}

// =====================================================================
// 3. KNOWLEDGE (beliefs, rumors, misinformation)
// =====================================================================

export type BeliefStatus = 'UNKNOWN' | 'RUMOR' | 'OBSERVED' | 'CONFIRMED';

export const BELIEF_RANK: Record<BeliefStatus, number> = {
  UNKNOWN: 0,
  RUMOR: 1,
  OBSERVED: 2,
  CONFIRMED: 3,
};

/**
 * What an agent believes about one fact.
 * INVARIANTS (enforced by engine + content tests):
 *  - status OBSERVED or CONFIRMED  => believedValue === truth.value  (never wrong)
 *  - status RUMOR                  => believedValue may differ from truth (misinformation)
 *  - status never downgrades; a higher-ranked grant replaces a lower one.
 *  - `uncertain` is a presentation flag produced by stress-distorted perception;
 *    it is only ever set on RUMOR beliefs whose source is 'self'.
 */
export interface Belief {
  readonly factId: FactId;
  readonly status: Exclude<BeliefStatus, 'UNKNOWN'>;
  readonly believedValue: boolean;
  readonly source: AgentId | 'self';
  readonly acquiredAt: SegmentIndex;
  readonly uncertain?: boolean;
  /** Attestation copied from the grant/relay that produced the belief: `true` = known to contradict WorldTruth. Never shown to the player. */
  readonly misinformation?: true;
  readonly cause: CausalOrigin;
}

/** Derived classification used by UI and tests. Never stored. */
export type BeliefClass = 'VERIFIED' | 'BELIEF' | 'RUMOR' | 'MISINFORMATION';

export function classifyBelief(b: Belief, truth: WorldTruth): BeliefClass {
  const t = truth.facts[b.factId].value;
  if (b.status === 'CONFIRMED') return 'VERIFIED';
  if (b.status === 'OBSERVED') return 'BELIEF';
  return b.believedValue === t ? 'RUMOR' : 'MISINFORMATION';
}

export type TagVia = 'self' | 'witness' | 'told';

export interface TagRecord {
  readonly tag: TagId;
  readonly via: TagVia;
  readonly source?: AgentId;
  readonly at: SegmentIndex;
  readonly cause: CausalOrigin;
}

/** Shared shape for player and NPC knowledge. */
export interface KnowledgeState {
  beliefs: Partial<Record<FactId, Belief>>;
  /** Decisions made (via 'self') or events witnessed/told. Conditions `tag`/`npcKnowsTag` read this. */
  tags: Partial<Record<TagId, TagRecord>>;
}

// =====================================================================
// 4. CAUSAL ORIGIN & MUTATION LOG
// =====================================================================

export type CausalOrigin =
  | { kind: 'engine_init' }
  | { kind: 'background'; backgroundId: BackgroundId; at: SegmentIndex }
  | { kind: 'choice'; eventId: EventId; choiceId: ChoiceId; at: SegmentIndex }
  | { kind: 'observation'; eventId: EventId; at: SegmentIndex }
  | { kind: 'delayed_rule'; ruleId: RuleId; at: SegmentIndex }
  | { kind: 'propagation'; ruleId: PropagationRuleId; from: AgentId; to: NpcId; at: SegmentIndex }
  | { kind: 'npc_action'; actor: NpcId; actionId: NpcActionId; driveId: NpcDriveId; at: SegmentIndex } // Phase 3
  | { kind: 'ending'; endingId: EndingId; at: SegmentIndex };

export interface Mutation {
  readonly seq: number;
  readonly at: SegmentIndex;
  readonly cause: CausalOrigin;
  readonly consequence: AtomicConsequence;
}

// =====================================================================
// 5. CONDITION AST (JSON-serializable, 16 operators)
// =====================================================================

export type Cmp = '<' | '<=' | '==' | '>=' | '>'; // core.mjs throws on any other op

export type Condition =
  | { op: 'always' }
  | { op: 'and'; args: Condition[] }
  | { op: 'or'; args: Condition[] }
  | { op: 'not'; arg: Condition }
  | { op: 'role'; is: RoleId }
  | { op: 'segment'; cmp: Cmp; value: SegmentIndex }
  | { op: 'stat'; stat: 'stress' | 'suspicion'; cmp: Cmp; value: number }
  | { op: 'trust'; npc: NpcId; cmp: Cmp; value: number }
  | { op: 'tag'; tag: TagId }                                   // player has tag
  | { op: 'flag'; flag: FlagId; equals: FlagValue }
  | { op: 'flagCmp'; flag: FlagId; cmp: Cmp; value: number }
  | { op: 'playerBelief'; factId: FactId; minStatus: Exclude<BeliefStatus, 'UNKNOWN'>; believedValue?: boolean }
  | { op: 'npcBelieves'; npc: NpcId; factId: FactId; minStatus: Exclude<BeliefStatus, 'UNKNOWN'>; believedValue?: boolean }
  | { op: 'npcKnowsTag'; npc: NpcId; tag: TagId }
  | { op: 'npcStatus'; npc: NpcId; is: NpcStatus }
  | { op: 'eventFired'; eventId: EventId };

// NOTE: there is deliberately NO `fact` operator. Content can never read WorldTruth directly;
// it can only read what agents believe. Truth enters play through belief grants.

// =====================================================================
// 6. CONSEQUENCES
// =====================================================================

export type FlagValue = string | number | boolean;

export type NpcStatus = 'present' | 'isolated' | 'demoted' | 'gone';

export type AtomicConsequence =
  | { type: 'stat'; stat: 'stress' | 'suspicion'; delta: number }
  | { type: 'setStat'; stat: 'stress' | 'suspicion'; value: number }
  | { type: 'trust'; npc: NpcId; delta: number }
  | { type: 'tag'; tag: TagId }                                   // player decision tag (via 'self')
  | { type: 'witnessTag'; tag: TagId }                            // player witnessed something (via 'witness')
  | { type: 'flag'; flag: FlagId; value: FlagValue }
  | { type: 'flagAdd'; flag: FlagId; delta: number }
  | {
      type: 'belief';
      agent: AgentId;
      factId: FactId;
      status: Exclude<BeliefStatus, 'UNKNOWN'>;
      believedValue: boolean;
      source: AgentId | 'self';
      /** Authoring attestation: this grant is deliberate misinformation. Required when believedValue != truth. */
      misinformation?: true;
      /** If set and the player's stress >= this value, the grant is downgraded to RUMOR(self, uncertain). */
      uncertainAboveStress?: number;
    }
  | { type: 'npcTag'; npc: NpcId; tag: TagId; via: Exclude<TagVia, 'self'>; source?: AgentId }
  | { type: 'npcStatus'; npc: NpcId; status: NpcStatus }
  | { type: 'schedule'; eventId: EventId; at: SegmentIndex }
  | { type: 'endGame'; endingId: EndingId };

/** Conditional consequence keeps branching deterministic and inside content. */
export type Consequence =
  | AtomicConsequence
  | { type: 'if'; when: Condition; then: Consequence[]; else?: Consequence[] };

// =====================================================================
// 7. EVENTS & CHOICES
// =====================================================================

export type EventTrigger =
  | 'forced'     // fires automatically when preconditions hold in its slot
  | 'optional'   // offered as an action the player may pick in its slot
  | 'scheduled'; // only fires if a consequence/rule scheduled it

export interface Observation {
  /** Only shown/granted to these roles (subset of event.roles). */
  roles: RoleId[];
  when?: Condition;
  text: LocalizedText;
  grants: Consequence[];
}

export interface Choice {
  id: ChoiceId;
  label: LocalizedText;
  available?: Condition;
  /** Must contain at least one non-text consequence (Gate A, tested). */
  consequences: Consequence[];
}

export interface GameEvent {
  /** MVP (audit F-12): the most passive option, used when the world runs without a player; string or per-role map. */
  defaultChoice?: ChoiceId | Partial<Record<RoleId, ChoiceId>>;
  id: EventId;
  roles: RoleId[];
  trigger: EventTrigger;
  /** Fixed slot for forced/optional events. */
  at?: TimeRef;
  /** Alternative to `at`: a range of segments (inclusive) during which it may fire. */
  window?: { from: TimeRef; to: TimeRef; segments?: SegmentOfDay[] };
  repeatable?: boolean;
  location?: LocationId;
  preconditions?: Condition;
  summary: LocalizedText;
  observations: Observation[];
  choices: Choice[];
  /** Part of the Day-3 vertical slice (or its Day-5 echo). */
  slice?: boolean;
  /** Q2 (Phase 3): explicit ordering among forced events in the same slot. Lower first; default = file order. */
  order?: number;
  /** Gate G attestation by author: no operational fraud/coercion detail. */
  abstractionCheck: true;
}

/** Canonical world occurrence. Happens in every run regardless of player. */
export interface BackgroundOccurrence {
  id: BackgroundId;
  at: TimeRef;
  summary: LocalizedText;
  /** Facts this occurrence instantiates (documentation; tested for existence). */
  facts: FactId[];
  /** Effects on NPC knowledge / world flags. May not read player state. */
  effects: AtomicConsequence[];
  /** Role-specific effects on the player (e.g. collective punishment). */
  playerEffects?: Partial<Record<RoleId, AtomicConsequence[]>>;
}

// =====================================================================
// 8. NPCs, RELATIONSHIPS, PROPAGATION
// =====================================================================

export interface InitialBelief {
  factId: FactId;
  status: Exclude<BeliefStatus, 'UNKNOWN'>;
  believedValue: boolean;
  source: AgentId | 'self';
  misinformation?: true;
}

export interface NpcDefinition {
  id: NpcId;
  name: LocalizedText;
  role: LocalizedText;
  publicFace: LocalizedText;
  privateMotive: LocalizedText;
  initialTrust: Record<RoleId, number>;
  initialBeliefs: InitialBelief[];
}

export type RelationshipChannel = 'reports_to' | 'commands' | 'confides_in' | 'protects' | 'resents';

export interface RelationshipEdge {
  from: NpcId;
  to: NpcId;
  channel: RelationshipChannel;
  /** Segments between `from` learning something and `to` hearing it over this edge. */
  delay: number;
  note?: LocalizedText;
}

/**
 * How knowledge moves between NPCs. Evaluated at every convergence point (end of each segment).
 * `relay`: copy matching beliefs/tags from `from` to `to`, arriving as RUMOR(source=from) unless `to` already holds higher.
 * `assert`: `from` tells `to` a specific proposition (possibly misinformation). This is the only way an NPC can lie.
 */
export type PropagationRule =
  | {
      id: PropagationRuleId;
      kind: 'relay';
      from: NpcId;
      to: NpcId;
      delay: number;
      when: Condition;
      facts?: FactId[];
      tags?: TagId[];
      /** Status on arrival (default RUMOR). Use OBSERVED only if `to` physically witnesses. */
      arriveAs?: 'RUMOR' | 'OBSERVED';
      once?: boolean;
    }
  | {
      id: PropagationRuleId;
      kind: 'assert';
      from: NpcId;
      to: NpcId;
      at?: SegmentIndex;
      when: Condition;
      factId: FactId;
      believedValue: boolean;
      misinformation?: true;
      also?: AtomicConsequence[];
      once: true;
    };

export interface NpcState {
  id: NpcId;
  trustToPlayer: number; // -3..3
  status: NpcStatus;
  knowledge: KnowledgeState;
}

// =====================================================================
// 9. DELAYED CONSEQUENCES (butterfly)
// =====================================================================

export interface DelayedRule {
  id: RuleId;
  description: LocalizedText;
  /** Seeds this rule reads — documents the causal chain for reviewers (tested: each must have a producer). */
  reads: { tags?: TagId[]; flags?: FlagId[]; facts?: FactId[] };
  when: Condition;
  /** Evaluated at the convergence point of segments in [earliest, latest]. */
  earliest: SegmentIndex;
  latest?: SegmentIndex;
  once: true;
  /** Lower runs first within a convergence point. Ties resolve by id. */
  priority: number;
  effects: Consequence[];
}

// =====================================================================
// 9b. NPC INTENT LAYER (Phase 3, PO decision P1/P2)
// =====================================================================

/** A motive, as data. 2–3 per NPC. Priority: lower number = stronger drive. */
export interface NpcDrive {
  id: NpcDriveId;
  npc: NpcId;
  priority: number;
  name: LocalizedText;
  description: LocalizedText;
}

/**
 * An NpcAction is a DelayedRule owned by an NPC. It is evaluated at the convergence point
 * AFTER propagation (6a) and BEFORE global delayed rules (6b), ordered by (priority, id).
 * Each NPC fires at most ONE action per convergence point. No search, no planning (docs/04 R-E5).
 *
 * VISIBILITY CONTRACT (tested, Gate C extended):
 *   `when` may only read what the actor can know:
 *     - npcBelieves / npcKnowsTag / npcStatus / trust  with npc == actor
 *     - flag F  only if FlagDefinition.visibleTo includes actor (or visibleByValue[value] does)
 *     - stat suspicion  only for actor in {thach, vu} (SUSPICION is the organisation's number, D1)
 *     - segment, role, always, and/or/not
 *     - NEVER: tag (player private), playerBelief, stat stress, eventFired, other NPCs' knowledge
 *   `effects` are the physical RESOLUTION of the action and may additionally read the flags/tags
 *   listed in `touches` (what the actor physically comes into contact with).
 */
export interface NpcAction extends Omit<DelayedRule, 'id' | 'once'> {
  id: NpcActionId;
  actor: NpcId;
  drive: NpcDriveId;
  once: boolean;
  /** World state the resolution (`effects`) may inspect even though the decision (`when`) cannot. */
  touches?: { flags?: FlagId[]; tags?: TagId[] };
  /** Phase 2 rules this action replaces when the intent layer is loaded (kept in content for diffing). */
  supersedes?: Array<RuleId | PropagationRuleId>;
}

/** Declared, reviewed exception to the visibility contract (every entry must carry a reason). */
export interface VisibilityException {
  ruleId: PropagationRuleId | NpcActionId;
  reads: string;
  reason: LocalizedText;
}

/**
 * Declared, reviewed exception to the convergence write-before-read rule (audit §12 T-G): `reader` may run before
 * `writer` in the same pass although both touch `flag`. tests/content-gates.test.mjs verifies every entry names a real
 * overlapping pair, carries a reason, and is value-disjoint (the writer never writes a value the reader tests for).
 */
export interface ReadBeforeWriteException {
  reader: RuleId | NpcActionId;
  writer: RuleId | NpcActionId;
  flag: FlagId;
  why: string;
}

export interface NpcIntentBundle {
  drives: NpcDrive[];
  actions: NpcAction[];
  visibilityExceptions: VisibilityException[];
  allowReadBeforeWrite?: ReadBeforeWriteException[];
}

// =====================================================================
// 10. ENDINGS
// =====================================================================

export interface EndingWitnessPath {
  role: RoleId;
  /** Ordered (event, choice) pairs claimed to reach the ending. Tested for existence + chronological order. */
  steps: Array<{ eventId: EventId; choiceId: ChoiceId }>;
}

export interface Ending {
  id: EndingId;
  title: LocalizedText;
  /** Segments at which this ending is checked (after that segment's events, before convergence). */
  checkAt: SegmentIndex[];
  /** Lower number wins when several conditions hold at the same check. */
  priority: number;
  condition: Condition;
  /** Tags that only matter for epilogue variants (so they count as "read" in Gate A). */
  epilogueTags: TagId[];
  witnessPaths: EndingWitnessPath[];
}

// =====================================================================
// 11. GAME STATE (the only mutable thing)
// =====================================================================

export interface PlayerState {
  role: RoleId;
  stress: number;     // 0..100
  suspicion: number;  // 0..100
  location: LocationId;
  knowledge: KnowledgeState;
}

export interface ScheduledEvent {
  eventId: EventId;
  at: SegmentIndex;
  cause: CausalOrigin;
}

export interface GameState {
  meta: { saveVersion: 2; contentVersion: string; createdAt: string };
  segment: SegmentIndex;
  player: PlayerState;
  npcs: Record<NpcId, NpcState>;
  /** Contingent, player-driven world state. Keys namespaced; initial values from content/flags.json. */
  flags: Record<FlagId, FlagValue>;
  firedEvents: EventId[];
  firedRules: RuleId[];
  firedPropagations: PropagationRuleId[];
  firedActions: NpcActionId[];
  queue: ScheduledEvent[];
  mutationLog: Mutation[];
  /** Journal source: every event fired (with the observation indices the player received) and every skipped optional. */
  actionLog: ActionLogEntry[];
  /** Replay source: every decision the engine asked the player for, in order. A save is this list plus hashes. */
  decisions: Decision[];
  ending?: EndingId;
}

export interface ActionLogEntry { segment: SegmentIndex; eventId: EventId | null; choiceId: ChoiceId | 'skip' | null; kind: EventTrigger | 'scheduled-skipped'; obs?: number[]; offered?: EventId[] }
export type Decision = { k: 'c'; e: EventId; c: ChoiceId } | { k: 'o'; e: EventId | null };

/**
 * MVP save format (v2): the decision list plus hashes. Loading = deterministic replay against the same content
 * (`contentVersion`), then `stateHash` must match — so save/load integrity and replay determinism are one guarantee.
 */
export interface SaveFile {
  format: 'the-compound-save';
  saveVersion: 2;
  contentVersion: string;
  role: RoleId;
  segment: SegmentIndex;
  ending: EndingId | null;
  decisions: Decision[];
  stateHash: string;
  checksum: string;   // hash of every field above
  savedAt: string | null;
  label: string | null;
}

// =====================================================================
// 12. CONTENT BUNDLE & ENGINE API (signatures only — Phase 5)
// =====================================================================

export interface FlagDefinition {
  id: FlagId;
  initial: FlagValue;
  /** Allowed values for string flags (tested). */
  values?: string[];
  description: LocalizedText;
  /**
   * Phase 3 (P2) — which NPCs may READ this flag inside an NpcAction/PropagationRule condition.
   * 'all' = public world state. Omitted = visible to nobody (player-private / hidden world state).
   * `visibleByValue` refines per value (e.g. phone.location: only the holder knows they hold it).
   */
  visibleTo?: 'all' | NpcId[];
  visibleByValue?: Record<string, NpcId[]>;
  /** Values that are terminal (no reader required — Gate A exemption, audit F-06). */
  terminal?: string[];
}

export interface ContentBundle {
  /** Hash of every content file (src/engine/content.mjs); saves carry it and refuse to load against different content. */
  contentVersion: string;
  truth: WorldTruth;
  flags: FlagDefinition[];
  /** Declared initial player stats per role (content/flags.json `playerInitial`, audit F-09). */
  playerInitial: Record<RoleId, { stress: number; suspicion: number }>;
  npcs: NpcDefinition[];
  relationships: RelationshipEdge[];
  propagation: PropagationRule[];
  background: BackgroundOccurrence[];
  events: GameEvent[];
  delayedRules: DelayedRule[];
  endings: Ending[];
  /** Phase 3. Optional so the Phase 2 baseline can still be evaluated for comparison. */
  intents?: NpcIntentBundle;
  /** MVP epilogue variants (content/epilogues.json). */
  epilogues?: EpilogueBundle;
  /** Test-only switches (sensitivity tests); never set by loaders. */
  engineOptions?: { rulesBeforePropagation?: boolean };
}

export interface EpilogueVariant { roles?: RoleId[]; when: Condition; text: LocalizedText }
export interface EpilogueBundle {
  endings: Record<EndingId, { variants: EpilogueVariant[]; extras?: EpilogueVariant[] }>;
  npcs: Record<NpcId, EpilogueVariant[]>;
}

/**
 * Engine ordering decisions implemented by src/engine/core.mjs. All items were ASSUMPTIONS awaiting PO ratification
 * after the Phase 2 audit (F-08, F-09, F-11, O12, O13); the 2026-10-13 directive ratified them (docs/08-mvp-architecture.md §5).
 * tests/engine.test.mjs (TYPES) imports this file with --experimental-strip-types and asserts these constants equal core.mjs.
 */
export const ENGINE_ORDERING = {
  initialStats: { stress: 0, suspicion: 0 },      // fallback; content/flags.json `playerInitial` is authoritative (F-09)
  clamp: 'per-mutation',                           // F-08
  equalRankBeliefGrant: 'no-op',                   // F-11
  relayAcquiredAt: 'arrival-segment',              // F-11
  eventOrder: 'order-field, then forced-before-scheduled, then id', // Q2 + O12 — file/queue order never matters
  propagationOrder: 'priority-then-id',            // O13
  convergence: ['propagation', 'npc_actions', 'delayed_rules', 'clamp'] as const,
  endingStopsImmediately: true,
} as const;

/** A recorded player decision: a choice in an event, or an optional-event pick (null = let the segment pass). */
export type Decision = { k: 'c'; e: EventId; c: ChoiceId } | { k: 'o'; e: EventId | null };

/** What the engine needs next when a decision list runs out (thrown as NeedInput.request, surfaced by Session.prompt). */
export type InputRequest = { kind: 'choice'; eventId: EventId; choices: ChoiceId[] } | { kind: 'optional'; options: EventId[] };

/** Driver of a run: scriptedPolicy / passivePolicy (tests, zero-player) or replayPolicy (saves, Session). */
export interface Policy {
  choose(e: GameEvent, available: Choice[], st: GameState): ChoiceId;
  pickOptional(offered: GameEvent[], st: GameState): GameEvent | null;
}

/** Engine surface as implemented by src/engine/core.mjs (re-exported by evaluator.mjs). State is mutated in place; every
 *  step runs inside transact() so a thrown invariant restores the pre-step state. */
export interface EngineApi {
  start(content: ContentBundle, role: RoleId, opts?: { createdAt?: string }): GameState;
  evaluate(content: ContentBundle, state: GameState, cond: Condition | undefined): boolean;
  /** Single mutation entry point. Validates invariants (belief rank, truth match, declared flag values, future schedules, clamps). */
  apply(content: ContentBundle, state: GameState, c: Consequence, cause: CausalOrigin): GameState;
  transact<T>(state: GameState, fn: (st: GameState) => T): T;
  /** One full segment (background → forced/scheduled → optional → ending check → convergence → clock). True if the game ended. */
  runSegment(content: ContentBundle, state: GameState, policy: Policy): boolean;
  convergence(content: ContentBundle, state: GameState): void;
  run(content: ContentBundle, role: RoleId, policy: Policy, until?: SegmentIndex): GameState;
  /** Deterministic replay of a decision list; an exhausted list stops at the last committed point with the pending request. */
  replay(content: ContentBundle, role: RoleId, decisions: Decision[], until?: SegmentIndex): { st: GameState; complete: boolean; request: InputRequest | null };
  stateHash(state: GameState): string;
  serialize(content: ContentBundle, state: GameState, extra?: { savedAt?: string; label?: string }): SaveFile;
  /** format → checksum → contentVersion → replay → segment/ending header → stateHash; throws with a specific reason. */
  deserialize(content: ContentBundle, save: SaveFile): GameState;
}

// =====================================================================
// 13. OPTIONAL SI DIALOGUE LAYER (interface only)
// =====================================================================

/**
 * The dialogue provider renders text. It receives ONLY what the player is allowed to know.
 * It can never return consequences. `StaticProvider` is the sole MVP implementation (Gate D).
 */
export interface DialogueRequest {
  eventId: EventId;
  role: RoleId;
  canonicalText: LocalizedText;
  speaker?: NpcId;
  /** Filtered: player beliefs only, never WorldTruth, never NPC private knowledge. */
  playerBeliefs: Belief[];
  stressBand: 0 | 1 | 2 | 3;
  locale: keyof LocalizedText;
}

export interface DialogueProvider {
  render(req: DialogueRequest): Promise<string>;
}


// =====================================================================
// 14. MVP — SESSION, PROJECTION, EPILOGUE (src/engine/session.mjs, projection.mjs)
// =====================================================================

/** What the engine needs from the player next. Produced by Session.prompt(). */
export type SessionPrompt =
  | { kind: 'choice'; time: string; segment: SegmentIndex; eventId: EventId; trigger: EventTrigger; summary: string; location: string; observations: { text: string; uncertain: boolean }[]; choices: { id: ChoiceId; label: string }[] }
  | { kind: 'optional'; time: string; segment: SegmentIndex; options: { id: EventId; summary: string; location: string }[] }
  | { kind: 'ended'; ending: EndingId | null; time: string };

/** Player-visible belief (audit F-03): never the canonical value, never the misinformation attestation. */
export interface PlayerVisibleBelief { factId: FactId; statement: string; status: Exclude<BeliefStatus, 'UNKNOWN'>; statusLabel: string; rank: number; believedValue: boolean; uncertain: boolean; source: AgentId | 'self'; sourceLabel: string; acquiredAt: SegmentIndex; when: string }

export interface JournalEntry { segment: SegmentIndex; time: string; eventId: EventId; location: string; summary: string; observations: string[]; choice: string | null; kind: string }

/** Everything a UI may render. Stats are qualitative bands (GDD D10); trust is never exposed. */
export interface PlayerView {
  role: RoleId; roleLabel: string; segment: SegmentIndex; day: number; segmentOfDay: SegmentOfDay; timeLabel: string;
  stats: { suspicion: { label: string; level: 0 | 1 | 2 | 3 }; stress: { label: string; level: 0 | 1 | 2 | 3 } };
  npcs: { id: NpcId; name: string; status: NpcStatus; statusLabel: string }[];
  beliefs: PlayerVisibleBelief[];
  tags: { tag: TagId; via: TagVia; at: SegmentIndex; when: string; label: string | null }[];
  journal: JournalEntry[];
  ending: EndingId | null;
  prompt: SessionPrompt;
  epilogue: Epilogue | null;
}

/** content/epilogues.json: narrative variants selected by Condition AST on the FINAL state (docs/04 §2.4). */
export interface EpilogueVariant { roles?: RoleId[]; when: Condition; text: LocalizedText }
export interface EpilogueBundle { endings: Partial<Record<EndingId, { variants: EpilogueVariant[]; extras?: EpilogueVariant[] }>>; npcs: Partial<Record<NpcId, EpilogueVariant[]>> }
export interface Epilogue { id: EndingId; title: string; text: string; extras: string[]; npcs: { id: NpcId; name: string; status: NpcStatus; statusLabel: string; text: string; actions: NpcActionId[] }[]; endedAt: string }
