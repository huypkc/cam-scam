# THE COMPOUND — PHASE 3 REVIEW PACKAGE

Ngày: 2026-10-12 · Người lập: Claude Fable · PO: Huypkc
Người nhận: **Claude Opus** (Architecture Reviewer — `docs/reviews/phase3-opus-architecture.md`) · **ChatGPT** (Logic & Consistency Verifier — `docs/reviews/phase3-chatgpt-logic.md`)
Trạng thái: **DỪNG TẠI RANH GIỚI PHASE 3. Chưa có phản hồi reviewer. Chưa có gameplay implementation.**

Tiền đề đã xác minh trong phiên này (Node v22.23.3, không cài gì):

```
node --test tests/*.test.mjs        # 59 pass / 0 fail  (21 Phase 2 + 10 static intents + 28 dynamic)
node scripts/trace.mjs              # sinh docs/06-phase3-phone-scenario-trace.md (559 dòng)
sha256sum -c docs/phase3-checksums.txt
```

Nhãn bằng chứng: **VERIFIED** = chạy/đọc trong phiên này, có file:dòng hoặc test id · **INFERRED** = suy ra từ đặc tả · **UNKNOWN** = không có bằng chứng · **NOT IMPLEMENTED** = chưa có trong repo.

---

## 1. Tóm tắt implementation Phase 3

Phạm vi được PO ủy quyền: evaluator, NPC Intent Layer, ràng buộc tầm nhìn, test harness deterministic, scenario điện thoại, tài liệu review. **Không** có: gameplay UI, G8, mở rộng scope, thay đổi kiến trúc chưa duyệt.

| Deliverable | File | Dòng | Trạng thái |
|---|---|---|---|
| Reference evaluator (Q3/P3, test-only) | `src/engine/evaluator.mjs` | 325 | VERIFIED — thực thi docs/02 §4 + bước 6a' (NPC action); 1 entry point `apply()`; mọi mutation có `CausalOrigin`; không RNG |
| Type mở rộng (chỉ thêm) | `src/engine/types.ts` §4 (`npc_action`), §7 (`GameEvent.order` Q2), §9b (`NpcDrive`, `NpcAction`, `VisibilityException`, `NpcIntentBundle`), §12 (`FlagDefinition.visibleTo/visibleByValue/terminal`, `ContentBundle.intents`, `ENGINE_ORDERING`) | 521 → 606 (+85) | VERIFIED — parse bằng `--experimental-strip-types`; **chưa tsc** (A1 vẫn UNKNOWN) |
| NPC Intent Layer (P1) | `content/npc.intents.json` — 8 drive, 8 action, 1 visibility exception | 693 (JSON thụt lề) | VERIFIED — thay thế 6 DelayedRule + 1 PropagationRule (`supersedes`) |
| Ràng buộc tầm nhìn (P2) | `content/flags.json` — `visibleTo`/`visibleByValue` cho 25 flag; `terminal` cho `phone.location` | — | VERIFIED — test 52–54 |
| Flag mới | `vu.shieldingPhone` (25/40, GDD R1) | — | VERIFIED — writer `A_VU_SHIELD_PHONE`, reader `A_VU_HAND_UP` |
| Test tĩnh Intent | `tests/intents.test.mjs` (10) + `tests/static-checks.mjs` | 150 + 81 | VERIFIED |
| Test động T01–T10 + scenario + witness + sensitivity | `tests/evaluator.test.mjs` (28) + `tests/corpus.mjs` | 387 + 108 | VERIFIED |
| Trace generator | `scripts/trace.mjs` → `docs/06-phase3-phone-scenario-trace.md` | 108 → 559 | VERIFIED — deterministic, byte-identical khi chạy lại |

**Không chạm:** `content/truth.json`, `content/npcs.json`, `content/timeline.json`, `content/rules.delayed.json`, `content/endings.json`, `tests/consistency.test.mjs`, `docs/01–05` (checksum Phase 2 vẫn khớp — mục 10).

**Không sửa thầm:** mọi lỗi content do audit tìm ra (F-01, F-02, F-05, F-07…) **vẫn còn nguyên** trong content; Phase 3 chỉ *đo* chúng bằng test (mục 7, 9). Sửa content là quyết định của PO.

---

## 2. Bản đồ phụ thuộc kiến trúc

### 2.1 Module

