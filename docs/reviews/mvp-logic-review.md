# THE COMPOUND — MVP LOGIC & CONTENT CONSISTENCY REVIEW (độc lập)

Ngày: 2026-10-13 · Reviewer: Claude (logic & content consistency, độc lập với người triển khai) · PO: Huypkc
Phạm vi: toàn bộ `content/*.json` + ngữ nghĩa engine `src/engine/core.mjs` / `session.mjs` / `projection.mjs` như đang chạy; đối chiếu với `docs/01`, `02`, `04`, `05-independent-logic-audit`. **Không sửa file nào ngoài tài liệu này.**

Tiền đề đã chạy trong phiên: `node --test tests/*.test.mjs` → **108 pass** lúc bắt đầu, **111 pass / 0 fail** lúc kết thúc (3 test được thêm song song bởi phiên khác — xem §0.2). Mọi phát hiện dưới đây đều có kịch bản tái hiện đã chạy thật bằng `run(C, role, scriptedPolicy(...))` qua `src/engine/evaluator.mjs` (script trong scratch của phiên; mọi policy được in nguyên văn ở cột "Tái hiện" để chạy lại).

Nhãn: **VERIFIED-RUN** = đã chạy engine và quan sát · **VERIFIED-STATIC** = chứng minh bằng liệt kê toàn bộ writer/reader trong content · **NOTE** = nhận xét, không đòi sửa.

---

## 0. Kết luận trước

**MVP logic & content: ACCEPT WITH FIXES.**

Engine đúng với đặc tả đã phê chuẩn (thứ tự, rank belief, idempotency, atomicity, replay) và cả 8 (ending × vai) đều tới được qua Session API — **xác nhận**. Những gì còn sai nằm ở **content**, chủ yếu ba nhóm:

1. **Một event echo-slice chết cho vai Operator** (`EV_S_D5A_DUC_TAKEN` + 3 choice + status `demoted` + misinformation "Đức là kẻ rò rỉ" mà docs/02 §6 hứa cho Operator) — L-01, HIGH.
2. **Epilogue card chọn sai thứ tự / thiếu điều kiện** → card NPC mâu thuẫn trạng thái cuối trong các run tới được (Mai/Linh/Đức "lên xe" dù đã truy quét; Thạch "không tìm ra điện thoại" dù đang cầm nó; "Lên cùng xe với Đức" dù Đức bị cách ly) — L-02/L-03/L-04, HIGH/MEDIUM.
3. **Thế giới đổi mà người chơi không thấy dấu vết** (Thạch lấy điện thoại đêm D4, Linh nộp máy sáng D5 +30 SUSPICION) và vài text/grant lệch nhau — L-07…L-09, MEDIUM.

Những thay đổi hôm nay được giao soi (order field, RAID obs đọc tag, fallback E_INVERSION, priority Linh 8→22, 5 khai báo `allowReadBeforeWrite`, optional-pick commit, npcTag idempotent): **tất cả đúng** (§6). Không có BLOCKER.

### 0.2 Ghi chú về trạng thái file trong lúc review

Trong lúc review, một phiên khác đã sửa `src/engine/core.mjs`, `projection.mjs`, `session.mjs`, `types.ts`, `tests/engine.test.mjs`, `tests/session.test.mjs` (mtime 06:17–06:19) và tạo `docs/07-mvp-verification.md`, `docs/08-mvp-architecture.md`. Tôi đã đọc lại `core.mjs` sau khi đổi: hai khác biệt có ý nghĩa — (a) `cmp` ném lỗi với op lạ (alias thừa `'<<='` bị bỏ; content không dùng nó — đã grep), (b) `deserialize` đối chiếu thêm `segment`/`ending` của header với kết quả replay. Không thay đổi ngữ nghĩa content. Kết luận trong tài liệu này là trên trạng thái cuối (111 pass).

---

## 1. Phương pháp

- Đọc toàn bộ `core.mjs` (hai lần, trước/sau sửa), `session.mjs`, `projection.mjs`, 8 file content (timeline.json qua script dump 913 dòng: slot, trigger, order, precondition, mọi observation `when`/grant, mọi choice `available`/consequence), 6 file test + corpus.
- Liệt kê tĩnh: mọi writer/reader của `phone.location`, `operator.cooperationProof`, `duc.scapegoated`, `npcStatus`, mọi tag/npcTag ghi-mà-không-đọc, mọi `npcKnowsTag` theo NPC.
- Thí nghiệm động: 30 kịch bản scripted có chủ đích (E1–E30, W1–W4) + **10.000 run ngẫu nhiên** (policy chọn đều, 75% nhận optional) để đo độ phủ variant epilogue và xác nhận các "chết" (một mục "chết" chỉ được ghi nếu chứng minh được tĩnh; random chỉ là bằng chứng phụ).
- Đối chiếu 8 witness path qua `Session`/`autoplay` (test ENDINGS đã có; đọc lại docs/07 §3 trace sinh tự động).

---

## 2. Findings

Mức: **BLOCKER** (không thể chấp nhận) · **HIGH** (người chơi/PO sẽ thấy mâu thuẫn hoặc mất nhánh đã hứa) · **MEDIUM** (mâu thuẫn tới được nhưng hẹp, hoặc lời hứa thiết kế không có) · **LOW** (dọn dẹp) · **NOTE**.

Ký hiệu tái hiện: `C_PREFIX` = prefix Captive trong `tests/corpus.mjs` (c_sign, open, share, watch, comply, encourage, tell, cover, tell, keep_secret, refuse, watch, stall, no, stay; optional C_OPT); `O_PREFIX` = prefix Operator trong corpus. Script = `{eventId: choiceId}`, `opt` = optional được nhận.

### L-01 · HIGH · `EV_S_D5A_DUC_TAKEN` không bao giờ bắn cho vai Operator — VERIFIED-STATIC + RUN

