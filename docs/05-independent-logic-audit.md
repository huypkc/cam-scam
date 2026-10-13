# THE COMPOUND — PHASE 2 INDEPENDENT LOGIC AUDIT

Ngày: 2026-10-12 · Người lập: Claude Fable · Người nhận: ChatGPT/GPT-6 (independent verifier) · PO: Huypkc
Phạm vi: **chỉ kiến trúc + content Phase 2 hiện có.** Không sửa code/content/test, không cài gì, không bắt đầu Phase 3.
Tiền đề đã xác minh trước khi audit: `sha256sum -c docs/phase2-checksums.txt` → 15/15 OK · `node --test tests/*.test.mjs` → 21 pass / 0 fail (Node v22.23.3, chạy lại trong phiên audit này).

> Lưu ý đánh số: `docs/05-doc-consistency-report.md` đã tồn tại với cùng tiền tố `05`. File này được tạo đúng tên PO yêu cầu; không đổi tên file cũ. PO quyết định có đổi số sau.

---

## 0. Kết luận trước (executive summary)

Kiến trúc Phase 2 **nhất quán về mặt tĩnh** (21 test pass) nhưng **có 3 lỗ hổng động mà test tĩnh không nhìn thấy**, trong đó 2 lỗ làm thu hẹp không gian ending và vertical slice:

1. **F-01 (HIGH)** — Vai Captive không bao giờ đạt `trust.vu ≥ 2` trước segment 14 (trần tĩnh = 1). Kéo theo: `EV_C_D5N_VU_TALK` chết → `escape.vuWillOpen` chết → **Captive không bao giờ trốn được cùng Đức** → `turn` trong `EV_C_D6A_LINH_TRUTH` chết → `linh.doubleAgent`, `PR_LINH_DOUBLE_AGENT_FEED` chết → 4 fact khai `confirmableBy: captive` thực tế Captive không bao giờ CONFIRMED được. Gate B pass tĩnh, **vi phạm động**.
2. **F-02 (HIGH)** — Observation misinformation duy nhất của vertical slice (`EV_C_D3A_SEARCH`, `when stress ≥ 60`) **không bao giờ kích hoạt**: STRESS tối đa đạt được tại đầu segment 7 là 50. Gate E pass tĩnh, **vi phạm động**.
3. **F-03 (HIGH, leakage)** — `classifyBelief()` được ghi chú "used by UI" nhưng cần `WorldTruth` để tính; nếu UI gọi nó, người chơi biết RUMOR nào là MISINFORMATION → rò WorldTruth qua tầng trình bày.

Ngoài ra có 2 lỗi thứ tự thực thi làm **2 choice chết** (F-05), 1 rule chết (F-07), 3 trạng thái `phone.location` hấp thụ không có phản ứng NPC (F-06), 2 mâu thuẫn đặc tả ảnh hưởng replay (F-08 clamp, F-09 stat khởi điểm), và chính sách "zero-player" chưa định nghĩa (F-12).

**Bốn ending đều tới được trong 7 ngày cho cả hai vai** (đã chạy qua harness audit — mục 6), nhưng witness path trong `endings.json` thiếu chỉ định cho forced event nên 3/8 path **không tự đủ** (F-19).

Đề nghị: **không phê duyệt kiến trúc Phase 2 cho đến khi F-01, F-02, F-03, F-05 được xử lý** (mục 10). Các sửa đều là content/spec, không phải refactor.

---

## 1. Phương pháp & chuẩn bằng chứng

| Nhãn | Nghĩa trong tài liệu này |
|---|---|
| **VERIFIED** | Đọc trực tiếp file + dòng; hoặc chạy test/harness trong phiên này và quan sát kết quả. |
| **INFERRED** | Suy ra từ đặc tả (docs/02 §4, types.ts) bằng lập luận, chưa có engine để chạy. |
| **UNTESTED** | Không thể kiểm tra trong Phase 2 (cần engine thật / tsc / UI). |

**Harness audit (không phải engine, không nằm trong deliverable).** Để kiểm tra reachability động, tôi viết một evaluator ~170 dòng Python trong thư mục scratch của phiên (không đưa vào `/root/working`, để tuân thủ "no implementation"). Nó đọc đúng 6 file JSON và thực thi **theo nghĩa đen** docs/02 §4. Mọi điểm đặc tả mơ hồ được chốt bằng giả định liệt kê ở **Phụ lục A**. Kết quả harness được nhãn **VERIFIED (harness)**; nếu Phase 3 viết reference evaluator với giả định khác, các con số có thể lệch nhưng các kết luận "chết/không tới được" ở F-01, F-02, F-05, F-07 **còn đúng bằng liệt kê tĩnh** (được ghi kèm).

Mọi tham chiếu dòng là `file:Lstart–Lend` theo file hiện tại (checksum ở trên).

---

## 2. Đối chiếu TypeScript interface ↔ JSON content (yêu cầu 1)

Đã đối chiếu thủ công toàn bộ 6 file content với `src/engine/types.ts` (không có tsc; A1/A2 của checkpoint vẫn UNTESTED).

| # | Kết quả | Bằng chứng | Nhãn |
|---|---|---|---|
| 2.1 | Mọi `op` trong content ∈ 16 toán tử Condition; mọi `type` ∈ 12 AtomicConsequence + `if`. | Harness ném exception với op/type lạ; 0 exception trên toàn bộ content khi chạy 20+ kịch bản. | VERIFIED (harness) |
| 2.2 | `PR_LINH_DOUBLE_AGENT_FEED.misinformation = false` vi phạm kiểu `misinformation?: true`. | `content/npcs.json:485` vs `src/engine/types.ts:370` | VERIFIED |
| 2.3 | `PlayerState.stress/suspicion` không có giá trị khởi điểm ở bất kỳ đâu (types.ts, flags.json, docs/02). docs/04 §3.2 ngầm giả định 0. | `src/engine/types.ts:428–434`; `content/flags.json` không có mục stat | VERIFIED (vắng mặt) → **F-09** |
| 2.4 | `Fact.confirmableBy` được Test 13 ép khớp **tĩnh** với grant CONFIRMED; không ép **động** (grant nằm trong event không tới được vẫn đếm). | `tests/consistency.test.mjs:268–281` | VERIFIED → nền của F-01 |
| 2.5 | `Observation.when` được đánh giá **trước** choice (docs/02 §4 bước 2: "forced events → observations → player chọn"). Content có 1 chỗ observation đọc flag mà choice cùng event ghi (`EV_S_D7M_RAID`). | `docs/02-phase2-architecture.md:93`; `content/timeline.json:5952–5980` vs `6098–6126` | VERIFIED → **F-13** |
| 2.6 | `types.ts:187` comment "~14 operators" (thực tế 16) — đã ghi nhận ở docs/05 cũ, không sửa. | — | VERIFIED (đã biết) |
| 2.7 | `BackgroundOccurrence.effects` chỉ chứa 4 type cho phép; không grant player. | Test 8 pass; đọc `timeline.json:5–219` | VERIFIED |
| 2.8 | `DelayedRule.reads` khớp chính xác condition (Test 16). Nhưng `reads` **không** liệt kê `stat`/`trust`/`npcStatus`/`eventFired` mà condition đọc (vd. `R_SUSPICION_SWEEP` đọc SUSPICION, `R_DUC_CONFIDES_LATE` đọc `eventFired`). Tài liệu causal chain thiếu 4 loại seed. | `content/rules.delayed.json:8, 29–35`; `tests/consistency.test.mjs:323–331` | VERIFIED (thiếu sót tài liệu, LOW) |

---

## 3. Rò rỉ thông tin giữa WorldTruth / NPC belief / player knowledge / world state (yêu cầu 2)

Nguyên tắc đã kiểm: **không có toán tử `fact`** (types.ts:210–211) → content không đọc WorldTruth. VERIFIED. Các kênh rò rỉ còn lại nằm ở **engine/UI interface** và ở **grant có rank cao hơn đường truy vết cho phép**.

### F-03 — `classifyBelief()` và `DialogueRequest` rò WorldTruth qua tầng trình bày · **HIGH** · VERIFIED
- **File/dòng:** `src/engine/types.ts:139–147` (comment: "Derived classification used by UI and tests"), `:508–517` (`DialogueRequest.playerBeliefs: Belief[]`).
- **Hiện trạng:** `classifyBelief(b, truth)` trả `MISINFORMATION` khi RUMOR ≠ truth. Nếu bất kỳ UI/epilogue nào gọi nó khi game chưa kết thúc, người chơi biết rumor nào sai mà không cần CONFIRMED. `Belief.cause` (CausalOrigin) kèm `propagation{from,to,ruleId}` cũng lộ tên NPC nguồn và tên rule.
- **Trạng thái tái hiện tối thiểu:** player có `F_VU_FOUND_PHONE_D3: RUMOR(true, self, uncertain)`; UI gọi `classifyBelief` → "MISINFORMATION" → người chơi biết Vũ *không* tìm thấy điện thoại D3 dù chưa có bằng chứng.
- **Kỳ vọng:** UI chỉ thấy `status` + `uncertain`; `classifyBelief` chỉ dùng trong test và epilogue *sau* `endGame`.
- **Điều kiện hỏng:** bất kỳ lệnh gọi `classifyBelief` ngoài test/epilogue.
- **Sửa đề xuất:** đổi comment thành "tests + post-ending epilogue ONLY"; tách `PlayerVisibleBelief = Pick<Belief,'factId'|'status'|'believedValue'|'uncertain'|'acquiredAt'>` và dùng nó trong `DialogueRequest`; thêm test tĩnh cấm import `classifyBelief` từ module UI (Phase 5).