```
content/*.json ──loadContent()──▶ ContentBundle (truth deep-frozen)
                                      │
   tests/static-checks.mjs ◀──────────┤  visibilityViolations / reachableFacts / butterflyViolations / relayArrivalViolations
                                      │
   src/engine/evaluator.mjs ◀─────────┘  start · evaluate · apply · runSegment · convergence · policies
          ▲            ▲
   tests/corpus.mjs    scripts/trace.mjs ──▶ docs/06-phase3-phone-scenario-trace.md
          ▲
   tests/evaluator.test.mjs (T01–T10, S*, O*, WP, CF, ZP)     tests/intents.test.mjs (static)
```

- `evaluator.mjs` **không import** `types.ts` (JS thuần để `node:test` chạy không cần tsc). Hợp đồng giữa hai file là ngữ nghĩa, kiểm bằng test; A2 (JSON ↔ TS) vẫn **UNKNOWN**.
- `evaluator.mjs` đọc `content.intents` tùy chọn → cùng engine chạy được **baseline Phase 2** (`loadContent({intents:false})`) và **Phase 3**. Mọi scenario trong corpus chạy cả hai chế độ để reviewer đối chiếu hành vi.
- Chỉ test nhập `static-checks.mjs`; engine không phụ thuộc test.

### 2.2 Thứ tự convergence (docs/02 §4 bước 6, mở rộng)

```
6a  PropagationRule (file order; relay kế thừa attestation misinformation của nguồn — F-10)
6a' NpcAction  sắp theo (priority, id); mỗi actor ≤ 1 action / convergence; actor 'gone' không hành động   ← MỚI
6b  DelayedRule (priority, id), bỏ qua rule có trong `supersedes` của action đã nạp
6c  clamp
```

Bằng chứng thứ tự quan trọng: test CF-8 chứng minh đảo 6a/6b làm `R_INTERROGATION_D4` chết (bảo vệ audit O1); CF-6 chứng minh `priority` quyết định cuộc đua Thạch/Vũ.

### 2.3 Flag → writers → readers

Bảng đầy đủ 25 flag (kèm `visibleTo`) được sinh tự động: `docs/06-phase3-phone-scenario-trace.md` §3. Tóm tắt điểm nóng:

| Flag | Writers | Readers | Nhận xét |
|---|---|---|---|
| `phone.location` | BG_D3M_THEFT, 2 choice Captive, 3 choice Operator, obs PHONE_CONTENTS, R_SUSPICION_SWEEP, **A_THACH_RAID**, **A_VU_ROUTINE_CEILING_CHECK**, **A_VU_HAND_UP** | 4 event precondition/available, 4 action, PR_DUC_CONFIDES_LINH | `linh`, `mai` vẫn là trạng thái hấp thụ (F-06, chưa sửa) |
| `duc.scapegoated` | blame_duc, name_duc, **A_THACH_RAID** (có điều kiện) | PR_THACH_TELLS_VU_SCAPEGOAT | Phase 3: không còn là hằng số của raid |
| `vu.shieldingPhone` | **A_VU_SHIELD_PHONE** | **A_VU_HAND_UP** | mới |
| `raid.scheduled` | R_EXPOSURE_RAID | R_TRANSFER_PREP, R_CALLED_UP, PR_THACH_TELLS_VU_TRANSFER | PR đọc flag ẩn → visibility exception có lý do |

---

## 3. Báo cáo chuyển trạng thái & nhân quả

**Mọi mutation có nguồn gốc** — 8 kind `CausalOrigin` (`engine_init, background, choice, observation, delayed_rule, propagation, npc_action, ending`), kiểm bởi T01 (tập cause hợp lệ) và T02 (`cause.at == mutation.at`, log đơn điệu theo segment, `schedule.at > at`, belief `acquiredAt == cause.at`). VERIFIED trên 36 run (12 scenario × 2 chế độ + 8 witness path + 4 zero-player).

**Mọi lần `phone.location` đổi tay trong corpus** (T08, bảng đầy đủ: trace §2): 7 loại chuyển tiếp được thực thi, mỗi chuyển tiếp có tác nhân thuộc bảng cho phép (background / choice / observation / R_SUSPICION_SWEEP / 3 npc_action). NPC chỉ di chuyển điện thoại khi action của nó `reads` hoặc `touches` `phone.location`. Chuyển tiếp **không** được corpus chạm tới: `player→linh` (chết, F-05a), `player→mai`, `player→destroyed`, `vu_locker→player` (choice Operator `o_take`, reachable — xem mục 9).

**Tiền điều kiện tường minh, hậu quả truy vết được:** mỗi action có `reads` khớp chính xác `when` (test 55), `touches` khai báo world state mà resolution được phép đọc (test 54), `supersedes` chỉ tới rule có thật và không trùng (test 51).