- **File/id:** `content/timeline.json: EV_S_D5A_DUC_TAKEN` (roles captive/operator; choice `o_carry_out`, `o_object`, `o_soften`; OBS#1 operator grant `F_DUC_IS_THE_LEAK` RUMOR misinformation); `content/npc.intents.json: A_THACH_RAID_WHERE_I_BELIEVE` (nơi duy nhất `schedule` event này); `EV_O_D4M_THACH_NAME/name_duc`.
- **Chứng minh:** event chỉ được lên lịch trong nhánh `then` của A_THACH_RAID khi `st.duc = present ∧ (NB(thach:F_PHONE_TAKEN_BY_DUC) ∨ NT(thach:T_C_COVERED_DUC_SEARCH))`. Trong run Operator: `T_C_COVERED_DUC_SEARCH` chỉ do choice Captive ghi; `F_PHONE_TAKEN_BY_DUC` tới Thạch chỉ qua `blame_duc` (event Captive) hoặc `name_duc` — mà `name_duc` **đồng thời** `duc.status := isolated` → `PR_DUC_CONFIDES_LINH` (cần present) không bắn → Thạch không bao giờ biết chỗ → raid không bắn; không có relay nào mang `F_PHONE_TAKEN_BY_DUC` tới Thạch (PR_LINH_RELAY_LOCATION chỉ relay HIDDEN); không có writer nào đưa Đức về `present`. ⇒ tập điều kiện rỗng. Random 2.000 run Operator: 0 lần; mọi run Operator của corpus (7 scenario + 4 witness + 3 zero-player): 0 lần (corpus O6 có `EV_S_D5A_DUC_TAKEN: 'o_object'` trong script nhưng không assert nó bắn — nên test không phát hiện). Hệ quả chết theo: `duc.status = demoted` (chỉ `o_soften` ghi) → card Đức "Bị 'hạ xuống' thay vì bị quy tội" chết; 3 tag `T_O_PROCESSED_DUC/OBJECTED_DUC/SOFTENED_DUC` + 2 npcTag Vũ chết; **misinformation chính của Operator theo docs/02 §6 ("Đức là kẻ rò rỉ — kết luận sai của Thạch") không bao giờ được trao**; docs/02 §5 "D5 chiều ECHO SLICE: Đức bị bắt" không tồn tại cho Operator.
- **Vì sao test không bắt:** T07 chỉ kiểm rule/action/propagation "từng bắn trong corpus", không kiểm event × vai.
- **Sửa đề xuất (content):** bỏ `duc.status := isolated` khỏi `name_duc` (giữ `duc.scapegoated`, belief Thạch, trust) để chuỗi name_duc(9) → Đức kể Linh(10) → Linh báo chỗ(11) → raid có lý do(11) → DUC_TAKEN(13) chạy đúng như vai Captive với `blame_duc`; đồng thời xử lý L-06 để "bị quy mà vẫn present" không thành trạng thái treo. Thêm gate: `∀ event e, ∀ role ∈ e.roles: ∃ run trong corpus mà e bắn với vai đó` (mở rộng T07).

### L-02 · HIGH · Card NPC "lên xe" trong ending PHƠI BÀY vì card `isolated`/`demoted` đứng trước card `raid.happened` — VERIFIED-RUN

- **File/id:** `content/epilogues.json: npcs.mai[0]`, `npcs.linh[0]`, `npcs.duc[2]`, `npcs.duc[3]` (thứ tự variant; "first matching wins" trong `projection.mjs: pickVariant`).
- **Tái hiện (3 run, đều E_EXPOSURE):**
  - Mai: Operator `{...O_PREFIX, EV_O_D1N_VU_DRINK:'join', EV_O_D2A_MAI_ROUTINE:'follow', EV_O_D3M_THACH_ORDER:'accept', EV_O_D3N_LINH_TIP:'verify', EV_O_D4M_VERIFY_TIP:'discredit', EV_O_D4M_THACH_NAME:'name_mai', EV_S_D5A_PHONE_FOUND_BY_VU:'o_take', EV_O_D5A_PHONE_CONTENTS:'send_out', EV_S_D7M_RAID:'o_surrender'}`, opt `[VU_DRINK, MAI_ROUTINE, O_D5A_PHONE_CONTENTS]` → Mai `isolated` + `raid.happened` → card: *"Bị 'hạ xuống'… Cuộc giải cứu cô đổi bằng lịch chuyển giao **không đến** vì không ai còn nhắn"* trong khi cổng vừa bị phá sáng D7.
  - Đức: Operator `{...O_PREFIX, EV_O_D1N_VU_DRINK:'join', EV_O_D3M_THACH_ORDER:'accept', EV_O_D3M_MAI_PANIC:'confront', EV_O_D3N_LINH_TIP:'verify', EV_O_D4M_VERIFY_TIP:'keep', EV_O_D4M_THACH_NAME:'name_duc', EV_S_D5A_PHONE_FOUND_BY_VU:'o_take', EV_O_D5A_MAI_DEAL:'refuse', EV_O_D5A_PHONE_CONTENTS:'send_out', EV_S_D7M_RAID:'o_surrender'}` → Đức `isolated` + raid → card *"…và **lên xe** bằng cửa khác"* — không có xe nào đi.
  - Linh: Captive `{...C_PREFIX, EV_C_D4M_INTERROGATION:'blame_linh', EV_C_D4A_PHONE_DECISION:'take', EV_C_D4N_LINH_OFFER:'confront', EV_C_D5A_PHONE_CONTENTS:'call_out', EV_C_D6A_LINH_TRUTH:'expose', EV_S_D7M_RAID:'c_help'}`, opt `[...C_OPT, PHONE_DECISION, PHONE_CONTENTS, LINH_TRUTH]` → Linh `isolated` + raid → card *"Cô **lên xe riêng**"*; đồng thời extra `T_C_HELPED_OTHERS_RAID` "Bạn kéo Đức và Linh ra chỗ được đếm" dù Linh đã bị đưa khỏi ký túc (L-13).
- **Sửa:** đưa card `raid.happened` lên trước card `isolated/demoted` cho Mai, Linh, Đức, hoặc thêm `¬raid.happened` vào điều kiện các card "lên xe". Thêm gate tĩnh: mọi card có văn bản "lên xe" phải có điều kiện loại trừ `raid.happened` (hoặc đứng sau nó).

### L-03 · MEDIUM · Card Thạch "không tìm ra chiếc điện thoại" khi `phone.location = thach` — VERIFIED-RUN

- **File/id:** `epilogues.json: npcs.thach[5]` (điều kiện `NB(thach:F_PHONE_EXISTS ≥ CONFIRMED)`), `npcs.thach[6]` fallback; `timeline.json: EV_S_D5A_PHONE_FOUND_BY_VU/o_report` chỉ cấp Thạch `F_PHONE_HIDDEN_DORM_CEILING` CONFIRMED, **không** cấp `F_PHONE_EXISTS`.
- **Tái hiện:** Operator `{...O_PREFIX, EV_O_D1N_VU_DRINK:'join', EV_O_D3M_THACH_ORDER:'accept', EV_O_D3M_MAI_PANIC:'confront', EV_O_D3N_LINH_TIP:'verify', EV_O_D4M_VERIFY_TIP:'discredit', EV_S_D5A_PHONE_FOUND_BY_VU:'o_report', EV_O_D5A_MAI_DEAL:'refuse'}`, opt `[VU_DRINK, MAI_PANIC]` → cuối run `phone = thach`, belief Thạch chỉ có HIDDEN@13 → card: *"Không bao giờ tìm ra kẻ rò rỉ, cũng không tìm ra chiếc điện thoại"*; extra của Operator (`T_O_TOLD_VU_REPORT`) và card Vũ "Nộp chiếc điện thoại vì bạn bảo thế" nói ngược lại.
- **Sửa:** thêm `B(thach:F_PHONE_EXISTS CONFIRMED src=vu)` vào `o_report` (đồng bộ với `A_VU_HAND_UP`), **và** đổi điều kiện card thach[5] thành `flag phone.location == thach` (trạng thái vật lý, không phụ thuộc belief).

### L-04 · MEDIUM · "Lên cùng xe với Đức" khả dụng khi Đức bị cách ly — VERIFIED-RUN

- **File/id:** `timeline.json: EV_S_D7A_LOADING/c_with_duc` (available `¬st.duc = gone`; `gone` không bao giờ được ghi — L-17) ; `epilogues.json: E_TRANSFER.variants[captive, T_C_BOARDED_WITH_DUC]`.
- **Tái hiện:** corpus S5_TELL_LINH + `EV_S_D7A_LOADING:'c_with_duc'` → main *"Bạn lên cùng xe với Đức. Em ngồi sát cửa…"*, card Đức *"Em không quay lại ký túc tối đó, và lên xe bằng cửa khác."*
- **Sửa:** `c_with_duc.available := st.duc = present ∨ st.duc = demoted`.

### L-05 · LOW · Variant/card không bao giờ chọn được — VERIFIED-STATIC (+ random 6.000 run)

| Mục | Vì sao chết | Phân loại |
|---|---|---|
| `E_EXPOSURE` captive variant "Bạn không gọi ai. Ai đó đã gọi." | Captive chỉ đặt `evidence.outside` qua `call_out`/`call`, cả hai ghi `T_C_CALLED_OUTSIDE` → variant 1 luôn thắng | unreachable by design (fallback bắt buộc bởi gate EPILOGUES) |
| `E_INVERSION` captive variant `always` (vừa thêm hôm nay) | điều kiện ending đã đòi `T_C_ACCEPTED_THACH_DEAL` | by design |
| `E_INVERSION` extra `T_C_STALLED_THACH` "Thạch coi im lặng là đồng ý" | `stall` và `accept` là hai choice của cùng event once → không thể cùng tồn tại; text ám chỉ một cơ chế (stall ⇒ bị coi là nhận) **không có** | dead content — xóa hoặc hiện thực |
| `npcs.mai[4]` "Biết bạn đã đưa tên cô cho Thạch" (`NT(mai:T_O_REPORTED_MAI)`) | `name_mai` ghi `mai.exposed` → `R_MAI_EXPOSED` (window 9–20) luôn cách ly Mai → card `isolated` đứng trước che mất | bug thứ tự — đưa lên trước `isolated` hoặc gộp |
| `npcs.duc[1]` "Không còn ở tầng này" (`gone`) | không writer nào ghi `gone` | xem L-17 |
| `npcs.duc[3]` `demoted` | L-01 | theo L-01 |
| `T_W_ONLY_MAI_LISTED` cho **captive** (RAID OBS#3) | như hàng 1 | by design; chú thích `roles` nên bỏ captive để khỏi gây hiểu nhầm |

### L-06 · MEDIUM · Audit F-22 chưa sửa: Captive `blame_duc` → `duc.scapegoated = true` nhưng Đức `present` suốt run — VERIFIED-RUN

- **File/id:** `timeline.json: EV_C_D4M_INTERROGATION/blame_duc`; `epilogues.json: npcs.thach[4]`, `npcs.vu[5]`.
- **Tái hiện:** `{...C_PREFIX, EV_C_D3N_DUC_CONFESSION:'warn_linh', EV_C_D4M_INTERROGATION:'blame_duc', EV_C_D4A_PHONE_DECISION:'leave'}`, opt `[...C_OPT, PHONE_DECISION]` → cuối run `duc.scapegoated = true`, Đức present, không bị gọi lên; card Thạch *"Nộp lên trên cái tên Đức"*, card Vũ *"Tin rằng Đức là kẻ rò rỉ… **Anh ta thi hành**"*, card Đức *"Lên xe. Em chưa gọi được cho mẹ"* — ba card kể ba thế giới. T04 có invariant đúng cho ca này ("Đức scapegoated yet present") nhưng **corpus không có run nào `blame_duc`** nên không bắt.
- **Sửa:** quyết định ngữ nghĩa `duc.scapegoated`: hoặc (a) nó là "Thạch đã có tên" và Đức bị gọi lên khi Thạch có máy hoặc tới hạn (thêm rule D6: `scapegoated ∧ present → isolated + schedule EV_S_D5A_DUC_TAKEN` — cần variant text không nhắc "lấy điện thoại"), hoặc (b) `blame_duc` chỉ cấp belief RUMOR cho Thạch, không ghi flag. Thêm run `blame_duc` vào corpus để T04 có răng.

### L-07 · MEDIUM · Thế giới đổi không để lại dấu vết cho người chơi (docs/04 R-E3) — VERIFIED-RUN

1. **Thạch lấy điện thoại trên trần đêm D4 mà không ai trong ký túc biết.** `A_THACH_RAID_WHERE_I_BELIEVE` nhánh then khi *không* có lý do quy tội: chỉ đổi flag + belief Thạch; không event, không witnessTag. Tái hiện: `{c_sign, guarded, share, watch, comply, encourage, deflect, aside, silent, keep_secret, deny, leave, refuse}` + opt `[...C_OPT, PHONE_DECISION, PATROL2, PHONE_CONTENTS]` → phone `dorm_ceiling→thach` tại conv 11; journal sau seg 10 chỉ có QUOTA/LINH_OFFER/PATROL2(sleep)/THACH_DEAL/LOADING; Captive đã CONFIRMED chỗ giấu (keep_secret) nhưng tới cuối không hề biết máy đã mất. (`EV_C_D4N_PATROL2` OBS "Đức lên trần… mặt trắng bệch" chỉ chạy tại seg 11 bước 4, tức **trước** raid conv 11.)
2. **Linh nộp máy sáng D5:** `A_LINH_HANDS_PHONE_UP` +30 SUSPICION + `T_W_CALLED_ABOUT_PHONE` ("bị gọi lên vì điện thoại") tại conv 12 — không có event nào "gọi lên"; người chơi chỉ thấy band SUSPICION nhảy (corpus S8: journal 12–14 trống).
3. **Raid hụt:** nhánh else của A_THACH_RAID +15 SUSPICION (captive có tip) — lặng.
- **Sửa:** một observation/forced nhỏ sáng D5 cho Captive: `when PB(HIDDEN ≥ OBSERVED) ∧ phone ∉ {dorm_ceiling, yard_cache, player, linh} ∧ ¬tag T_W_PHONE_VANISHED ∧ ¬tag T_W_PHONE_CONFISCATED` → "khe trần trống" + `T_W_PHONE_VANISHED`; và một scheduled event tại 12/13 cho trường hợp `T_W_CALLED_ABOUT_PHONE` (Thạch gọi lên, 2 choice).

### L-08 · MEDIUM · `T_W_PHONE_VANISHED` bắn sau khi chính người chơi lấy máy rồi bị khám mất — VERIFIED-RUN

- **File/id:** `timeline.json: EV_C_D4N_PATROL2` OBS#0 `when` (loại trừ ceiling/yard/player/linh nhưng không loại `thach` do `R_SUSPICION_SWEEP`); `epilogues.json: E_TRANSFER extra T_W_PHONE_VANISHED`.
- **Tái hiện:** `{...C_PREFIX, EV_C_D4M_INTERROGATION:'deny', EV_C_D4A_PHONE_DECISION:'take'}`, opt `[...C_OPT, PHONE_DECISION, PATROL2]` → sweep conv 10 (`T_W_PHONE_CONFISCATED`), seg 11 PATROL2 OBS "Đức lên nhà vệ sinh rồi quay xuống, mặt trắng bệch" (Đức biết người mới đã lấy — `npcTag duc:T_C_TOOK_PHONE`), epilogue extra *"Chiếc điện thoại biến mất khỏi khe trần trước khi ai trong ký túc kịp hiểu vì sao. Không ai bị gọi lên vì nó."* ngay sau khi người chơi vừa bị khám đồ mất nó.
- **Sửa:** thêm `¬tag T_C_TOOK_PHONE` (hoặc `¬tag T_W_PHONE_CONFISCATED`) vào `when` của observation; extra epilogue cùng điều kiện.

### L-09 · MEDIUM · Observation nói thẳng tin đồn là sai, nhưng grant ghi tin đồn là *đúng* — VERIFIED-STATIC

- **File/id:** `timeline.json: EV_S_D5A_DUC_TAKEN` OBS#1 (operator): text *"Thạch: 'Thằng nhóc là đứa rò rỉ. Xong.' **Bạn biết đứa 19 tuổi ấy không thể là người nhắn tin ra ngoài**"* nhưng grant `B(player:F_DUC_IS_THE_LEAK = true RUMOR src=thach MISINFO)`. Sổ ghi nhớ sẽ hiện "Đức là người liên lạc với bên ngoài — Tin đồn (Thạch)" ngay dưới câu "bạn biết không thể". Đây là chỗ duy nhất text tiết lộ `misinformation` của một rumour (tiêu chí 5). Hiện chết vì L-01, nhưng sẽ lộ ngay khi L-01 được sửa.
- **Sửa:** giữ grant RUMOR(true, src=thach) nhưng bỏ câu "Bạn biết…" (để người chơi tự suy), **hoặc** grant `believedValue:false RUMOR src=self` (suy luận của Operator, không phải attestation).

### L-10 · MEDIUM · Cùng một trạng thái vật lý (Mai cầm lại máy) cho hai thế giới khác nhau tùy *ai* trả máy — VERIFIED-RUN

- **File/id:** `npc.intents.json: A_MAI_SEARCH_DORM` (phone → `mai`, không đặt `evidence.outside`) vs `timeline.json: EV_O_D5A_PHONE_CONTENTS/to_mai` (phone → `mai` **và** `evidence.outside := true` → truy quét). `epilogues.json: npcs.mai[3]` ("Cô tiếp tục nhắn. Người ở đầu dây bên kia hứa 'sớm'") dùng cho cả hai.
- **Tái hiện:** corpus S7_MAI_RECOVERS → E_TRANSFER, Mai "tiếp tục nhắn" nhưng không có gì xảy ra; Operator `{...O_PREFIX, join, accept, confront, verify, discredit, o_take, agree, to_mai, o_surrender}` → E_EXPOSURE "chỉ có một tên M.". GDD §5 định nghĩa PHƠI BÀY = "nội dung điện thoại ra ngoài (**qua Mai**, hoặc tự gọi)". PO đọc hai run sẽ hỏi vì sao Mai tự lấy lại máy D4 thì không "qua Mai".
- **Sửa (PO quyết):** (a) thêm action Mai D5/D6 `A_MAI_SENDS_SCHEDULE` khi `phone = mai` → `evidence.outside` (S7/O2b đổi ending sang E_EXPOSURE — cập nhật corpus), hoặc (b) làm rõ trong text rằng đầu mối cần *thêm* lời khai/sổ nợ: `to_mai` chỉ đặt `evidence.outside` khi `mai.dealIncludesAll` hoặc `evidence.ledgerCopy`, và sửa card mai[3] cho khớp.

### L-11 · MEDIUM · Tri thức Operator đi vào ngõ cụt; lời hứa docs/04 §2.3/§3.5 không có — VERIFIED-STATIC

- `EV_O_D4A_DUC_QUESTIONED/pressure` cấp Operator **CONFIRMED** `F_PHONE_HIDDEN_DORM_CEILING` tại seg 10; **không** có choice/precondition nào của vai Operator đọc belief này (reader duy nhất: `EV_C_D4A_PHONE_DECISION` và PATROL2 — Captive). Operator ép Đức khai chỗ giấu rồi không thể làm gì với nó; D5 Vũ "tình cờ" tìm thấy theo lịch.
- `EV_O_D3M_THACH_ORDER/point_mai`: cấp Thạch RUMOR `F_PHONE_OWNER_MAI` + `npcTag thach:T_O_POINTED_AT_MAI` — không action/rule/card nào đọc (reader cũ `R_MAI_DEAL` đã bị supersede). Chỉ còn −10 SUSPICION.
- docs/04 §2.3 ("Mai tiếp cận người có thể có điện thoại — *mới có thể nhắm Vũ hoặc Đức*") và §3.5 ("Operator *nói cho Mai biết Vũ đang giữ* → Mai đề nghị Vũ → Vũ tố cô → `mai.exposed`") — không có trong content. Đây là tài liệu PO đã duyệt (P1–P6).
- **Sửa:** tối thiểu, cho `pressure` một đầu ra: choice mới ở `EV_O_D4N_VU_CONFIDES`/`EV_O_D5A_MAI_DEAL` đọc `PB(F_PHONE_HIDDEN_DORM_CEILING ≥ CONFIRMED)`; hoặc ghi nhận trong docs/08 §8 là lệch có chủ ý.

### L-12 · LOW · Mai bị cách ly sáng D4 nhưng chiều D4 "để sổ nợ mở trên bàn khi ra ngoài" — VERIFIED-RUN

- `timeline.json: EV_O_D4A_LEDGER` precondition `(trust.mai ≥ 1 ∨ tag T_O_CONFRONTED_MAI)` không kiểm `npcStatus`. Tái hiện: `{...O_PREFIX, EV_O_D2A_MAI_ROUTINE:'follow', EV_O_D3M_MAI_PANIC:'confront', EV_O_D3N_LINH_TIP:'pass_up', EV_O_D4M_THACH_NAME:'name_mai', EV_O_D4A_LEDGER:'copy'}` → Mai `isolated` tại conv 9, LEDGER vẫn bắn tại 10. Sửa: thêm `st.mai = present`.

### L-13 · LOW · RAID `c_help` "Kéo Đức và Linh ra" khi Linh đã bị cách ly — VERIFIED-RUN (run Linh ở L-02)

Sửa: `c_help.available := st.linh = present ∧ st.duc = present` hoặc tách text theo trạng thái.

### L-14 · LOW · Hai observation mâu thuẫn trong cùng event — VERIFIED-STATIC

`EV_S_D5A_PHONE_FOUND_BY_VU` OBS#0 (captive, luôn) *"Vũ bước xuống, bỏ túi, đi ra. **Không nói một lời**."* và OBS#1 (trust.vu ≥ 1) *"Vũ kéo bạn ra: 'Tôi tìm thấy một thứ…'"* cùng hiện với Captive có trust ≥ 1 (corpus S3). Sửa: OBS#0 `when trust.vu < 1`.

### L-15 · LOW · "Rút tin báo" của Linh không rút được belief — VERIFIED-RUN

`PR_LINH_DOUBLE_AGENT_FEED` assert `F_PHONE_TAKEN_BY_CAPTIVE_PC = false` RUMOR; nếu Thạch đã có RUMOR(true) từ `A_LINH_HANDS_PHONE_UP` (seg 12) thì equal-rank no-op → Thạch giữ "người mới giấu máy". Tái hiện: `{c_sign, open, share, watch, comply, encourage, tell, volunteer, tell, keep_secret, take, hand_over, VU_TALK:listen, LINH_TRUTH:turn}` → mutation của PR chỉ có `thach.hasCaptiveTip:=false` và −15 SUSPICION. Vô hại (không reader) — residual F-15. Ghi vào `_doc` của PR hoặc bỏ `factId`.

### L-16 · LOW · Tag/npcTag ghi mà không ai đọc (ngoài `epilogueTags`) — VERIFIED-STATIC

- Player tag không nằm trong `epilogueTags` và không reader: `T_O_POINTED_AT_MAI`, `T_C_WARNED_DUC_ABOUT_LINH`, `T_C_CONFRONTED_LINH`, `T_O_TOLD_VU_HIDE` (bản npcTag song sinh của 3 tag sau *có* reader nên Gate A vẫn đúng).
- npcTag không reader: `thach:T_C_CONFRONTED_LINH`, `thach:T_C_SPOKE_FOR_DUC` (relay bởi `PR_LINH_RELAY_CAPTIVE_TAGS` — residual F-16), `thach:T_O_POINTED_AT_MAI`, và ~35 npcTag khác (danh sách đầy đủ trong scratch; phần lớn là "trí nhớ" NPC chưa dùng). Không phải lỗi, nhưng docs/04 hứa "NPC có trí nhớ nhất quán" — trí nhớ đang không ảnh hưởng hành vi. Gợi ý: gate "mỗi npcTag có ≥ 1 reader hoặc được khai `memoryOnly: true`".

### L-17 · LOW · `npcStatus = gone` không bao giờ được ghi — VERIFIED-STATIC

Writers của `npcStatus`: `duc:isolated`, `duc:demoted`, `mai:isolated`, `linh:isolated`. Hệ quả: `STATUS_LABEL.gone`, card Đức "Không còn ở tầng này", guard `¬gone` của `c_with_duc` đều chết; engine bỏ qua action của NPC `gone` — không bao giờ dùng. Hoặc ghi `gone` ở một chỗ có nghĩa (vd. `o_carry_out`), hoặc xóa.

### L-18 · NOTE · `phone.location.terminal` chứa `linh` dù `linh` có reader

`A_LINH_HANDS_PHONE_UP` đọc `phone = linh`; trạng thái chỉ hấp thụ khi `linh.reportsToThach = false` — mà Captive không thể đặt trước seg 16 (writer: `expose`/`turn` tại 16). Khai báo `terminal` do đó là thừa/sai nghĩa; gate T-F vẫn pass vì có reader. Bỏ `linh` khỏi `terminal` để tài liệu đúng.

### L-19 · NOTE · Lệch giữa docs và content mà PO sẽ nhận ra

| Tài liệu hứa | Content | Đề nghị |
|---|---|---|
| docs/01 §2.2: SUSPICION ≥ 70 → "mất quyền đi lại giờ CHIỀU" | không có gate nào đọc SUSPICION ≥ 70 ngoài `A_THACH_RECRUIT` và ESCAPE | ghi vào docs/08 §8 là chưa hiện thực |
| docs/01 §2.2: STRESS cao → "mất lựa chọn" | chỉ ESCAPE đọc `stress < 80`; không choice nào bị ẩn theo STRESS | như trên |
| docs/01 §5 THOÁT Operator "mang hoặc không mang ai"; ĐẢO VAI Operator "bị Thạch bán" | Operator không thể đưa ai; "bị bán" không có (chỉ SUSPICION ≥ 90 hoặc trốn hụt) | như trên |
| docs/02 §5 D4 **chiều**: "C: Linh đề nghị 'giữ hộ'" | `EV_C_D4N_LINH_OFFER` ở D4 **đêm** (fix F-05a) | sửa bảng docs/02 hoặc chú thích |
| docs/02 §6: Operator misinformation "Đức là kẻ rò rỉ" | chết (L-01) | theo L-01 |
| docs/04 §3.4 hàng 5 (Linh báo *tên* Đức → raid seg 9 → Mai lộ sớm) | corpus S5 `docsClaim` thừa nhận không tồn tại; `tests/corpus.mjs` nói "reconciled in docs/08" nhưng docs/08 (vừa tạo) là tài liệu kiến trúc, không có bảng đối chiếu | thêm bảng docsClaim ↔ expect vào docs/07 hoặc docs/08 |
| docs/02 §9: `E_EXPOSURE.checkAt = [18, 20]` | `raid.happened` chỉ ghi tại 18 → 20 thừa (audit đã ghi) | dọn |

### L-20 · NOTE · Toàn bộ nhánh điện thoại của Operator (D5 Vũ cho xem → o_take/o_report/o_hide → send_out/to_thach/to_mai/destroy) bị phễu qua `verify(8) → discredit(9)`

Trong run Operator, Đức luôn kể Linh tại conv 10 (Operator không thể cảnh báo em) và Linh luôn báo chỗ tại 11 ⇒ Thạch lục trần tại 11 **trừ khi** kênh Linh đã bị cắt tại 9. Ngoại lệ duy nhất: `name_duc` (Đức bị cách ly → không kể) + chặn Mai (confront/tip). Random 1.500 run Operator: `EV_S_D5A_PHONE_FOUND_BY_VU` bắn 163 lần, 147 trong đó có `discredit`; Mai tự lấy lại 575; Thạch tịch thu 762. Không phải lỗi — nhưng là một cổ chai thiết kế đáng để PO biết: E_EXPOSURE Operator chỉ 35/2.000 run ngẫu nhiên so với 96/2.000 của Captive, và chuỗi "discredit" là bắt buộc để Operator từng được cầm điện thoại.

### L-21 · NOTE · Các cặp text hơi lệch nhưng chấp nhận được

- `o_run` sau khi đã `send`: main "được tách ra, không bị còng" + extra "Bạn chạy theo Thạch. Anh ta nhanh hơn bạn một cánh cổng" (E24) — hiểu được (chạy, bị giữ ở cổng, rồi được nhận là nguồn).
- `o_surrender` chỉ với bản sao sổ nợ (không gửi gì): được ghi "cột 'nguồn'" dù không phải nguồn của danh sách — GDD cho phép ("bằng chứng hợp tác").
- `EV_S_D7M_RAID` OBS#0 cấp CONFIRMED `F_MAI_LEAKING` cho cả Captive: hợp lệ vì Captive tới raid luôn đã đọc máy (xem L-05).

---

## 3. Những gì đã kiểm và **nhất quán** (để PO không phải kiểm lại)

### 3.1 Tám thay đổi hôm nay (mục (a)–(d) của đề bài)

| Thay đổi | Kết quả |
|---|---|
| `order` cho LINH_PROBE/O_D3A_SEARCH/LINH_TIP/LINH_OFFER (5), THACH_OFFER/C_D3A_SEARCH (−5) | Đúng. Liệt kê mọi slot: cặp forced cùng slot cùng vai thực sự chỉ có seg 7 Captive (SEARCH −5 < WHISPER 5 — đúng narrative "khám xong, Linh kéo ra góc"), seg 3/6/15 với QUOTA_SHIFT (order 0): TRUCK/INVENTORY −5 trước ca, THACH_ORDER −5 trước ca, THACH_OFFER −5 trước ca, DUC_PALE 5 sau ca — đều hợp lý. Các `order` 5 còn lại chỉ để thỏa test ORDER (QUOTA window 3..15 được test coi là chồng cả ngày dù chỉ sáng) — vô hại. Scheduled-vs-forced tại seg 9 (VERIFY_TIP/INTERROGATE_NEWCOMER rank 1 trước THACH_NAME order 10) và seg 13 (MAI_DEAL < PHONE_FOUND theo id, rồi optional PHONE_CONTENTS) đúng ý đồ F-05b/O12. |
| RAID OBS#1 đọc `tag T_O_SENT_EVIDENCE_OUT` thay `operator.cooperationProof` | **Tương đương trong mọi trạng thái tới được.** Writers của `operator.cooperationProof`: `EV_O_D5A_PHONE_CONTENTS/send_out` (13), `EV_O_D6A_EVIDENCE_ROUTE/send` (16) — cả hai ghi **đồng thời** tag ấy; writer thứ ba `EV_S_D7M_RAID/o_surrender` chạy **sau** observation (đúng điểm F-13/O11). Không writer nào của tag mà không ghi flag và ngược lại trước seg 18. Đã chạy 4 run (send_out/surrender, send/run, to_mai/surrender có và không có ledger): tag witness, main variant, extra đều đúng kỳ vọng. Nhánh `IF cooperationProof THEN IF ¬RECOGNIZED → wtag` trong `o_surrender` giờ thừa nhưng vô hại. |
| E_INVERSION captive `always` fallback | Không tới được theo cấu trúc (ending đòi tag) — đúng vai trò fallback cho gate. |
| `A_LINH_HANDS_PHONE_UP` priority 8 → 22 | Đúng. Hai writer `phone.location` cùng pass seg 12 (RAID 10, VU_CHECK 20) chỉ ghi khi `dorm_ceiling`; Linh chỉ ghi khi `linh` → kết quả bất biến, nhưng 22 làm T-G đúng không cần khai báo. Corpus S8 không đổi. |
| 5 khai báo `allowReadBeforeWrite` | **Có căn cứ.** 4 cặp `A_* ← R_SUSPICION_SWEEP`: sweep chỉ ghi `player → thach`; reader cần `vu_locker`/`yard_cache`/`linh`; không action nào trong số đó ghi `phone := player` nên thứ tự không đổi kết quả. Cặp 5 `A_VU_SHIELD_PHONE ← A_VU_HAND_UP`: cùng actor, ≤ 1 action/pass, SHIELD (14) phải được xét trước HAND_UP (15) — chính là cơ chế drive PROTECT_DUC thắng STAY_ABOVE (test CONFLICT). Tôi cũng kiểm **điểm mù của T-G**: đọc flag trong `effects` (`touches`) — A_THACH_RAID/A_VU_CHECK/A_MAI_SEARCH đọc `phone = dorm_ceiling` trong effects; writer cùng pass sau chúng chỉ ghi từ giá trị khác → không hazard. |
| Optional pick commit trước event | Đọc code: pick là transact riêng, event là transact riêng; replay cắt sau pick → `request.kind = choice` (test REPLAY prefix 677 điểm). Không ảnh hưởng content. |
| `npcTag` idempotent | Không content nào dựa vào việc cấp lại npcTag để cập nhật `at`; relay dùng `at` lần đầu — đúng ý (giữ nguồn gốc đầu tiên). |

### 3.2 Reachability 4 ending × 2 vai và các lộ trình khác (VERIFIED-RUN qua `run`; witness path qua `Session.autoplay` trong test ENDINGS + docs/07 §3)

| Lộ trình | Bằng chứng |
|---|---|
| 8 witness path trong `endings.json` | test ENDINGS pass; docs/07 §3 trace; tự đủ với `defaultChoice` (F-19 đã sửa) |
| THOÁT Captive **cùng Đức** (GDD §6.3, audit F-01) | corpus S9 (5 bước có chủ đích; trust.vu = 2 tại seg 13) |
| THOÁT Captive một mình + đã gọi ra ngoài (extra "Thứ bạn gửi ra ngoài vẫn đang đi") | run W1c: `{c_sign, open, keep, sleep, QUOTA: slack@≤6 rồi comply, encourage, tell, volunteer, tell, keep_secret, take, refuse, PATROL2:sleep, call_out, VU_TALK:listen, DUC_ASK:no, go}` → E_ESCAPE, susp 25, stress 65. (Lưu ý: giữ máy sau `call_out` với SUSPICION ≥ 40 bị `R_SUSPICION_SWEEP` +20 — cân bằng chặt nhưng tới được.) |
| THOÁT Operator theo xe Thạch / giả vờ nhận / tự đi lối Vũ | witness; run E22 (`feign`); run E23 (`join, thorough, spare, VU_CONFIDES:keep, refuse, go`) |
| THOÁT Operator + đã gửi bằng chứng | run W2d (`o_harsh … verify, discredit, name_mai, spare, VU_CONFIDES:keep, o_take, send_out, refuse, go`) → E_ESCAPE susp 60 |
| PHƠI BÀY Operator "chỉ có một tên M." + bị còng / + được nhận nhờ sổ nợ | run E10b (`to_mai`, không ledger → DETAINED) / E25 (`to_mai` + `copy` → RECOGNIZED qua choice) |
| PHƠI BÀY Operator "cả tầng" qua `demand_all` (trust.mai ≥ 2: ask + confront) | run E26; card Mai[1] "cùng cả tầng" |
| ĐẢO VAI Captive nhận deal rồi gọi lần cuối D6 chiều → PHƠI BÀY thắng (priority/checkAt) | run W4 → E_EXPOSURE, đúng docs/05 §7.2 |
| CHUYỂN GIAO Operator bị bắt khi trốn rồi `blackmail` (marked := false, `o_cab`) | run W3 → E_TRANSFER, main "Tôi có bản sao sổ nợ", extra "Bạn đã bị bắt khi cố trốn đêm 6" |
| CHUYỂN GIAO Captive bị cách ly sau thẩm vấn (`silent` với SUSPICION ≥ 80) | run E21 → variant "Bạn bị cách ly từ sau cuộc thẩm vấn" |
| Thạch tuyển (quota ≥ 3) / Mai tự lục / Vũ che / Linh nộp / Đức tự gọi / Vũ thấy Đức gọi / Mai đề nghị | corpus S1, S7, S3, S8, S6, O3 — tất cả bắn (T07) |

### 3.3 Tính nhất quán nhân quả đã kiểm (VERIFIED-STATIC + corpus)

- **NPC `isolated`/`demoted` không hành động sai chỗ:** mọi action/propagation có thể gặp NPC bị cách ly đều guard `npcStatus = present` (A_MAI_SEARCH_DORM, A_MAI_APPROACH_OPERATOR, PR_DUC_CONFIDES_LINH, A_DUC_TRY_CALL); `A_LINH_HANDS_PHONE_UP` (12) không thể gặp Linh isolated (16+). Event với NPC cách ly: chỉ L-12/L-13; `EV_C_D6A_DUC_ASK`, `EV_C_D6A_LINH_TRUTH`, `c_tell_duc`, `duc_call` đã guard đúng.
- **`R_MAI_EXPOSED` (rule) vs `A_MAI_APPROACH_OPERATOR` (action, chạy trước rule trong cùng pass):** writer duy nhất của `mai.exposed` trước seg 12 là `name_mai` (seg 9) → Mai isolated tại conv 9 → action tại 12 thấy isolated. `to_thach` (13) sau MAI_DEAL (13 bước 3) → "nhận deal rồi nộp Thạch cùng chiều" là phản bội hợp lệ; T04 cho phép.
- **Điện thoại không bao giờ ở hai nơi; mọi chuyển dịch có actor được phép** (T08, 9+ transition). `EV_S_D5A_PHONE_FOUND_BY_VU` chỉ bắn khi máy thật sự vào `vu_locker` tại conv 12 và không writer nào chạm nó trước bước 3 của seg 13 (seg 13 không có background/forced).
- **Belief sai giá trị:** engine ném với ≥ OBSERVED; mọi RUMOR sai đều attested (T-I2); relay kế thừa attestation. `A_LINH_HANDS_PHONE_UP` cấp Thạch RUMOR(true) `F_PHONE_TAKEN_BY_CAPTIVE_PC` với MISINFO — đúng: Linh OBSERVED=false từ BG_D3M_THEFT và nói dối.
- **`thach.hasCaptiveTip` visibleTo Mai:** hợp lý theo `_doc` (cô làm giấy tờ thẩm vấn); thời điểm đọc (conv 10) sau thẩm vấn sáng D4 (seg 9) trong cả hai vai; `clear` (seg 9) reset về false → Mai dám lục — nhất quán.
- **Knowledge isolation ở tầng content (tiêu chí 5):** quét toàn bộ summary/observation/label/epilogue: ngoài L-09, không text nào nêu giá trị truth người chơi chưa được cấp; các "nhận thức méo" (`EV_C_D3A_SEARCH` OBS#0, `EV_O_D4M_INTERROGATE_NEWCOMER`) chỉ hạ cấp, không nói dối về CONFIRMED; lời Mai "vì tất cả mọi người" được cấp đúng là RUMOR misinfo kèm gợi ý nghi ngờ ("Câu cuối cô ấy nói hơi nhanh") — mẫu tốt. `projection.mjs` không đọc `fact.value`, không lộ `misinformation` (test LEAK + 718 view trong docs/07).
- **Ordering hazards ngoài gate (tiêu chí 3):** đã duyệt tay mọi observation `when` (T-D không kiểm observation): không observation nào đọc flag/tag mà cùng segment mới được ghi ở bước sau nó, trừ L-08 (đọc đúng lúc nhưng thiếu loại trừ). Propagation `PR_DUC_CONFIDES_LINH` (6a, prio 30) trước `A_MAI_SEARCH_DORM` (6a') cùng conv 10 → Linh biết chỗ dù Mai đã lấy → Thạch lục trần hụt tại 11 (corpus S7 kỳ vọng đúng điều này; không +SUSPICION vì Captive không có tip).
- **Engine ↔ docs/08 §1:** khớp từng bước với `runSegment`/`convergence` đã đọc.

---

## 4. Verdict

**MVP logic & content: ACCEPT WITH FIXES.**

**Bắt buộc trước khi chấp nhận (content, không cần đổi engine):**

1. **L-01** — làm `EV_S_D5A_DUC_TAKEN` tới được cho Operator (bỏ `isolated` khỏi `name_duc` + cơ chế L-06) và thêm gate "mỗi event × vai bắn ≥ 1 lần trong corpus".
2. **L-02** — sắp lại card Mai/Linh/Đức: `raid.happened` trước `isolated`/`demoted` (hoặc `¬raid.happened` trên card "lên xe"); thêm gate tĩnh tương ứng.
3. **L-03** — `o_report` cấp Thạch `F_PHONE_EXISTS` CONFIRMED; card Thạch[5] đọc `phone.location = thach`.
4. **L-04** — `c_with_duc` chỉ khả dụng khi Đức `present`/`demoted`.
5. **L-06** — chốt ngữ nghĩa `duc.scapegoated` cho `blame_duc`; thêm run `blame_duc` vào corpus.
6. **L-08** — loại trừ `T_C_TOOK_PHONE`/`T_W_PHONE_CONFISCATED` khỏi observation PATROL2 và extra tương ứng.
7. **L-09** — sửa text/grant OBS#1 của `EV_S_D5A_DUC_TAKEN` (sẽ lộ ngay khi L-01 sửa).

**Nên làm trong cùng đợt (không chặn):** L-05 (card Mai[4], extra STALLED, chú thích `roles`), L-07 (dấu vết cho raid hụt/raid lặng/Linh nộp máy), L-10 (PO quyết "qua Mai"), L-11 (đầu ra cho `pressure`/`point_mai` hoặc ghi nhận lệch docs/04), L-12, L-13, L-14, L-17, L-19 (cập nhật docs/08 §8).

**Không cần PO quyết:** L-15, L-16, L-18, L-20, L-21.

Sau khi sửa 7 mục bắt buộc, chạy lại: `node --test tests/*.test.mjs` (kỳ vọng corpus S5/S8/O6 cần cập nhật `expect`: O6 sẽ có `EV_S_D5A_DUC_TAKEN`, Đức `isolated` tại 11 thay vì 9) và sinh lại `docs/07`.