### F-04 — `R_THACH_RAID_CEILING` cấp cho Thạch OBSERVED `F_PHONE_TAKEN_BY_DUC` không có đường truy vết · **MEDIUM** · VERIFIED
- **File/dòng:** `content/rules.delayed.json:57–74`, grant tại `:70`.
- **Hiện trạng:** rule chỉ yêu cầu Thạch tin **chỗ giấu** (`F_PHONE_HIDDEN_DORM_CEILING ≥ RUMOR`, nguồn duy nhất: `PR_LINH_RELAY_LOCATION` — Linh chỉ báo *chỗ*, `_doc` tại `npcs.json:460` nói rõ "not the thief"). Nhưng effect cấp **OBSERVED** (rank 2, luôn đúng truth) cho `F_PHONE_TAKEN_BY_DUC`. Thạch "quan sát" được một việc xảy ra 5 segment trước mà không ai kể.
- **Tái hiện tối thiểu:** run Captive thụ động (mục 7, S1): Thạch chưa có belief nào về Đức → seg 11 rule fire → Thạch OBSERVED Đức lấy điện thoại.
- **Kỳ vọng:** Thạch chỉ được RUMOR(self) "Đức lấy" (suy đoán vì trần ở ký túc Đức) — nhất quán với `F_DUC_IS_THE_LEAK` RUMOR misinformation ngay dòng dưới.
- **Điều kiện hỏng:** bất kỳ condition tương lai nào dùng `npcBelieves thach F_PHONE_TAKEN_BY_DUC minStatus OBSERVED` sẽ đúng mà không có nguyên nhân. Hiện chưa có reader nào ở OBSERVED → chưa gây lỗi gameplay, nhưng vi phạm nguyên tắc #2 của PO.
- **Sửa:** `status: "RUMOR"` tại `:70`. Thêm invariant **T-I3** (mục 8): grant cho NPC với status ≥ OBSERVED từ `source: self` trong DelayedRule phải kèm `_witness: true` attestation hoặc điều kiện NPC có mặt tại location.

### F-10 — Relay lan truyền misinformation không có attestation; Test 7 mù với relay · **MEDIUM** · VERIFIED
- **File/dòng:** `content/npcs.json:557–571` (`PR_THACH_TELLS_VU_SCAPEGOAT` relay `F_DUC_IS_THE_LEAK`, truth = false); `src/engine/types.ts:236` ("misinformation … Required when believedValue != truth"); `tests/consistency.test.mjs:66–69` (chỉ chuyển `assert` thành belief để test, bỏ qua `relay`).
- **Hiện trạng:** Vũ nhận RUMOR(`F_DUC_IS_THE_LEAK` = true, source thach) qua relay. Theo invariant của `apply()` grant này phải có `misinformation: true`, nhưng `PropagationRule.relay` không có trường đó. Engine Phase 5 sẽ phải **hoặc** từ chối grant (chuỗi đứt) **hoặc** tự suy attestation (invariant mất răng).
- **Kỳ vọng:** relay kế thừa attestation từ belief gốc của `from` (nếu belief gốc là misinformation thì bản sao cũng là misinformation — "truyền lời dối" khác "bịa").
- **Sửa:** đặc tả `apply()`: relay copy `misinformation` từ belief nguồn; mở rộng Test 7 để duyệt relay bằng fixpoint REACH (`tests/consistency.test.mjs:222–236`) kèm believedValue.

### F-18 — Cặp decoy/real là hai fact độc lập → agent có thể tin cả hai · **LOW** · INFERRED
- Linh khởi điểm RUMOR `F_LINH_RELEASE_DATE_REAL = true` (`npcs.json:243–249`); `EV_C_D6A_LINH_TRUTH/turn` và `EV_O_D5N_LINH_CONTACT/tell_truth` cấp RUMOR `F_LINH_RELEASE_IS_LIE = true` mà không chạm fact kia. Không có liên kết "contradicts" → trạng thái tri thức mâu thuẫn nội tại là hợp lệ với engine. Tương tự `F_SEARCH_IS_ABOUT_STOLEN_PHONE` ↔ `F_SEARCH_IS_LEAK_HUNT`.
- **Sửa (Phase 3 tùy chọn):** `Fact.negates?: FactId`; `apply()` khi cấp ≥ OBSERVED cho A thì cấp cùng rank với `believedValue` đảo cho `negates(A)`.

### Các kênh đã kiểm và **không** rò (VERIFIED)
- Background chỉ chạm NPC/flag (Test 8). Không event nào cấp player CONFIRMED cho decoy = true (Test 2, 7).
- `PR_VU_REPORTS_PHONE` đọc tag/trust của player (`npcs.json:511–543`): hợp lệ vì Vũ được `npcTag T_O_TOLD_VU_HIDE` cùng lúc (`timeline.json:3821–3850`) và trust là quan hệ Vũ→player.
- Rule đọc `phone.location` toàn cục (G3 của docs/04): hiện mọi reader đều là NPC đang vật lý tiếp xúc (Vũ kiểm trần, Thạch lục trần) → chưa rò, nhưng **chưa có test chặn** (xem T-I4).

---

## 4. Thứ tự thực thi event & hành vi phụ thuộc thứ tự (yêu cầu 3)

Lifecycle chuẩn: `docs/02-phase2-architecture.md:88–103` — (1) background → (2) forced theo thứ tự file → (3) scheduled `at==s` → (4) ≤1 optional → (5) ending check → (6a) propagation → (6b) delayed rule theo `priority`, rồi `id` → (6c) clamp → s+1.

### Bảng phụ thuộc thứ tự (toàn bộ các cặp tìm thấy)