**Thứ tự thời gian nhất quán:** `butterflyViolations()` (static-checks) mở rộng Test 17 cho action: không action nào mở cửa sổ trước khi hạt giống nó đọc tồn tại; adversarial trong T02 (dời `A_VU_SEES_DUC_CALL.earliest` về 5) bị bắt.

**Hai mâu thuẫn đặc tả đã được chốt tạm bằng hằng số** `ENGINE_ORDERING` (types.ts cuối file + evaluator.mjs đầu file), **chờ PO phê chuẩn** (audit F-08, F-09, F-11, O12, O13): stat khởi điểm 0/0; clamp per-mutation; grant cùng rank = no-op; relay `acquiredAt` = segment đến; scheduled = thứ tự vào queue; propagation = thứ tự file. Đây là **giả định được khai báo**, không phải sửa thầm.

---

## 4. Kiểm toán lan truyền tri thức NPC

### 4.1 Tách bạch 6 lớp

| Lớp | Biểu diễn | Kiểm |
|---|---|---|
| Canonical fact | `WorldTruth.facts` (deep-frozen trong `start()`) | T06: ghi vào truth ném exception; snapshot JSON trước/sau corpus bằng nhau |
| Direct observation | `Belief{status:'OBSERVED'}` | T05: luôn khớp truth |
| Belief (verified) | `Belief{status:'CONFIRMED'}` | T05 |
| Rumor | `Belief{status:'RUMOR', believedValue == truth}` | T04 ghi nhận mâu thuẫn mức RUMOR (hợp lệ) |
| Misinformation | `Belief{status:'RUMOR', believedValue != truth, misinformation:true}` | T01: grant sai từ NPC phải có attestation; relay kế thừa attestation từ nguồn |
| Intention | `NpcAction` (dữ liệu) + `CausalOrigin{kind:'npc_action'}` | T03, T09 |

### 4.2 Đường thông tin hợp lệ

- **Tĩnh:** `reachableFacts()` = fixpoint (initial + mọi grant nhắm NPC từ event/background/rule/action/assert + relay). Mọi `npcBelieves` trong action và mọi `source` của grant trong action nằm trong fixpoint (test 56). Adversarial: Mai "nghe Linh" một fact Linh không bao giờ có → bị bắt (T01).
- **Động:** T01 duyệt toàn bộ mutationLog: NPC A nhận fact F từ nguồn S (NPC khác) ⇒ S đã giữ F ở seq nhỏ hơn, trừ khi grant là lời nói dối có attestation. 0 vi phạm trên 36 run.
- **Line-of-sight:** `visibleTo`/`visibleByValue` trên flag; action chỉ được *quyết định* trên flag nhìn thấy được (test 52); PropagationRule chỉ được đọc điều `from` nhìn thấy (test 53), **1 ngoại lệ có lý do**: `PR_THACH_TELLS_VU_TRANSFER` đọc `raid.scheduled` — tri thức của thế giới, không của Thạch (đề xuất sửa content, mục 9).
- **Latency:** `RelationshipEdge.delay` + `relay.delay`; CF-7 chứng minh delay Linh→Thạch 0 vs 1 đổi `acquiredAt` của Thạch (10 vs 11) nhưng không đổi kết quả với cửa sổ hiện tại, và **có** đổi khi raid mở ở 10.
- **False belief / contradictory report:** Linh OBSERVED(false) `F_PHONE_TAKEN_BY_CAPTIVE_PC` nhưng assert RUMOR(true) `F_CAPTIVE_PC_NEAR_ADMIN_D3` cho Thạch với `misinformation:true` — nói dối có chủ đích, truy vết được (trace §4, S1_PASSIVE).
- **Knowledge expiration / correction:** **NOT IMPLEMENTED** (thiết kế: belief không bao giờ hạ cấp; decoy chỉ bị bác bỏ bằng CONFIRMED=false). Cặp decoy/real là hai fact độc lập (F-18): T04 phát hiện 0 mâu thuẫn ở mức ≥ OBSERVED trong corpus; mâu thuẫn mức RUMOR được phép.

### 4.3 Ai biết gì, từ đâu, lúc nào

Bảng đầy đủ cho S1_PASSIVE và O4_EXPOSURE: trace §4. Ví dụ chuỗi then chốt (S1): Đức CONFIRMED chỗ giấu (BG D3S) → Linh RUMOR(source duc) D4C qua `PR_DUC_CONFIDES_LINH` → Thạch RUMOR(source linh) D4Đ qua `PR_LINH_RELAY_LOCATION` (delay 1) → Thạch CONFIRMED(self) D4Đ qua `A_THACH_RAID_WHERE_I_BELIEVE` (resolution chạm `phone.location`).