| # | Segment | A chạy trước | B đọc kết quả của A | Thứ tự hiện tại | Hệ quả nếu đảo | Nhãn |
|---|---|---|---|---|---|---|
| O1 | 8 | `PR_LINH_TIP_CAPTIVE` (6a) ghi `thach.hasCaptiveTip` | `R_INTERROGATION_D4` (6b, window 8–8) | **đúng** | Thẩm vấn D4 không bao giờ xảy ra trong run Captive (rule chỉ có 1 segment cửa sổ). | VERIFIED (harness S1: rule fire tại 8) |
| O2 | 11–12 | `R_THACH_RAID_CEILING` prio 10 | `R_VU_CEILING_CHECK` prio 20 (cùng đọc `phone.location == dorm_ceiling`) | **đúng** (Thạch thắng nếu biết) | Vũ tìm thấy trước, Thạch không bao giờ lục trần; `EV_S_D5A_DUC_TAKEN` biến mất | VERIFIED (S1, S6c) |
| O3 | 12 | `R_MAI_EXPOSED` prio 5 → `mai: isolated` | `R_MAI_DEAL` prio 30 (`npcStatus mai present`) | **đúng** | Mai vừa bị cách ly vừa tới đề nghị | VERIFIED (đọc) |
| O4 | 17 | `R_EXPOSURE_RAID` prio 1 ghi `raid.scheduled` | `R_TRANSFER_PREP` prio 2, `R_CALLED_UP` prio 3 đọc `raid.scheduled == false` | **đúng** | Cả RAID lẫn LOADING_PREP cùng lên lịch seg 18 → hai ending EXPOSURE/TRANSFER chồng nhau | VERIFIED (S2 EXPOSURE: chỉ RAID; S2 INVERSION-op: chỉ PREP+CALLED_UP) |
| O5 | 17 | `R_CALLED_UP` prio **3** đọc `operator.marked` | `R_OPERATOR_MARKED` prio **40** ghi `operator.marked` | **đảo ngược** (reader chạy trước writer) | Operator vượt 90 đúng tại seg 17 → marked nhưng **không** bị gọi lên D7. Hiện **không tới được** vì event duy nhất tại 17 là ESCAPE và nhánh `else` của nó tự set `operator.marked` (`timeline.json:5837–5850`) → tiềm ẩn | VERIFIED (đọc) → **F-14 LOW** |
| O6 | 11→12 | `R_THACH_RAID_CEILING` (6b seg 11) ghi `duc.scapegoated` | `PR_THACH_TELLS_VU_SCAPEGOAT` relay delay 0 (6a) | Vũ biết ở **seg 12**, trễ 1 segment do 6a trước 6b | Vô hại; nhưng `delay: 0` trong content không có nghĩa "cùng segment" — docs cần nói rõ | VERIFIED (S1 props) |
| O7 | 10 | `EV_C_D4A_LINH_OFFER` (**forced**, bước 2) có choice `hand_over` avail `phone.location == player` | `EV_C_D4A_PHONE_DECISION` (**optional**, bước 4) là nơi duy nhất đặt `player` trước seg 13 | **ngược với ý đồ** (docs/02 §5 dòng 116 liệt kê "quyết định với điện thoại · Linh đề nghị giữ hộ" theo thứ tự ngược) | `hand_over` **chết** | VERIFIED (S6e: harness FALLBACK) → **F-05a** |
| O8 | 9 | `EV_O_D4M_THACH_NAME` (**forced**) choice `name_duc` avail `playerBelief F_PHONE_TAKEN_BY_DUC ≥ RUMOR` | `EV_O_D4M_VERIFY_TIP` (**scheduled** at 9, bước 3) là nơi cấp RUMOR đó (`timeline.json:2541–2560`) | ngược | Đường "kiểm tra sổ ra vào → đưa tên Đức" **chết** cùng buổi sáng; `name_duc` chỉ khả dụng nếu đã tin Đức từ trước (ép Đức D4 chiều > 9, hay chưa có nguồn nào khác ≤ 8 ngoài `verify`? — kiểm: `F_PHONE_TAKEN_BY_DUC` cho Operator ≤ seg 9 chỉ qua `EV_O_D4M_VERIFY_TIP`) → `name_duc` **chết hoàn toàn** | VERIFIED (S6h: FALLBACK; grep grant) → **F-05b** |
| O9 | 9 | `BG_D4M_QUOTA_RAISED` (+10 stress) → `EV_S_QUOTA_SHIFT` (forced, ±suspicion) → `EV_C_D4M_INTERROGATION` (scheduled) | nhánh `silent`: `if suspicion ≥ 80 → isolated` | file order | `sabotage` (+20) trước thẩm vấn có thể đẩy qua 80 | INFERRED |
| O10 | 7 | `EV_C_D3A_SEARCH` rồi `EV_C_D3A_LINH_WHISPER` (cùng forced, file order L1590 < L1900) | không có phụ thuộc dữ liệu | — | Chỉ narrative; Q2 (`order` field) vẫn nên thêm | VERIFIED |
| O11 | 18 | Observation của `EV_S_D7M_RAID` đọc `operator.cooperationProof` **trước** choice `o_surrender` ghi nó | — | bước 2 (obs) trước choice | Operator giữ bản sao sổ nợ, bước ra đầu thú: nhận **cả** `T_W_DETAINED_AS_PERPETRATOR` **lẫn** `T_O_SURRENDERED_WITH_EVIDENCE` + `cooperationProof = true` → epilogue mâu thuẫn | INFERRED (đặc tả) → **F-13 LOW-MED** |
| O12 | 13 | Hai scheduled cùng `at: 13` (`EV_S_D5A_PHONE_FOUND_BY_VU` do rule prio 20, `EV_O_D5A_MAI_DEAL` do rule prio 30) | `to_mai` (optional PHONE_CONTENTS) đọc `mai.dealActive` | queue order = thứ tự rule fire (20 < 30) | Không ảnh hưởng vì reader là optional (bước 4). Nhưng **thứ tự queue không được đặc tả** | VERIFIED (đọc) |
| O13 | 6a | Thứ tự giữa các PropagationRule trong cùng convergence **không đặc tả** (file order?) | `PR_DUC_CONFIDES_LINH` (delay 0) rồi `PR_LINH_RELAY_LOCATION` (delay 1) | delay 1 che được | Nếu Phase 3 đặt delay 0 cho Linh→Thạch (docs/04 §3.4 gợi ý "cân bằng bằng delay") thì kết quả phụ thuộc file order | INFERRED → cần đặc tả (T-O2) |

### F-05 — Hai choice chết vì thứ tự forced/scheduled/optional · **MEDIUM** · VERIFIED
- **F-05a** `content/timeline.json:2950–2975` (`hand_over`): forced LINH_OFFER chạy trước optional PHONE_DECISION. Không có path nào đặt `phone.location = player` trước seg 10. → choice chết; đồng thời `phone.location = "linh"` không có reader nào (F-06).
- **F-05b** `content/timeline.json:2643–2690` (`name_duc`): Operator chỉ có thể tin `F_PHONE_TAKEN_BY_DUC` ≤ seg 9 qua `EV_O_D4M_VERIFY_TIP` (scheduled, chạy sau forced THACH_NAME). → choice chết. Hệ quả: nhánh "Operator chủ động đổ tội Đức ngày 4 sáng" — một trong các mầm kịch tính của ĐẢO VAI/CHUYỂN GIAO — không tồn tại. `st.duc := isolated` tại `:2680` do đó không bao giờ chạy từ event này.
- **Sửa:** (a) đổi `EV_C_D4A_LINH_OFFER.at` sang `{day:4, segment:'night'}` hoặc đổi `trigger` của PHONE_DECISION thành `forced` với `preconditions` hiện có; (b) đổi lifecycle thành **scheduled trước forced** (scheduled là hệ quả của quá khứ, nên xảy ra trước), **hoặc** thêm `order` tường minh (Q2) và đặt THACH_NAME `order: 99`. Khuyến nghị (b)-`order` vì giải cả O9/O10.

---

## 5. Intent NPC đồng thời & tài nguyên tranh chấp `phone.location` (yêu cầu 4)

### 5.1 Toàn bộ writer của `phone.location` (VERIFIED bằng grep + harness)

| Seg | Writer | Điều kiện | → giá trị | Loại |
|---|---|---|---|---|
| 6 | `BG_D3M_THEFT` (`timeline.json:94–189`) | luôn | `dorm_ceiling` | canonical |
| 10 | `EV_C_D4A_PHONE_DECISION/move_yard` `:2838` | C, tin chỗ ≥ OBSERVED, Đức present | `yard_cache` | player |
| 10 | `…/take` `:2876` | như trên | `player` | player |
| 10 | `EV_C_D4A_LINH_OFFER/hand_over` `:2950` | `== player` | `linh` | **chết (F-05a)** |
| 2–17 | `R_SUSPICION_SWEEP` prio 0 (`rules:5–16`) | SUSP ≥ 40 & `== player` | `thach` | tổ chức |
| 11–12 | `R_THACH_RAID_CEILING` prio 10 (`rules:57–74`) | Thạch tin chỗ & `== dorm_ceiling` & Đức present | `thach` | Thạch |
| 9–12 | `R_THACH_RECOVERS_PHONE_QUIET` prio 11 (`rules:76–85`) | như trên nhưng Đức **không** present | `thach` | **chết (F-07)** |
| 12 | `R_VU_CEILING_CHECK` prio 20 (`rules:87–99`) | `== dorm_ceiling` | `vu_locker` | Vũ |
| 13 | `EV_S_D5A_PHONE_FOUND_BY_VU/o_take` `:3732` | O, Vũ cho xem (trust.vu ≥ 1) | `player` | player |
| 13 | `…/o_report` `:3778` | như trên | `thach` | player |
| 13 | `EV_C_D5A_PHONE_CONTENTS` observation `:4323+` | `yard_cache` & đã giúp chuyển | `player` | player |
| 13 | `EV_O_D5A_PHONE_CONTENTS/to_thach|to_mai|destroy` `:4621/4674/4711` | `== player` (+`mai.dealActive` cho to_mai) | `thach`/`mai`/`destroyed` | player |
| 14 | `PR_VU_REPORTS_PHONE` (`npcs.json:495–555`) | `== vu_locker` & không bị O bảo giữ & không (C & trust.vu ≥ 2) | `thach` | Vũ |

### 5.2 Phân tích tranh chấp

- **Chỉ có hai "ý định" NPC thật sự cạnh tranh:** Thạch (RAID, seg 11–12) và Vũ (CEILING_CHECK, seg 12). Trọng tài là `priority` (10 < 20) → Thạch luôn thắng khi biết chỗ. Deterministic. Không có RNG. VERIFIED (S1: Thạch thắng tại 11; S6c sau `warn_linh`: Vũ thắng tại 12).
- **Mai không có intent nào** trên tài nguyên của chính cô (đã nêu ở docs/04 G1; không lặp lại).
- **Vũ sau `o_hide`:** `vu_locker` không còn writer nào → trạng thái hấp thụ; Operator đã "giữ im" thì không còn cách lấy/đưa điện thoại cho Mai (vì `to_mai` yêu cầu `== player`). VERIFIED (scen2 A/o_hide: không còn write sau 12).
- **Ba trạng thái hấp thụ không có reader (F-06):** `linh`, `mai`, `destroyed` + `vu_locker`-sau-o_hide. `destroyed` là chủ ý. `mai` là kết quả của `to_mai` nhưng không rule nào cho Mai *dùng* nó (evidence.outside được set ngay trong choice → chấp nhận được). `linh` không tới được (F-05a) nhưng nếu sửa F-05a mà không thêm rule "Linh nộp Thạch" thì **đưa điện thoại cho tai mắt của Thạch là lựa chọn không có giá** — vi phạm GDD "mọi lựa chọn đều có giá".
- **Idempotency của tranh chấp:** mọi writer NPC là `once` → sau khi Thạch có điện thoại, không rule nào lấy lại. `R_SUSPICION_SWEEP` once → Operator `o_take` ở seg 13 với SUSP ≥ 40 **mất ngay tại convergence 13** (scen2 A/o_take: write `thach` do SWEEP tại 13) nhưng vẫn kịp `send_out` trong bước 4 → đúng ý đồ "đọc rồi mất".

### F-07 — `R_THACH_RECOVERS_PHONE_QUIET` không bao giờ fire · **MEDIUM** · VERIFIED (liệt kê)
- Cần đồng thời: Thạch tin chỗ (nguồn ≤ 12 duy nhất: `PR_LINH_RELAY_LOCATION`, cần `PR_DUC_CONFIDES_LINH` fire tại s₀ ≥ 10 với Đức **present**, Thạch biết tại s₀+1 ≥ 11), `phone == dorm_ceiling`, Đức **không** present tại s₀+1 ∈ {11, 12}. Không có writer nào đổi `npcStatus duc` trong (s₀, s₀+1] ngoài chính `R_THACH_RAID_CEILING` (prio 10 chạy trước, và nó đã chuyển điện thoại đi). `name_duc` (seg 9) cách ly Đức **trước** s₀ → confide không xảy ra. → tập điều kiện rỗng.
- **Sửa:** xóa rule, hoặc đổi thành nguồn tri thức khác (Đức bị ép khai ở `EV_O_D4A_DUC_QUESTIONED/pressure` cấp **Thạch** chứ không chỉ player — hiện `:3180+` chỉ cấp player).

### F-06 — Trạng thái hấp thụ của `phone.location` · **MEDIUM** · VERIFIED
- Reader của `phone.location` (toàn bộ content): `dorm_ceiling`, `player`, `vu_locker`, `yard_cache`. Không reader cho `linh`, `mai`, `thach`, `destroyed`. (`thach`/`destroyed` là kết cục hợp lý.)
- **Sửa:** khai `terminal: true` trong `FlagDefinition.values` cho `thach`, `destroyed`; thêm rule cho `linh` (→ Thạch, delay 1, +SUSPICION) và `mai` (Mai gửi ra ngoài = đã có; thêm `mai.exposed` nếu Vũ "resents" thấy — tùy Phase 3). Test **T-F** (mục 8).

---

## 6. Idempotency của delayed rule & thứ tự convergence (yêu cầu 5)

| # | Kiểm tra | Kết quả | Nhãn |
|---|---|---|---|
| 6.1 | Mọi rule `once: true` | 15/15 (Test 15) | VERIFIED |
| 6.2 | Tie `priority` trong cùng cửa sổ: (30) `R_DUC_CALLED_HOME`[13–14] vs `R_THACH_DEAL_OFFER`[14]; (40) `R_LINH_PULLED_OUT`[16–17] vs `R_OPERATOR_MARKED`[5–17]; (10) không trùng segment | Tie-break theo `id` → `R_DUC_CALLED_HOME` < `R_THACH_DEAL_OFFER`, `R_LINH_PULLED_OUT` < `R_OPERATOR_MARKED`. Hai cặp này **không** đọc/ghi chung biến → thứ tự không ảnh hưởng. | VERIFIED (đọc) |
| 6.3 | Rule đọc biến rule khác ghi cùng convergence | O3, O4, O5 ở mục 4. O5 là inversion tiềm ẩn. | VERIFIED |
| 6.4 | Relay không `once` (`PR_LINH_RELAY_CAPTIVE_TAGS`, `PR_LINH_RELAY_LOCATION`) chạy **mỗi** convergence | Spec `types.ts:344` "arriving as RUMOR … unless `to` already holds higher" — với rank **bằng** (RUMOR→RUMOR) không nói replace hay keep. Nếu replace: `acquiredAt`/`cause` đổi mỗi segment, `mutationLog` phình ~1 mutation/segment/fact, và relay xuôi dòng có `delay` bị trượt mãi. | INFERRED → **F-11 MEDIUM** |
| 6.5 | `acquiredAt` của belief relay: segment đến hay `acquiredAt` gốc? | Không đặc tả. Với content hiện tại hai cách cho cùng kết quả (RAID có `earliest 11` che lệch 1 segment). Với delay khác → khác. | INFERRED → F-11 |
| 6.6 | Clamp: docs/02 `:100` "6c. clamp stat về [0,100]" (chỉ tại convergence) vs `types.ts:495` "`apply` … Validates invariants (… clamps)" (mỗi mutation) | **Mâu thuẫn đặc tả.** Ví dụ tối thiểu: Operator SUSP = 10 tại seg 13 → `to_thach` (−25) → per-mutation: 0; per-convergence: −15 → seg 15 `refuse` (+25) → 25 vs 10. Khác 15 điểm, đủ đổi nhánh `< 70` ở ESCAPE trong trường hợp biên. Harness dùng per-mutation; chạy lại với per-convergence trên 1 kịch bản không lệch (không chạm 0) — chưa dựng được ca lệch bằng harness. | VERIFIED (mâu thuẫn) / INFERRED (tác động) → **F-08 MEDIUM** |
| 6.7 | Stat khởi điểm | Không có (mục 2.3). Toàn bộ ngưỡng 40/60/70/80/90 và kết luận F-01/F-02 giả định 0/0. | VERIFIED (vắng mặt) → **F-09 MEDIUM** |
| 6.8 | `PR_LINH_DOUBLE_AGENT_FEED` `also: thach.hasCaptiveTip := false` tại seg 17 | Reader duy nhất của flag: `R_INTERROGATION_D4` (window 8–8). Fact assert (`F_PHONE_TAKEN_BY_CAPTIVE_PC`) không có reader `npcBelieves` nào. → rule **trơ** ngay cả khi tới được (hiện không tới được vì F-01). | VERIFIED (grep) → **F-15 LOW** |
| 6.9 | `PR_LINH_RELAY_CAPTIVE_TAGS` → tag cho Thạch | Không condition nào dùng `npcKnowsTag` với `npc: thach` (chỉ linh, duc, vu). → **trơ**. Test 6 pass vì relay được tính là "read". | VERIFIED (grep) → **F-16 LOW** |
| 6.10 | `duc.scapegoated = true` khi Đức vẫn `present` (`EV_C_D4M_INTERROGATION/blame_duc` `:2318–2360` không đổi `npcStatus`) trong khi `EV_O_D4M_THACH_NAME/name_duc` thì có | Bất đối xứng không chủ ý; reader duy nhất `PR_THACH_TELLS_VU_SCAPEGOAT`. | VERIFIED → **F-22 LOW** |

---

## 7. Reachability của 4 ending trong 7 ngày (yêu cầu 6) & chồng lấn (yêu cầu 7)

### 7.1 Bảng reachability (harness, giả định Phụ lục A, stat khởi điểm 0/0)

| Ending | Vai | Tĩnh (Test 19) | Động (harness) | Witness path tự đủ? | Ghi chú |
|---|---|---|---|---|---|
| E_ESCAPE | Captive | ✓ | **✓** seg 17 (stress 50, susp 0) | **Không** — bước 4 `EV_C_D6A_DUC_ASK/no` **không fire** trên chính path đó (Đức bị cách ly seg 11 vì path không `warn_linh`); ending vẫn đạt vì `withDuc == false` | VERIFIED (S2) |
| E_ESCAPE | Operator | ✓ | **✓** seg 17 | ✓ (với forced fill-in bất kỳ không hạ `trust.thach` < 1) | VERIFIED (S2) |
| E_EXPOSURE | Captive | ✓ | **✓** seg 18 **chỉ khi** thẩm vấn D4 chọn `blame_linh`/`blame_duc`; với `deny`/`silent` → SUSP 40 → `R_SUSPICION_SWEEP` lấy điện thoại seg 10 → rơi về E_INVERSION/E_TRANSFER | **Không** (path không chỉ định forced event quyết định) | VERIFIED (S3: 4 biến thể) → **F-19** |
| E_EXPOSURE | Operator | ✓ | **✓** seg 18 | ✓ (cần THACH_NAME ≠ `name_mai`) | VERIFIED (S2) |
| E_INVERSION | Captive | ✓ | **✓** seg 20 | ✓ | VERIFIED (S2) |
| E_INVERSION | Operator | ✓ | **✓** seg 20 (marked seg 15, CALLED_UP seg 18) | ✓ | VERIFIED (S2) |
| E_TRANSFER | Captive | ✓ | **✓** chỉ khi **không** nhận deal; với fill-in "first choice" path này cho **E_INVERSION** (quota 5 → deal → accept) | **Không** | VERIFIED (S2) → F-19 |
| E_TRANSFER | Operator | ✓ | **✓** seg 20 | ✓ | VERIFIED (S2) |