---

## 5. Kiểm toán NPC Intent Layer

### 5.1 Mô hình

`NpcAction = DelayedRule + {actor, drive, touches?, supersedes?}`; `once` không còn bắt buộc `true` (cho phép lặp sau này; content hiện tại toàn `once:true`). Hành động = **Knowledge + Beliefs (npcBelieves/npcKnowsTag của chính actor) + Goals (drive) + Constraints (window, priority, một action/convergence, visibility) + Available Actions (danh sách tĩnh)**. Không tìm kiếm, không lập kế hoạch nhiều bước (R-E5).

### 5.2 Bảng action

| Action | Actor · Drive | Quyết định đọc (chỉ điều actor biết) | Resolution chạm | Thay thế | Khác Phase 2 |
|---|---|---|---|---|---|
| A_THACH_RAID_WHERE_I_BELIEVE | thach · FIND_LEAK | thach believes HIDDEN_DORM_CEILING ≥ RUMOR | phone.location | R_THACH_RAID_CEILING, R_THACH_RECOVERS_PHONE_QUIET | Quy Đức **chỉ khi** Thạch có lý do (tin TAKEN_BY_DUC *hoặc* biết người mới che giường Đức qua `PR_LINH_RELAY_CAPTIVE_TAGS` — F-16 có reader); không còn cần Đức present; nếu có tip giả → +15 SUSPICION Captive thay vì quy ai |
| A_VU_ROUTINE_CEILING_CHECK | vu · STAY_ABOVE | `always` (thói quen) | phone.location | R_VU_CEILING_CHECK | Quyết định không đọc world; kết quả rỗng nếu điện thoại đã đi |
| A_VU_SHIELD_PHONE | vu · PROTECT_DUC | giữ phone (byValue) ∧ (C: trust ≥2 ∨ O: npcKnowsTag TOLD_VU_HIDE ∨ vu CONFIRMED DUC_WANTS_TO_CALL_MOTHER) | — | — | Mới; tách drive cạnh tranh thành action riêng, thắng bằng priority 14 < 15 |
| A_VU_HAND_UP | vu · STAY_ABOVE | giữ phone ∧ ¬shielding | — | PR_VU_REPORTS_PHONE | `tag T_O_TOLD_VU_HIDE` (player-private) → `npcKnowsTag vu` (đã được cấp) |
| A_VU_SEES_DUC_CALL | vu · PROTECT_DUC | role captive ∧ duc.calledHome (visible vu) | duc.calledHome, tag T_C_GAVE_DUC_CALL | R_DUC_CALLED_HOME | Vũ OBSERVED Đức muốn gọi mẹ; +trust chỉ nếu người chơi đưa (hỏi Đức) |
| A_DUC_TRY_CALL | duc · CALL_MOTHER | duc present ∧ phone == yard_cache (Đức tự giấu) ∧ ¬calledHome | — | — | **Mới, phát sinh:** S6 chứng minh Đức tự gọi nếu người chơi chuyển điện thoại ra sân rồi không dùng |
| A_MAI_APPROACH_OPERATOR | mai · SELF_RESCUE | role operator ∧ mai knows CONFRONTED_MAI ∧ ¬knows REPORTED_MAI ∧ mai present | — | R_MAI_DEAL | Mai **không** biết `T_O_POINTED_AT_MAI` → vẫn tới (O3 chứng minh; baseline không) |
| A_THACH_RECRUIT | thach · EXIT_WITH_MONEY | role captive ∧ ¬isolated ∧ (quota ≥3 ∨ SUSPICION ≥70) | — | R_THACH_DEAL_OFFER | Không đổi (SUSPICION là số của tổ chức, hợp lệ cho Thạch) |

Drive của **Linh** (EARN_RELEASE, PROTECT_DUC) được khai báo nhưng **thể hiện bằng 4 PR_LINH_* có sẵn** (đã qua test visibility); không viết lại.

Tổng luật sống: 15 − 6 + 8 = **17 rule/action** + 7 PR (P6: ≤ 21 ✓, T10).

### 5.3 Hành vi NPC giải thích được

Với mỗi action đã bắn, T03 **tái dựng chính xác** state ngay trước mutation (replay log tới seq) và đánh giá lại `when` → phải `true`; T09 kiểm tra lý do ngữ nghĩa (Thạch quy Đức ⇒ có belief/tag từ trước; Vũ che ⇒ có một trong ba lý do; Vũ nộp ⇒ chưa từng quyết định che). 0 vi phạm. `CausalOrigin.npc_action` mang `actor, actionId, driveId` → projection "Sổ ghi nhớ"/epilogue (docs/04 §2.4) có đủ dữ liệu, nhưng projection **NOT IMPLEMENTED** (ngoài scope Phase 3).

---

## 6. Phone scenario — tóm tắt execution trace

Trace đầy đủ từng segment (người chơi · convergence · phone · stat · trust · status · belief mới) cho 12 scenario, cả hai chế độ: `docs/06-phase3-phone-scenario-trace.md` §1.

| Hàng docs/04 §3.4 | Scenario | Tài liệu hứa | Evaluator cho (Phase 3) | Verdict |
|---|---|---|---|---|
| 1 Không làm gì | S1_PASSIVE | raid seg 12, quy Đức | raid **seg 11**, **không quy ai** (Linh không thấy gì để báo; Thạch không có lý do) · baseline: quy Đức | PASS (khác tài liệu, đúng thiết kế P1; cần PO xác nhận) |
| 2 Che + cảnh báo | S2_COVER_WARN | Vũ tìm thấy seg 12, giữ im | Vũ tìm thấy seg 12, **nộp seg 14** (trust −1) | PASS (tài liệu nói "giữ im" là sai: không có lý do) |
| 3 + trust Vũ lên 2 | S3_VU_TRUST | Vũ không nộp, Đức gọi được | trust.vu tối đa **0** tại seg 14 (trần tĩnh = 1) → Vũ nộp | **FAIL so với tài liệu — F-01**, test khẳng định trần |
| 4 Tự giữ, SUSP ≥ 40 | S4_TAKE_SWEEP | sweep seg 10, không quy ai | đúng như vậy | PASS |
| 5 Nói với Linh tên Đức | S5_TELL_LINH | raid seg 9 | raid seg 11 (không có luật "Linh báo tên") | **FAIL so với tài liệu — content thiếu** |
| 6 Mai tự lục | S7_MAI_NEVER_ACTS | Mai lấy lại seg 10 | Mai không hành động | **NOT IMPLEMENTED** — cần BG_D3A_SEARCH |
| (mới) Đức tự gọi | S6_MOVE_YARD_DUC_CALLS | — | Đức gọi seg 13; Vũ OBSERVED | PASS — hệ quả phát sinh thật |
| Operator | O1–O4 | — | O3: Mai vẫn tới dù bị chỉ điểm; O4: PHƠI BÀY, nhận là nguồn | PASS |

**Đánh giá theo brief:** actor permissions (T08) ✓ · device ownership/access state (`visibleByValue` của `phone.location`) ✓ · knowledge boundaries (T03) ✓ · information transfer (T01, trace §4) ✓ · delayed discovery (D3S giấu → D4Đ/D5S phát hiện tùy đường tri thức) ✓ · divergent consequences (6 kết cục khác nhau của `phone.location` từ cùng seg 6) ✓. Tội phạm trừu tượng: không mô tả cách lấy/mở/gian lận; điện thoại chỉ là `flag` đổi tay (Gate G test 20 + 59).

---

## 7. Kết quả test deterministic (T01–T10)