**Kết luận yêu cầu 6:** 8/8 (ending × vai) tới được trong 21 segment. Nhưng:

### F-01 — Trần `trust.vu` của Captive = 1 → chuỗi content chết · **HIGH** · VERIFIED (liệt kê tĩnh + harness S5/F)
- **Liệt kê mọi delta `trust.vu` Captive có thể nhận trước seg 14:** `EV_S_D1M_INTAKE/c_protest` −1 (`timeline.json:304`), `EV_C_D3A_SEARCH/volunteer` +1 (`:1754`), `R_DUC_CALLED_HOME` +1 (`rules:114–120`, convergence 13–14, cần `duc.calledHome` ← `EV_C_D5A_PHONE_CONTENTS/duc_call` `:4446`). Mọi delta khác (`:688, 713, 1853, 3239, 3288, 3534, 3556, 3760, 3844, 4046, 4078`) thuộc event Operator-only. `listen` +1 (`:4878`) nằm **bên trong** VU_TALK. Khởi điểm −1 (`npcs.json:88`). **Max tại seg 14 = −1 + 1 + 1 = 1 < 2.**
- **Tái hiện tối thiểu:** Captive, chọn `volunteer` D3 chiều, mọi lựa chọn khác tùy ý → `EV_C_D5N_VU_TALK` (`:4741`, precondition `trust vu ≥ 2` tại `:4751–4756`) không bao giờ khả dụng. Harness greedy-max cho `trust.vu` tại seg 14 = 0 (greedy không đi được nhánh `duc_call`); liệt kê tĩnh cho trần 1.
- **Cascade (mỗi mục VERIFIED bằng grep):**
  1. `escape.vuWillOpen` chỉ được ghi tại `:4836` (trong VU_TALK, cần trust ≥ 3) → chết.
  2. `EV_S_D6N_ESCAPE/go` (`:5775–5850`): Captive với `escape.withDuc = true` cần `vuWillOpen` hoặc `withThach` (Operator-only) → **Captive trốn cùng Đức luôn bị bắt**. Harness F: `yes` → `player.caught`, SUSP 100, isolated. Mâu thuẫn GDD §6.3 (`docs/01:223` "Ra ngoài, có thể cùng/không cùng Đức").
  3. `F_VU_WAS_CAPTIVE` CONFIRMED cho Captive chỉ tại `:4772` (VU_TALK); `F_VU_KNOWS_BLINDSPOT` CONFIRMED tại `:4796` → `truth.json:224–254` khai `confirmableBy: [captive, operator]` **sai động**.
  4. `F_LINH_RELEASE_IS_LIE` cho Captive chỉ tại `:4779` → `EV_C_D6A_LINH_TRUTH/turn` (`:5345`, avail `:5351`) chết → `linh.doubleAgent` (`:5394`) chết → `PR_LINH_DOUBLE_AGENT_FEED` chết → `T_C_TURNED_LINH` chết.
  5. `F_LINH_INFORMANT` và `F_LINH_SAW_DUC_TAKE_PHONE` CONFIRMED cho Captive chỉ tại `:5405/5413` (trong `turn`) → chết → `truth.json:176–209` sai động cho Captive. Tổng: **4 fact** vi phạm Gate B động.
  6. `T_C_LISTENED_VU`, `T_C_ASKED_VU_LOOK_AWAY` (epilogue tags) chết.
  7. `docs/02:136` ("Vũ tự kể D5 CONFIRMED" cho Captive), `:135` ("Vũ gợi ý D5 RUMOR"), `:134` ("Vạch mặt / quay cô ấy D6 CONFIRMED") và `docs/04:122` hàng 3 ("trust Vũ lên 2 qua D4N" — `EV_C_D4N_PATROL2` không có delta trust nào) **sai**.
- **Kỳ vọng:** Captive có ≥ 2 nguồn +trust.vu trước seg 14 không phụ thuộc lẫn nhau, hoặc VU_TALK precondition `≥ 1`.
- **Sửa đề xuất (nhỏ nhất):** hạ precondition VU_TALK xuống `trust vu ≥ 1` **và** thêm `trust.vu +1` vào một choice Captive sớm (vd. `EV_C_D1N_PATROL/sleep` "không nhìn Vũ" hoặc `EV_S_D5A_PHONE_FOUND_BY_VU/c_hide`). Giữ `ask_look_away` ở ≥ 3 nhưng đổi thành ≥ 2 nếu muốn ESCAPE-with-Đức khả thi với 3 bước (volunteer, hide, listen). Sau đó chạy **T-A/T-C** (mục 8).

### F-02 — Observation misinformation của slice không bao giờ fire · **HIGH** · VERIFIED (harness S4 + liệt kê)
- **File/dòng:** `content/timeline.json:1605–1630` (observation `when stress ≥ 60`, grant `F_VU_FOUND_PHONE_D3` RUMOR misinformation `uncertainAboveStress: 0`).
- **Liệt kê delta STRESS dương Captive trước seg 7** (1 forced + ≤1 optional mỗi segment): seg 0 `c_protest` +10; seg 1 `guarded` +5, `share` +5; seg 2 `watch` +5; seg 3 `sabotage` +10; seg 4 `warn`/`encourage` +5; seg 5: 0; seg 6 `sabotage` +10. **Tổng max = 50 < 60.** Harness greedy-max: 50.
- **Hệ quả:** Test 18 (`tests/consistency.test.mjs:354–356`) khẳng định "slice có misleading interpretation" — đúng tĩnh, **sai động**. Mục 6 docs/02 ("Captive: 'Vũ tìm thấy điện thoại ngày 3' chỉ khi STRESS ≥ 60") hứa một thứ không xảy ra. Cơ chế "nhận thức méo" của GDD (`docs/01:65`) không hoạt động trước ngày 4: các `uncertainAboveStress` 40/60 ở seg 1 (`:397`), seg 3 (`:880–905`) đều ngoài tầm (max stress seg 3 = 25) → **F-23 LOW**.
- **Sửa:** hạ ngưỡng xuống 40 (đạt được với protest + guarded + watch + sabotage + warn = 40 tại seg 7 — đúng "biên"), hoặc +stress cho `BG_D3M_THEFT.playerEffects.captive` (+10, hợp lý: không khí căng sau khi Đức tái mặt). Thêm **T-B** để chặn tái diễn.

### 7.2 Chồng lấn / mâu thuẫn ending (yêu cầu 7)

| Cặp | Có thể cùng đúng? | Trọng tài | Kết quả | Nhãn |
|---|---|---|---|---|
| ESCAPE (17) × bất kỳ | Không — game kết thúc tại 17 | checkAt | ✓ | VERIFIED |
| EXPOSURE (18) × INVERSION (20) | Captive nhận deal seg 15 rồi gọi ra ngoài seg 16 → cả hai điều kiện đúng | EXPOSURE check sớm hơn (18) → thắng; priority 2 < 3 cũng nhất quán | ✓ chủ ý | VERIFIED (S3 blame_*: accept deal + call_out → EXPOSURE) |
| EXPOSURE × TRANSFER | `R_EXPOSURE_RAID` ghi `raid.scheduled` trước `R_TRANSFER_PREP` (O4) → loại trừ | priority 1 < 2 | ✓ nhưng **phụ thuộc thứ tự rule, chưa có test** | VERIFIED → T-G |
| INVERSION × TRANSFER | luôn cùng đúng tại 20 | priority 3 < 4 | ✓ chủ ý | VERIFIED |
| INVERSION-Operator "đảo ngược" bằng `blackmail` (`:6214+`, `operator.marked := false`) | marked tại 15–17, gỡ tại 18 → TRANSFER với `o_cab` | — | ✓ chủ ý; nhưng `R_CALLED_UP` chỉ fire nếu marked **trước** 17 convergence (O5) | VERIFIED |
| EXPOSURE checkAt `[18, 20]` | `raid.happened` chỉ ghi tại seg 18 → mục 20 dư thừa | — | vô hại | VERIFIED |
| Test 19 "disjoint triggers" (`tests:368–369`) | chỉ so **tập flag/tag**; không phát hiện chồng lấn ngữ nghĩa (vd. INVERSION∧TRANSFER) | — | Test không bảo vệ điều nó tuyên bố; chồng lấn hiện tại đều có chủ ý | VERIFIED (LOW) |

**Không có mâu thuẫn ending.** Có một **hố**: Captive bị bắt khi trốn (seg 17) → `captive_pc.isolated` → không ending riêng, vẫn lên xe D7 (E_TRANSFER) với epilogue tag `T_ESCAPE_FAILED`. Chấp nhận được theo D3 (4 ending chung).

---

## 8. Replay deterministic (yêu cầu 8)