| ID | Trạng thái ban đầu | Trigger | Kỳ vọng | Thực tế | Verdict | Bằng chứng |
|---|---|---|---|---|---|---|
| T01 | 36 run corpus + content | Duyệt mọi belief mutation; tiêm action Mai "nghe Linh" fact Linh không có | 0 NPC học không nguồn; injection bị bắt | 0 vi phạm; `knowledgePathViolations` bắt `A_X` | **PASS** | evaluator.test.mjs:T01, static-checks.mjs `reachableFacts` |
| T02 | 36 run | Kiểm log đơn điệu, `schedule.at > at`, `acquiredAt == cause.at`; dời `earliest` của action về trước hạt giống | 0 vi phạm; injection bị bắt | 0; bắt | **PASS** | T02, `butterflyViolations` |
| T03 | 8 action + 36 run | Visibility tĩnh; tái dựng state trước mỗi action đã bắn và đánh giá lại; Linh đọc `phone.location`, Thạch đọc STRESS, Vũ đọc tag người chơi | 0 vi phạm; 3 injection bị từ chối | đúng | **PASS** | T03, test 52, `visibilityViolations`, `stateBefore()` |
| T04 | 36 run × 21 seg | escaped∧caught, raid∧transfer, deal với Mai cách ly, scapegoat∧present, 2 ending, mâu thuẫn ≥ OBSERVED của 3 cặp decoy/real | 0 | 0 (mâu thuẫn mức RUMOR: được phép, F-18) | **PASS** | T04 |
| T05 | 36 run + unit | ≥ OBSERVED khớp truth; rank không giảm; `apply` từ chối OBSERVED sai; relay `arriveAs:'CONFIRMED'` bị bắt | đúng | đúng | **PASS** | T05, evaluator.mjs `apply` dòng `throw` |
| T06 | truth frozen; 3 scenario chạy 2 lần | Ghi truth; so background mutation 36 run; so mutationLog | throw; giống nhau; byte-identical; không `random` | đúng | **PASS** | T06, `deepFreeze` |
| T07 | 36 run | Mọi `schedule` → event bắn hoặc ghi `scheduled-skipped`; once; liveness | Không mất; chỉ `PR_LINH_DOUBLE_AGENT_FEED`, `R_LINH_PULLED_OUT` không bắn | đúng | **PASS** (liveness có 1 rule chết động — F-01) | T07, trace §5 |
| T08 | 36 run | Mọi chuyển tiếp `phone.location` ∈ bảng tác nhân cho phép; action di chuyển phải reads/touches; tiêm `A_LINH_STEAL` | 0 vi phạm; ≥7 chuyển tiếp; injection bị bắt | 0; 7; bắt | **PASS** | T08, trace §2 |
| T09 | 36 run + 8 action | Scapegoat/shield/hand-up có lý do; không action tin X rồi khẳng định ¬X | 0 | 0 | **PASS** | T09 |
| T10 | repo | 5 NPC, 4 ending, 49 event/131 choice, 25 flag ≤ 40, ≤ 21 luật, 0 dependency, không node_modules, engine dir = {types.ts, evaluator.mjs}, không UI, không location system, trigger ∈ 3 loại | đúng | đúng | **PASS** | T10 |

Test bổ sung: 12 SCENARIO (mục 6), GATE F động (4 ending × 2 vai đều có run đạt; **4/8 witness path không tự đủ** — F-19, liệt kê trong test), CF-6/7/8 (sensitivity, cả ba **khẳng định đổi kết quả** khi đổi tham số), ZP (zero-player 2 vai × 2 policy chạy trọn, chuỗi NPC tự vận hành), F-01 ceiling (trần trust.vu = 1), 10 static intents, 21 Phase 2.

**Kết quả thật, không bịa:** TAP đầy đủ ở trace §6 (59 dòng `ok`, `# fail 0`).

---

## 8. Gate G compliance

| Mục | Yêu cầu | Bằng chứng | Verdict |
|---|---|---|---|
| **A4** Q1–Q7 theo cột "Đề xuất" | Q1 giữ nhánh `role` · Q2 thêm `order` · Q3 evaluator · Q4 giữ ngưỡng · Q5/Q6 giữ · Q7 đồng ý | Q1: 6 toán tử `role` trong 5 action mới (A_THACH_RAID, A_VU_SHIELD ×2, A_VU_SEES, A_MAI, A_THACH_RECRUIT) — chưa có điều kiện nào phải *nhân đôi* theo vai → chưa cần `defaults.json` · Q2: `GameEvent.order?` thêm vào types.ts:§7, **chưa content nào dùng** (F-05 vẫn mở) · Q3: xong · Q4–Q7: không chạm | **PASS** (Q2 mới ở mức type) |
| **A7** danh sách từ cấm | Lexical check đủ cho Gate G? Danh sách chưa được PO duyệt | Test 20 (6 regex, timeline+truth) + test 59 (cùng 6 regex trên intents + 19 regex địa danh/tổ chức thật cho D9). Danh sách vẫn do tác giả đặt | **PASS lexical / UNKNOWN phê duyệt danh sách** |
| **A8 / D9** danh tính hư cấu | Không tên thật, vụ án thật, địa danh thật | Test 59 quét 7 file content + docs/01–02 với 19 pattern (Campuchia, Myanmar, Myawaddy, Sihanoukville, KK Park, Bavet, Tam Thái Tử, Tam giác vàng, Philippines, Lào, Thái Lan, Dubai, Interpol, Bộ Công an…): 0 hit. Tên nhân vật là tên riêng Việt phổ thông (Thạch, Vũ, Mai, Linh, Đức), khu "Thiên Hòa" hư cấu | **PASS** (bằng danh sách hữu hạn; không chứng minh phủ định toàn phần) |
| Prohibited terminology (nội dung Phase 3) | Không mô tả thao tác lừa đảo/truy cập trái phép | 8 action description + 8 drive + 1 exception: chỉ mô tả *ai làm gì với ai*; điện thoại là `flag`, không có "mở khóa/đọc/sao chép" | **PASS** |
| Scope compliance | Không G8, không UI, không mở rộng | T10 | **PASS** |
| Architectural invariants | 1 entry point, truth tách GameState, không toán tử `fact`, NPC không toàn tri | `apply()` duy nhất ghi state; `deepFreeze(truth)`; `evaluate` không có case `fact`; T01/T03 | **PASS** |
| Required evidence | file:dòng / test id cho mọi claim | mục 1–7 | **PASS** |