- **Không có RNG** trong kiến trúc (docs/02 `:103`; A6 của checkpoint). Harness grep: 0 trường `random`/`seed` trong content. → "seed" không có vai trò; replay = f(content, role, chuỗi hành động). VERIFIED.
- **Harness: chạy cùng kịch bản 2 lần → `mutationLog` giống hệt (136 mutation).** VERIFIED (scen2 H) — nhưng đây là tính chất của harness, **không** chứng minh cho engine Phase 5.
- **Các điểm đặc tả còn mở mà engine thật phải chốt để replay đúng (F-21, INFO/MEDIUM):**
  1. Stat khởi điểm (F-09).
  2. Clamp per-mutation vs per-convergence (F-08).
  3. Thứ tự forced trong cùng segment = thứ tự file (Q2); thứ tự scheduled cùng `at` = thứ tự vào queue (O12); thứ tự PropagationRule trong 6a (O13); so sánh `id` khi tie priority — cần codepoint compare, không locale.
  4. Chính sách belief rank bằng nhau (6.4) và `acquiredAt` của relay (6.5).
  5. `GameState` **không có action log**: `firedEvents` không ghi choice; choice chỉ suy ngược từ `mutationLog.cause{kind:'choice'}` (Gate A đảm bảo ≥ 1 mutation/choice nên suy được, nhưng là suy luận). Optional bị bỏ qua không được ghi. → Đề xuất `actionLog: Array<{segment, eventId, choiceId | 'skip'}>` và định nghĩa replay = replay actionLog, so `hash(mutationLog)`.
  6. `meta.contentVersion` chưa định nghĩa cách tính từ 6 file (rủi ro #6 checkpoint) — không có nó, "identical initial state" không kiểm chứng được. Đề xuất: SHA-256 của concatenation 6 file theo thứ tự cố định (chính là `docs/phase2-checksums.txt` dòng content).
  7. `SaveFile.checksum` thuật toán chưa nêu.

---

## 9. Zero-player-intervention (yêu cầu 9)

**Định nghĩa vấn đề:** "Không can thiệp" chỉ xác định được cho **optional** event (bỏ qua). Forced/scheduled event **có choice** chặn đồng hồ cho tới khi có lựa chọn — engine không có `defaultChoice`. → Yêu cầu "thế giới tiếp tục vận động không cần người chơi" (docs/04) **không thực thi được** theo spec hiện tại mà không thêm chính sách mặc định. **F-12 MEDIUM, VERIFIED (vắng mặt).**

**Thí nghiệm (harness, optional bỏ qua, forced = chính sách mặc định):**

| Vai | Chính sách forced | Chuỗi NPC tự chạy (VERIFIED) | Ending |
|---|---|---|---|
| Captive | choice đầu tiên | seg 8 Linh tip (trust 1 < 2) → `R_INTERROGATION_D4` → seg 9 `R_DUC_CONFIDES_LATE` (vì default `cover`) → seg 10 Đức kể Linh → seg 11 Linh báo chỗ → **Thạch lục trần**, Đức isolated → seg 12 Thạch bảo Vũ "Đức là rò rỉ" → seg 14 `R_THACH_DEAL_OFFER` (quota 5) → seg 17 `R_TRANSFER_PREP` → seg 18 Vũ biết chuyển giao | **E_INVERSION** (default `accept`) |
| Captive | choice cuối cùng | tip → thẩm vấn (`silent`, SUSP ≥ 80 → isolated) → raid seg 11 → prep | **E_TRANSFER** |
| Operator | choice đầu tiên | `pass_up` → thẩm vấn người mới (`pressure` → captive isolated) → seg 10 Đức kể Linh → seg 11 raid → seg 15 `accept` Thạch → prep | **E_TRANSFER** (không `go` vì ESCAPE optional) |
| Operator | choice cuối cùng | sabotage ×4 → marked seg 12 → `R_CALLED_UP` seg 17 → `beg` | **E_INVERSION** |

**Kết luận:** NPC **có** chuỗi tự chạy đầy đủ từ seg 6 đến 20 (Linh → Thạch → Vũ) mà không cần player; nhưng (a) kết cục của "zero intervention" **phụ thuộc hoàn toàn vào chính sách default** — cần PO chốt (đề xuất: `defaultChoice` tường minh trong content, hoặc quy ước "choice đầu = thụ động nhất" và test T-L ép mọi choice đầu không mang tag chủ động); (b) Mai và Vũ không có hành vi ngoài 2 rule; (c) trong run Operator, Linh **không bao giờ** báo tin cho Thạch nếu player không chuyển (`PR_LINH_TIP_CAPTIVE` gated `role = captive`) — hợp lý theo Q1 nhưng có nghĩa "thế giới Operator" ít tự trị hơn "thế giới Captive".

---

## 10. Counterfactual test specification — "Chiếc điện thoại tranh chấp" (yêu cầu 10)

**Mục đích:** một bộ test động (cho reference evaluator Phase 3) chứng minh rằng cùng một trạng thái seg 9 cho ra kết quả khác nhau **chỉ** vì ai-biết-gì-lúc-nào và thứ tự convergence, và rằng các kết quả đó **nhạy** với tham số đã nêu.

**Trạng thái gốc S₀ (cuối seg 9, sau convergence), run Captive, stat khởi điểm 0/0:**
`phone.location = dorm_ceiling`; Đức CONFIRMED {EXISTS, TAKEN_BY_DUC, HIDDEN}; Linh CONFIRMED SAW_DUC, RUMOR TAKEN_BY_DUC, OBSERVED(false) TAKEN_BY_CAPTIVE_PC; Thạch CONFIRMED SEARCH_IS_LEAK_HUNT, chưa biết chỗ; Vũ không biết gì về điện thoại; `linh.reportsToThach = true`; `trust = {linh:+1, duc:+3, vu:−1}`; player CONFIRMED HIDDEN (qua `EV_C_D3N_DUC_CONFESSION/keep_secret`); `T_C_COVERED_DUC_SEARCH` đã có; `thach.hasCaptiveTip = true`; thẩm vấn D4 đã diễn ra.
Các lựa chọn đến seg 9 để đạt S₀: `c_sign, open, share, comply, encourage, tell(D2N), comply, cover, tell(D3A), keep_secret, comply, <X>` với X = choice thẩm vấn.

| ID | Biến thể (khác S₀ ở đâu) | Kỳ vọng `phone.location` theo seg 10 → 11 → 12 → 13 → 14 | Rule/PR phải fire (theo thứ tự) | Rule/PR **không được** fire | Nhãn hiện tại |
|---|---|---|---|---|---|
| CF-1 | X = `deny` (SUSP 35) rồi `take` | player → **thach** (SWEEP @10 conv) → thach → thach → thach | `R_SUSPICION_SWEEP`@10 | `PR_DUC_CONFIDES_LINH`, `R_THACH_RAID_CEILING`, `R_VU_CEILING_CHECK` | VERIFIED (S6a: SUSP 40 tại 10) |
| CF-2 | X = `blame_linh` (SUSP 20) rồi `take` | player → player → player → player (đọc, `call_out`) → player | — (không rule nào chạm) | SWEEP, CONFIDES, RAID, VU_CHECK | VERIFIED (S6b) |
| CF-3 | S₀ nhưng D3N chọn `warn_linh` thay `keep_secret`; D4A `leave` | ceiling → ceiling → **vu_locker** (@12) → vu_locker → **thach** (PR_VU @14) | `R_VU_CEILING_CHECK`@12, `PR_VU_REPORTS_PHONE`@14 | CONFIDES (Đức được cảnh báo), RAID | VERIFIED (S6c) |
| CF-4 | D4A `leave` (không warn) | ceiling → **thach** (@11) → thach → … ; Đức isolated @11; `EV_S_D5A_DUC_TAKEN`@13 | `PR_DUC_CONFIDES_LINH`@10, `PR_LINH_RELAY_LOCATION`@11, `R_THACH_RAID_CEILING`@11, `PR_THACH_TELLS_VU_SCAPEGOAT`@12 | VU_CHECK | VERIFIED (S1) |
| CF-5 | D4A `move_yard` | yard_cache → yard → yard → **player** (obs @13) → thach nếu SUSP ≥ 40 (S6d: SWEEP @13) | (SWEEP @13 nếu SUSP ≥ 40) | CONFIDES, RAID, VU_CHECK (không rule nào thấy `yard_cache`) | VERIFIED (S6d) |
| CF-6 | **Sensitivity:** CF-4 với `R_VU_CEILING_CHECK.priority := 5` (< 10) và `earliest := 11` | ceiling → **vu_locker** @11 | VU_CHECK trước RAID | RAID (điều kiện `== dorm_ceiling` đã sai) | INFERRED — test phải **khẳng định đổi kết quả** |
| CF-7 | **Sensitivity:** CF-4 với `PR_LINH_RELAY_LOCATION.delay := 0` | ceiling → ceiling → ? — Thạch biết @10 (nếu 6a chạy Linh-relay **sau** Đức-confide trong cùng pass) hoặc @11 (nếu trước). RAID `earliest 11` che lệch → kết quả **giống** CF-4 nhưng `acquiredAt` khác | — | — | INFERRED — test khẳng định thứ tự 6a **không** đổi kết quả với content hiện tại, và **có** đổi nếu RAID `earliest := 10` |
| CF-8 | **Sensitivity:** đảo 6a/6b (rules trước propagation) tại seg 8 | S₀ không hình thành: `R_INTERROGATION_D4` không fire, thẩm vấn D4 biến mất | — | `R_INTERROGATION_D4` | INFERRED — test khẳng định đổi kết quả (bảo vệ O1) |
| CF-9 | Operator, `verify`→`discredit`@9 (cắt Linh), `join`@2 + `spare`@10 (trust.vu 2), @13 `o_take` với SUSP ≥ 40 | ceiling → ceiling → vu_locker → **player** (@13 bước 3) → **thach** (SWEEP @13 conv) | VU_CHECK@12, SWEEP@13 | RAID, PR_VU | VERIFIED (scen2 A/o_take: `send_out` vẫn kịp trong bước 4) |
| CF-10 | CF-9 với `o_hide` | … → vu_locker → vu_locker (hấp thụ) | VU_CHECK | PR_VU (bị `T_O_TOLD_VU_HIDE` chặn), SWEEP | VERIFIED (scen2 A/o_hide) → F-06 |
| CF-11 | CF-2 với `hand_over` tại `EV_C_D4A_LINH_OFFER` | **Không khả dụng** (forced trước optional) | — | — | VERIFIED (S6e) → F-05a; sau khi sửa F-05a test phải cho `linh` → (rule mới) `thach` |

**Assertion bắt buộc cho mỗi hàng:** (i) chuỗi `phone.location` đúng từng segment; (ii) tập rule/PR đã fire **đúng bằng** cột "phải fire" ∪ các rule không liên quan điện thoại; (iii) `mutationLog` có đúng một mutation `flag phone.location` cho mỗi mũi tên; (iv) với hàng Sensitivity, chạy **hai** cấu hình và khẳng định `≠`.

---

## 11. Risk matrix

Severity: HIGH = thu hẹp không gian ending/slice hoặc rò WorldTruth; MEDIUM = nội dung chết / đặc tả mâu thuẫn ảnh hưởng replay; LOW = dọn dẹp. Likelihood = xác suất người chơi/engine chạm vào.

| ID | Tiêu đề | Sev | Lik | Loại | Nhãn | Sửa ở | Blocker? |
|---|---|---|---|---|---|---|---|
| F-01 | Trần trust.vu Captive = 1 → VU_TALK, vuWillOpen, escape-cùng-Đức, `turn`, 4 fact Gate B chết | HIGH | Chắc chắn | content | VERIFIED | timeline.json (2 dòng) + truth.json/docs | **CÓ** |
| F-02 | Observation misinformation slice không fire (max stress 50 < 60) | HIGH | Chắc chắn | content | VERIFIED | timeline.json:1613 (1 số) | **CÓ** |
| F-03 | `classifyBelief`/`DialogueRequest` rò WorldTruth qua UI | HIGH | Trung bình (Phase 5) | types/spec | VERIFIED | types.ts comment + type mới | **CÓ** (spec) |
| F-05 | `hand_over`, `name_duc` chết do forced/scheduled/optional | MED | Chắc chắn | lifecycle/content | VERIFIED | docs/02 §4 + `order` | **CÓ** |
| F-04 | Thạch OBSERVED "Đức lấy" không truy vết | MED | Chắc chắn | content | VERIFIED | rules.delayed.json:70 | Nên |
| F-06 | `phone.location` hấp thụ: linh/mai/vu_locker-hidden | MED | Trung bình | content/spec | VERIFIED | flags.json + 1–2 rule | Nên |
| F-07 | `R_THACH_RECOVERS_PHONE_QUIET` chết | MED | Chắc chắn | content | VERIFIED | xóa/đổi | Nên |
| F-08 | Clamp per-mutation vs per-convergence mâu thuẫn | MED | Thấp (biên) | spec | VERIFIED/INFERRED | docs/02 hoặc types.ts | **CÓ** (1 dòng) |
| F-09 | Stat khởi điểm không định nghĩa | MED | Chắc chắn | spec | VERIFIED | flags.json hoặc types.ts | **CÓ** (1 dòng) |
| F-10 | Relay misinformation không attestation; Test 7 mù relay | MED | Chắc chắn | spec/test | VERIFIED | types.ts + test | Nên |
| F-11 | Belief rank bằng nhau / `acquiredAt` relay / relay lặp | MED | Chắc chắn (engine) | spec | INFERRED | docs/02 §4 | Nên |
| F-12 | Zero-player cần `defaultChoice`; kết cục phụ thuộc policy | MED | Chắc chắn (nếu theo docs/04) | spec/PO | VERIFIED | PO quyết | PO |
| F-13 | RAID observation đọc flag mà `o_surrender` ghi sau | LOW-MED | Trung bình | content | INFERRED | timeline.json:6098+ | Không |
| F-14 | `R_OPERATOR_MARKED`(40) sau `R_CALLED_UP`(3) tại 17 | LOW | Hiện 0 | content | VERIFIED | priority | Không |
| F-15 | `PR_LINH_DOUBLE_AGENT_FEED` trơ (sai fact, flag hết reader) | LOW | — | content | VERIFIED | npcs.json:471–493 | Không |
| F-16 | `PR_LINH_RELAY_CAPTIVE_TAGS` trơ (Thạch tag không reader) | LOW | — | content | VERIFIED | thêm reader hoặc xóa | Không |
| F-17 | `misinformation: false` sai kiểu | LOW | — | content | VERIFIED | npcs.json:485 | Không |
| F-18 | Decoy/real độc lập → tin cả hai | LOW | Trung bình | design | INFERRED | types.ts `negates` | Không |
| F-19 | Witness path không tự đủ (3/8) | LOW | — | content | VERIFIED | endings.json + schema `fills` | Nên (trước T-A) |
| F-20 | docs/04 §3.4 hàng 3 sai (trust Vũ qua D4N) | LOW | — | doc | VERIFIED | docs/04 | Không |
| F-21 | Replay: thiếu actionLog, contentVersion, thứ tự chưa chốt | MED | Chắc chắn (Phase 5) | spec | VERIFIED | types.ts/docs | Nên |
| F-22 | `duc.scapegoated` khi Đức present (Captive) | LOW | Thấp | content | VERIFIED | timeline.json:2318+ | Không |
| F-23 | `uncertainAboveStress` 40/60 trước D3 ngoài tầm | LOW | — | content | VERIFIED/INFERRED | ngưỡng | Không |
| 2.8 | `reads` thiếu stat/trust/eventFired | LOW | — | doc | VERIFIED | schema | Không |

---

## 12. Invariant test specifications (bổ sung cho 21 test hiện có)

Nhóm **S** = tĩnh (viết được ngay, node:test, 0 dependency); nhóm **D** = động (cần reference evaluator Q3/P3).

| ID | Tên | Loại | Đặc tả (assert) | Chặn finding |
|---|---|---|---|---|
| T-A | Dynamic Gate B | D | ∀ fact f, ∀ role r ∈ f.confirmableBy: ∃ path (từ witness-path corpus hoặc search BFS theo choice) sao cho player đạt CONFIRMED f. Ngược lại ∀ r ∉ confirmableBy: không path nào. | F-01 |
| T-B | Stat-gate reachability | S | ∀ condition `stat S cmp N` gắn với observation/choice/precondition tại segment s: `maxReach(S, s) ≥ N` với `maxReach` = tổng delta dương lớn nhất theo lifecycle (1 forced + ≤1 optional/segment, + background), tính riêng từng vai; tương tự `minReach` cho `<`. | F-02, F-23 |
| T-C | Trust-gate reachability | S | ∀ condition `trust npc ≥ v` tại seg s cho vai r: tổng delta dương `trust.npc` khả dụng cho r trước s (loại các delta nằm **trong** event bị chính condition đó gate) + initialTrust[r] ≥ v. | F-01 |
| T-D | Availability ordering | S | ∀ choice c với `available` đọc flag/belief X tại event E (slot s, trigger t): ∃ producer của X ở segment < s, **hoặc** ở segment s với trigger-rank(producer) < trigger-rank(E) theo thứ tự forced(1) < scheduled(2) < optional(3) (hoặc theo `order` nếu có). | F-05 |
| T-E | Live rules | D | ∀ DelayedRule r: ∃ kịch bản trong corpus mà r fire. Tĩnh (yếu hơn): ∀ r, ∀ flag/npcStatus trong `when`, ∃ writer có segment ≤ r.latest và không bị loại trừ bởi writer cùng biến có priority thấp hơn trong cùng window. | F-07 |
| T-F | No silent absorbing state | S | ∀ FlagDefinition có `values`: ∀ v ∈ values: ∃ condition đọc `== v` **hoặc** v ∈ `terminal` (trường mới). | F-06 |
| T-G | Convergence write-before-read | S | ∀ cặp rule (A, B) cùng segment khả dĩ, A ghi X, B đọc X: `priority(A) < priority(B)` hoặc cặp được khai trong `allowReadBeforeWrite` (tường minh). | F-14, O4 |
| T-H | 6a/6b sensitivity | D | Chạy corpus với thứ tự chuẩn và với thứ tự đảo (rules trước propagation); khẳng định O1 đổi kết quả (bảo vệ đặc tả) và liệt kê mọi kịch bản khác đổi. | O1, CF-8 |
| T-I1 | Relay attestation | S | Mở rộng Test 7: với relay, ∀ f ∈ facts: nếu `truth[f].value ≠ believedValue khả dĩ của from` (từ REACH kèm value) thì nguồn gốc phải là một grant/assert có `misinformation: true`. | F-10 |
| T-I2 | Type conformance | S | `misinformation` chỉ nhận `true`; `uncertainAboveStress` chỉ trên agent player; `once` đúng kiểu. | F-17 |
| T-I3 | NPC self-observation needs presence | S | ∀ belief grant cho NPC với `status ≥ OBSERVED, source: self` trong DelayedRule/propagation: rule có `_witness` attestation hoặc fact ∈ `background.facts` của BG cùng segment. | F-04 |
| T-I4 | Visibility of world flags to NPC rules | S | (từ docs/04 2.2) rule đứng tên NPC chỉ đọc flag có `visibleTo` chứa NPC đó. | G3 |
| T-J | Equal-rank idempotency | D | `apply(belief same status & value)` → không mutation mới (log length không đổi). Relay lặp 5 segment → ≤ 1 mutation/fact. | F-11 |
| T-K | Replay | D | hash(mutationLog(run(content, role, actionLog))) ổn định qua 2 lần chạy và qua reorder **ngẫu nhiên** của mảng `events`/`propagation` trong bộ nhớ **nếu** `order` được khai; nếu không, test phải FAIL để chứng minh phụ thuộc file-order. | F-21, Q2 |
| T-L | Zero-player | D | Với `defaultChoice` khai báo: cả hai vai chạy 0→20 không exception, đạt ending; chuỗi NPC tối thiểu (Linh tip @8 Captive; confide @10; raid @11; prep @17) có mặt trong log. | F-12 |
| T-M | Observation/choice no same-event dependency | S | ∀ event E: tập flag/tag mà `observations[].when` đọc ∩ tập flag/tag mà `choices[].consequences` của E ghi = ∅. | F-13 |
| T-N | Witness path self-sufficiency | S+D | Schema: `steps` phải phủ **mọi** forced/scheduled event có choice mà path đi qua (tĩnh: liệt kê slot); động: chạy path, assert ending đúng. | F-19 |
| T-O1 | Initial stats declared | S | `content/flags.json` (hoặc file mới) có `player.initial.{stress,suspicion}` cho mỗi vai; types.ts có trường tương ứng. | F-09 |
| T-O2 | Lifecycle ordering declared | S | docs/02 §4 bổ sung: thứ tự scheduled queue; thứ tự 6a; chính sách rank bằng; `acquiredAt` relay; clamp timing — và `types.ts` có `EngineOrdering` const để test đọc. | F-08, F-11, O12, O13 |

---

## 13. Architectural approval blockers (đề nghị cho PO)

**Phải xử lý trước khi phê duyệt Phase 2 → Phase 3** (tất cả là sửa content/spec, ước lượng < 20 dòng thay đổi, không refactor):

| # | Blocker | Vì sao chặn | Sửa tối thiểu |
|---|---|---|---|
| B1 | **F-01** trust.vu Captive | Một nửa chuỗi mắt xích Captive (docs/02 §6) và kết cục "trốn cùng Đức" không tồn tại; 4 fact khai sai; Gate B chỉ đúng tĩnh | Hạ VU_TALK xuống `≥ 1` + 1 nguồn +trust.vu sớm; chạy T-C |
| B2 | **F-02** stress ≥ 60 | Vertical slice (deliverable Phase 3) được chọn vì có "misleading interpretation" — hiện không có | Ngưỡng 40 hoặc +10 stress tại BG_D3M_THEFT; chạy T-B |
| B3 | **F-03** classifyBelief | Vi phạm trực tiếp yêu cầu #1/#4 của PO ở tầng interface; rẻ nhất khi sửa trước Phase 5 | Đổi comment + `PlayerVisibleBelief` |
| B4 | **F-05** thứ tự forced/scheduled/optional | 2 choice chết trong đó 1 là nhánh đạo đức trung tâm của Operator (đổ tội Đức sáng D4); đồng thời là quyết định Q2 | Chốt Q2 = thêm `order`; sửa 2 slot |
| B5 | **F-08 + F-09** | Không có stat khởi điểm và clamp timing thì **mọi** kết luận reachability (kể cả audit này) là có điều kiện | 2 dòng đặc tả |
| B6 | **F-12** chính sách zero-player | docs/04 P1–P6 xây trên "thế giới tự vận động"; không có `defaultChoice` thì không test được | PO chọn: `defaultChoice` trong content (đề xuất) hay quy ước |

**Nên xử lý trong Phase 3 (không chặn):** F-04, F-06, F-07, F-10, F-11, F-19, F-21, T-A/T-E/T-H/T-J/T-K/T-L đi cùng reference evaluator (Q3/P3).

**Không cần PO quyết:** F-13–F-18, F-20, F-22, F-23, 2.8 — sửa khi mở file tương ứng.

---

## 14. Những gì audit này **không** làm

- Không type-check `types.ts` bằng tsc (A1 vẫn UNTESTED).
- Harness ≠ engine: không có UI, không có DialogueProvider, không có save/load; nhãn VERIFIED (harness) nghĩa là "đúng với lifecycle docs/02 §4 dưới giả định Phụ lục A".
- Không tìm kiếm toàn bộ không gian lựa chọn (BFS); reachability "✓" là **tồn tại ≥ 1 path** đã chạy; "chết" là **chứng minh bằng liệt kê tĩnh** (không phụ thuộc harness).
- Không đánh giá Gate G (từ cấm) và D9 (danh tính hư cấu) — ngoài phạm vi logic.
- Không chạm bất kỳ file nào ngoài việc tạo file này. `sha256sum -c docs/phase2-checksums.txt` vẫn 15/15 OK sau audit (file này chưa có trong manifest; PO quyết có thêm).

---

## Phụ lục A — Giả định của harness audit (để ChatGPT tái lập)

| # | Điểm mơ hồ | Giả định dùng |
|---|---|---|
| A-1 | Stat khởi điểm | stress = 0, suspicion = 0 cho cả hai vai; trust theo `initialTrust[role]` |
| A-2 | Clamp | per-mutation cho stat (0–100) và trust (−3..3); thêm clamp tại 6c (vô hại) |
| A-3 | Observation | đánh giá `when` và cấp `grants` **trước** khi player chọn; mọi observation thỏa `roles` + `when` đều cấp |
| A-4 | Thứ tự trong segment | background → forced (file order, chỉ khi `preconditions` đúng, không lặp trừ `repeatable`) → scheduled (`at == s`, theo thứ tự vào queue, kiểm `preconditions` + `roles`) → ≤ 1 optional (theo policy kịch bản) → ending (priority tăng dần, chỉ tại `checkAt`) → 6a → 6b → clamp → s+1 |
| A-5 | Event window `segments` | chỉ fire tại segment-of-day được liệt kê |
| A-6 | Belief grant | rank cao hơn thay thế; rank **bằng** giữ nguyên (no-op); `uncertainAboveStress` chỉ với agent player, hạ về RUMOR(self) |
| A-7 | Propagation 6a | theo thứ tự file; `assert`: chỉ tại `at` (nếu có) và `when`, `once`; `relay`: với mỗi fact/tag mà `from` có `acquiredAt ≤ s − delay`, cấp cho `to` với `acquiredAt = s`, status `arriveAs` (mặc định RUMOR), cùng `believedValue`; `once` đánh dấu khi có ≥ 1 item thực sự chuyển |
| A-8 | 6b | rule trong `[earliest, latest]`, chưa fire, sắp theo (priority, id) với id so sánh codepoint |
| A-9 | Kết thúc | khi ending được gán, dừng ngay (không convergence) |
| A-10 | Policy "thụ động" | optional: bỏ qua; forced/scheduled: choice khả dụng đầu tiên (biến thể: cuối cùng) |

Mã harness (~170 dòng Python, chỉ đọc JSON) nằm trong scratch của phiên; không nộp để tôn trọng "no implementation". Toàn bộ kết quả trích dẫn (S1–S6, scen2 A/D/F/G/H/I) tái lập được từ bảng trên + content hiện tại; các kết luận HIGH còn đứng vững bằng liệt kê tĩnh ghi ngay trong từng finding.

---

**DỪNG.** Không bắt đầu Phase 3. Chờ PO quyết B1–B6 và phản hồi của ChatGPT (independent verifier).