**Không gate nào được đánh PASS mà không có test hoặc dòng code dẫn chứng; hai mục có thành phần UNKNOWN được ghi rõ.**

---

## 9. Hạn chế đã biết & câu hỏi mở

### 9.1 CRITICAL (ảnh hưởng tới điều Phase 3 được yêu cầu chứng minh)

| # | Phát hiện | Bằng chứng | Hệ quả | Cần ai |
|---|---|---|---|---|
| C1 | **F-01 vẫn còn:** trần trust.vu Captive trước seg 14 = 1 → `A_VU_SHIELD_PHONE` không bao giờ bắn cho Captive; hàng 3 docs/04 §3.4 không đạt được; `PR_LINH_DOUBLE_AGENT_FEED` chết | test "F-01 ceiling", S3_VU_TRUST, trace §5 | Nửa drive PROTECT_DUC của Vũ chỉ sống ở vai Operator | PO: duyệt sửa content theo audit B1 |
| C2 | **Mai không thể hành động:** cuộc khám xét D3 chiều là canonical nhưng không phải `BackgroundOccurrence` → không NPC nào quan sát được → Mai không có hạt giống suy luận hợp lệ | S7_MAI_NEVER_ACTS; `reachableFacts(mai)` không chứa HIDDEN_DORM_CEILING | Hàng 6 docs/04 (minh họa emergence mạnh nhất) **NOT IMPLEMENTED** | PO: duyệt thêm `BG_D3A_SEARCH` (content Phase 2) |
| C3 | **docs/04 hàng 5 dựa trên luật không tồn tại** ("Linh báo tên Đức khi người chơi kể") — `T_C_TOLD_LINH_ABOUT_DUC` không có PR nào relay | S5_TELL_LINH | Tài liệu đề xuất hứa một nhánh không có | PO: thêm PR hoặc sửa docs/04 |
| C4 | **Hành vi đổi so với Phase 2 khi cùng lựa chọn** (có chủ đích theo P1, nhưng phải được PO nhìn thấy): (a) run thụ động không còn quy Đức → `EV_S_D5A_DUC_TAKEN` hiếm hơn; (b) Mai vẫn tới dù bị `point_mai`; (c) Đức có thể tự gọi | trace §1 dòng "Khác biệt Phase 2 → Phase 3" | Không gian kết cục dịch chuyển | PO xác nhận |

### 9.2 Giả định chờ phê chuẩn (không sửa thầm)

`ENGINE_ORDERING`: stat khởi điểm 0/0 (F-09) · clamp per-mutation (F-08) · equal-rank no-op, relay acquiredAt = arrival (F-11) · scheduled queue order (O12) · propagation file order (O13) · `defaultChoice` cho zero-player = policy của test, chưa có trong content (F-12).

### 9.3 Lỗi content Phase 2 vẫn mở (đo được, chưa sửa)

F-02 (stress ≥ 60 không đạt tại seg 7), F-05a/b (`hand_over`, `name_duc` chết — `order` đã có ở type, chưa áp vào content), F-06 (`linh`, `mai` hấp thụ), F-13, F-14, F-17 (`misinformation:false`), F-19 (4/8 witness path không tự đủ — danh sách chính xác trong test GATE F), F-23.

### 9.4 Hạn chế của chính Phase 3

- `types.ts` chưa type-check (A1); `evaluator.mjs` không được kiểm bằng TS (A2) — reviewer có tsc xin chạy `tsc --strict --noEmit src/engine/types.ts`.
- Corpus = 12 scenario + 8 witness + 4 zero-player, **không** phải BFS toàn không gian; "0 vi phạm" = 0 trên corpus. Reviewer được mời thêm scenario (`tests/corpus.mjs`).
- Projection narrative (Sổ ghi nhớ, epilogue) và `PlayerVisibleBelief` (F-03) **NOT IMPLEMENTED** — F-03 vẫn là rủi ro ở Phase 5.
- `once:false` cho action được cho phép ở type nhưng chưa có content, chưa có test cooldown.
- Resolution (`effects`) được đọc `touches` là một **lỗ hổng có kiểm soát** của visibility contract; reviewer logic nên thử lạm dụng nó.

### 9.5 Câu hỏi mở cho PO

| # | Câu hỏi |
|---|---|
| O1 | Chấp nhận C4(a): run thụ động không còn quy Đức? (Thiết kế nói "không ai nếu chỉ biết chỗ".) |
| O2 | Duyệt thêm `BG_D3A_SEARCH` + action `A_MAI_SEARCH_DORM` (C2)? Đây là content Phase 2 → cần quyết định riêng. |
| O3 | Phê chuẩn 6 giả định `ENGINE_ORDERING` hay chọn khác? |
| O4 | Có cho Phase 3b sửa content theo blocker B1–B6 của audit (F-01, F-02, F-05, F-08, F-09, F-12) trước review Opus/ChatGPT, hay review trên content hiện tại? |
| O5 | Duyệt danh sách từ cấm (A7) và danh sách địa danh D9 (test 59)? |

---

## 10. Diff summary (workspace không phải git repo → so checksum)

So với manifest Phase 2 (`docs/phase2-checksums.txt`, 15 file), chạy `sha256sum -c docs/phase2-checksums.txt` sau Phase 3:

| File | Kết quả | Thay đổi |
|---|---|---|
| `docs/01…05*.md`, `content/truth.json`, `content/npcs.json`, `content/timeline.json`, `content/rules.delayed.json`, `content/endings.json`, `tests/consistency.test.mjs` | **OK** (không đổi) | — |
| `src/engine/types.ts` | FAILED (đổi) | +85 dòng, chỉ thêm (xem mục 1); 1 comment sửa `~14`→`16` operators |
| `content/flags.json` | FAILED (đổi) | +`visibleTo/visibleByValue/terminal` trên 24 flag; +1 flag `vu.shieldingPhone`; `_doc` |
| `README.md`, `package.json` | FAILED (đổi) | trạng thái Phase 3; version 0.3.0; script `trace` |

File mới: `src/engine/evaluator.mjs`, `content/npc.intents.json`, `tests/intents.test.mjs`, `tests/evaluator.test.mjs`, `tests/corpus.mjs`, `tests/static-checks.mjs`, `scripts/trace.mjs`, `docs/06-phase3-review-package.md`, `docs/06-phase3-phone-scenario-trace.md`, `docs/reviews/phase3-opus-architecture.md`, `docs/reviews/phase3-chatgpt-logic.md`, `docs/phase3-checksums.txt`.

Manifest mới: `docs/phase3-checksums.txt` (toàn bộ repo trừ file sinh ra có timestamp — trace doc có ngày cố định nên được đưa vào).

---

## FINAL

```
PHASE 3 STATUS:        DELIVERED within authorized boundary; STOPPED awaiting independent review + PO decisions O1–O5
EVALUATOR:             IMPLEMENTED (src/engine/evaluator.mjs, test-only, 325 lines, 0 deps); verified by 28 dynamic tests;
                       baseline mode reproduces the independent audit's harness results (S1/S2/CF-1..5/CF-10)
PHONE SCENARIO:        IMPLEMENTED as simulation test (12 scenarios, 2 roles, 2 modes); 4/6 docs/04 rows reproduced,
                       1 row FAILS vs doc (F-01), 1 row NOT IMPLEMENTED (Mai needs BG_D3A_SEARCH), 1 new emergent outcome (Đức calls)
TEST RESULTS:          59 pass / 0 fail (T01–T10 all PASS; 21 Phase 2 static; 10 Phase 3 static; 28 dynamic)
GATE G:                PASS with 2 UNKNOWN components (A7 banned-list approval; D9 proven only against a finite list)
CRITICAL FINDINGS:     C1 F-01 trust.vu ceiling (Vũ never shields for Captive) · C2 Mai cannot act (no legal observation seed)
                       · C3 docs/04 row 5 relies on a non-existent rule · C4 behaviour shifts vs Phase 2 need PO sign-off
OPEN QUESTIONS:        O1–O5 (§9.5) + ENGINE_ORDERING assumptions (§9.2) + Phase 2 content bugs still open (§9.3)
REVIEW ARTIFACTS:      docs/06-phase3-review-package.md · docs/06-phase3-phone-scenario-trace.md ·
                       docs/reviews/phase3-opus-architecture.md · docs/reviews/phase3-chatgpt-logic.md · docs/phase3-checksums.txt
READY FOR INDEPENDENT REVIEW: YES  (no reviewer feedback has been received; nothing here claims an independent review occurred)
```
