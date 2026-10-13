# THE COMPOUND — PHASE 2: KIẾN TRÚC WORLD STATE & EVENT

Phiên bản: 0.2.0 · Ngày: 2026-10-12 · Tác giả: Claude Fable
Trạng thái: **CHỜ REVIEW** (Claude Opus: kiến trúc · ChatGPT: logic) → **CHỜ PO DUYỆT** trước Phase 3.

Phạm vi: chỉ kiến trúc + dữ liệu canonical + test bất biến. **Không có gameplay, không cài đặt gì.**

---

## 0. Bản đồ deliverable

| File | Nội dung | Dòng |
|---|---|---|
| `src/engine/types.ts` | Toàn bộ TypeScript interface: WorldTruth, Belief, Condition AST, Consequence, Event, PropagationRule, DelayedRule, Ending, GameState, CausalOrigin, EngineApi, DialogueProvider | 521 |
| `content/truth.json` | 29 fact canonical (22 thật + 7 decoy) | |
| `content/flags.json` | 24 world flag (trạng thái contingent) | |
| `content/npcs.json` | 5 NPC + tri thức ban đầu, 8 cạnh quan hệ, 8 luật lan truyền | |
| `content/timeline.json` | 6 bối cảnh canonical + 49 event / 131 lựa chọn cho 21 segment | |
| `content/rules.delayed.json` | 15 luật hậu quả trễ | |
| `content/endings.json` | 4 ending máy đọc được + witness path cho mỗi vai | |
| `tests/consistency.test.mjs` | 21 test bất biến, `node:test`, 0 dependency | 407 |

Chạy: `node --test tests/*.test.mjs` (Node ≥ 22). Kết quả hiện tại: **21/21 pass**.

---

## 1. Bảy yêu cầu kiến trúc của PO → cơ chế đáp ứng

| # | Yêu cầu | Cơ chế | Kiểm chứng |
|---|---|---|---|
| 1 | Tách fact bất biến khỏi event contingent | `WorldTruth.facts` (chỉ đọc, không nằm trong save) vs `GameState.flags` (chỉ đổi qua Consequence). Không có toán tử điều kiện nào đọc WorldTruth trực tiếp. | Test 2, 3, 8 |
| 2 | NPC học qua đường truy vết được | NPC chỉ nhận tri thức từ 4 nguồn: `initialBeliefs`, `background.effects`, `Consequence{type:'belief'}`, `PropagationRule`. Test tính tập fact mỗi NPC **có thể** nắm (fixpoint qua đồ thị relay) và từ chối mọi điều kiện/nguồn vượt ngoài tập đó. | Test 9, 10, 11, 12 |
| 3 | Mọi mutation có nguồn gốc nhân quả | `Mutation { cause: CausalOrigin }` với 7 kind. Engine có đúng một điểm vào `apply()`. Ở mức nội dung, chỉ 5 loại container được phép chứa Consequence. | Test 21 |
| 4 | Phân biệt verified / belief / rumor / misinformation | `Belief.status ∈ {RUMOR, OBSERVED, CONFIRMED}` + `believedValue`. `classifyBelief()` suy ra 4 lớp. Bất biến: OBSERVED/CONFIRMED luôn khớp truth; chỉ RUMOR được sai; grant sai phải khai `misinformation: true`. | Test 7 |
| 5 | Chung fact nền, hậu quả có thể khác | Cả hai PC tồn tại trong mọi run. PC không được chơi đi theo **đường mặc định**, mã hóa bằng nhánh `role` trong điều kiện (xem Q1). | Test 13, 14 |
| 6 | Replay bằng bất đối xứng, không twist | 41/49 event là role-exclusive. 10 fact chỉ Operator xác nhận được; chuỗi mắt xích bí ẩn chia đôi theo vai (mục 6). | Test 13, 14 |
| 7 | Tội phạm trừu tượng | Quota là một hành động 4 thái độ, không nội dung. `abstractionCheck: true` bắt buộc trên mọi event. Lexical check từ cấm. | Test 20 |

---

## 2. Ba tầng tri thức (không bao giờ trộn)

```
WorldTruth  ──(belief grant qua event/background/rule/propagation)──▶  KnowledgeState
   │  29 fact, giá trị cố định                                        ├── player.knowledge
   │  KHÔNG có trong GameState                                        └── npcs[x].knowledge
   │  KHÔNG có trong save file
   └── không có toán tử Condition nào đọc trực tiếp
```

**Belief** = `{ factId, status, believedValue, source, acquiredAt, uncertain?, cause }`

| Lớp (suy ra) | Điều kiện | Ai tạo ra |
|---|---|---|
| VERIFIED | status CONFIRMED (luôn khớp truth) | Người nói có thẩm quyền, bằng chứng vật lý |
| BELIEF | status OBSERVED (luôn khớp truth) | Quan sát trực tiếp |
| RUMOR | status RUMOR, khớp truth | Nghe kể, suy đoán đúng |
| MISINFORMATION | status RUMOR, **không** khớp truth | Lời nói dối có chủ đích (`misinformation: true`) hoặc nhận thức méo do STRESS |

**Decoy fact** (7 cái, giá trị `false`) tồn tại để misinformation có chỗ bám: "người mới lảng vảng gần hành chính", "Vũ tìm thấy điện thoại ngày 3", "Đức là kẻ rò rỉ", "Mai làm vì mọi người"... Decoy không bao giờ được xác nhận *đúng*; chỉ có thể bị **bác bỏ** (CONFIRMED với believedValue=false).

**Nhận thức méo**: grant có `uncertainAboveStress: N`. Nếu STRESS ≥ N khi nhận, engine hạ xuống `RUMOR(source='self', uncertain=true)`. Engine không bao giờ hạ cấp belief đã có, không bao giờ nói dối về CONFIRMED.

---

## 3. Condition AST & Consequence

**Condition** — 16 toán tử, JSON thuần, không parser: `always, and, or, not, role, segment, stat, trust, tag, flag, flagCmp, playerBelief, npcBelieves, npcKnowsTag, npcStatus, eventFired`.

**Consequence** — 12 loại nguyên tử + `if/then/else` (nhánh có điều kiện nằm trong nội dung, vẫn deterministic): `stat, setStat, trust, tag, witnessTag, flag, flagAdd, belief, npcTag, npcStatus, schedule, endGame`.

Ví dụ (EV_S_D6N_ESCAPE / "Đi"):
```json
{ "type": "if",
  "when": { "op": "and", "args": [
    { "op": "stat", "stat": "suspicion", "cmp": "<", "value": 70 },
    { "op": "stat", "stat": "stress", "cmp": "<", "value": 80 },
    { "op": "or", "args": [ { "op": "flag", "flag": "escape.vuWillOpen", "equals": true },
                            { "op": "flag", "flag": "escape.withThach", "equals": true },
                            { "op": "flag", "flag": "escape.withDuc", "equals": false } ] } ] },
  "then": [ { "type": "flag", "flag": "player.escaped", "value": true } ],
  "else": [ { "type": "flag", "flag": "player.caught", "value": true }, { "type": "setStat", "stat": "suspicion", "value": 100 } ] }
```
Đọc: đưa Đức đi cùng thì cần Vũ nhìn đi chỗ khác hoặc đi theo xe của Thạch; đi một mình thì chỉ cần không bị để mắt và không gãy.

---

## 4. Vòng đời một segment (đặc tả cho Phase 5)

```
segment s bắt đầu
  1. background[s].effects            (cause: background)
  2. forced events tại s (theo thứ tự khai báo) → observations → player chọn
  3. scheduled events có at == s
  4. player chọn ≤ 1 optional event (hoặc bỏ qua)
  5. ENDING CHECK: với mỗi ending có s ∈ checkAt, theo priority tăng dần → endGame nếu đúng
  6. CONVERGENCE POINT:
     a. PropagationRule (assert tại s; relay: belief của `from` có acquiredAt ≤ s − delay)
     b. DelayedRule có earliest ≤ s ≤ latest, chưa fire, theo priority tăng dần, rồi id
     c. clamp stat về [0,100]; trust về [−3,3]
  7. s := s + 1
```
Mọi bước 1–6 đều đi qua `EngineApi.apply(state, consequence, cause)` và ghi vào `mutationLog`. Không có RNG: mọi thứ "ngẫu nhiên" (khám đồ đêm) là luật có ngưỡng (`R_SUSPICION_SWEEP`).

---

## 5. Timeline 7 ngày (canonical)

Segment = (ngày−1)×3 + {sáng 0, chiều 1, đêm 2}. **In đậm** = bối cảnh xảy ra trong mọi run.

| Ngày | Sáng | Chiều | Đêm |
|---|---|---|---|
| 1 | **Lô mới vào.** Nhập trại (cả hai) | C: Linh gọi đúng tên · O: Mai đưa hợp đồng, có tên bạn · C: Đức không có suất ăn | C: xem tuần tra · O: uống với Vũ |
| 2 | **Xe tải đếm giường.** Ca làm · C: thấy đếm người · O: ký phiếu "kiểm kê tài sản" | **Đức kể Linh muốn gọi mẹ.** C: Đức tâm sự · O: Mai rời bàn 14:00 | **Ông Chủ báo Thạch có rò rỉ.** C: Linh dò hỏi · O: nghe lén |
| **3** | **Đức lấy điện thoại, giấu trần. Linh thấy. Thạch bịa cớ.** C: Đức tái mặt · O: Thạch giao lệnh thật · O: Mai hoảng | **KHÁM XÉT.** C: che/đứng yên/xung phong · O: kỹ/qua loa/quan sát Linh · C: Linh thì thầm | C: Đức thú nhận (trust ≥2) · O: nhận giấy báo của Linh về "người mới" |
| 4 | **Chỉ tiêu tăng (phạt tập thể).** C: bị thẩm vấn (nếu tin tới Thạch) · O: thẩm vấn người mới / kiểm tra sổ · O: Thạch đòi một cái tên | C: quyết định với điện thoại · C: Linh đề nghị "giữ hộ" · O: sổ nợ · O: hỏi Đức | C: xem tuần tra lần 2 → biết lối · O: Vũ tâm sự → biết lối |
| 5 | *Convergence D4 đêm / D5 sáng:* Thạch lục trần (nếu Linh đã báo chỗ) **hoặc** Vũ tìm thấy khi kiểm tra định kỳ | **ECHO SLICE.** Vũ cầm điện thoại / Đức bị bắt · O: Mai đề nghị · C,O: đọc nội dung điện thoại | C: Vũ nói chuyện ngoài sân · O: thay Vũ nhận giấy của Linh |
| 6 | O: Thạch tiết lộ chuyển giao + đề nghị cùng đi · C: Thạch đề nghị "lên team" | C: xử lý Linh · C: gọi lần cuối · C: Đức xin đi cùng · O: gửi bằng chứng | **CỬA SỔ TRỐN.** Ending check #1 |
| 7 | Truy quét **hoặc** lệnh đóng gói · O: bị gọi lên (nếu bị đánh dấu) | Lên xe | Ending check cuối |

Chi tiết mọi lựa chọn và hậu quả: `content/timeline.json`.

---

## 6. Bí ẩn "Ngày thứ bảy": chuỗi mắt xích và ai thấy gì

| Mắt xích | Captive học ở đâu (cao nhất) | Operator học ở đâu (cao nhất) |
|---|---|---|
| Chuyển giao ngày 7 | Nội dung điện thoại (CONFIRMED) · Lệnh đóng gói D7 | Mai (D5) hoặc Thạch (D6) (CONFIRMED) |
| Khám xét là săn kẻ rò rỉ | **Không bao giờ** | Thạch nói thẳng D3 sáng (CONFIRMED) |
| Điện thoại của Mai | Chữ ký "M." (OBSERVED, không hơn) | Mai thú nhận D5 (CONFIRMED) |
| Ai lấy điện thoại | Đức thú nhận D3 đêm (CONFIRMED) | Ép Đức D4 (CONFIRMED) hoặc Linh thú nhận D5 đêm |
| Điện thoại ở đâu | Đức (CONFIRMED) | Vũ cho xem D5 (CONFIRMED) |
| Linh là tai mắt | Vạch mặt / quay cô ấy D6 (CONFIRMED) | Sổ nợ cột "thưởng" D4 (CONFIRMED) |
| Ngày thả của Linh là dối | Vũ gợi ý D5 (RUMOR, không hơn) | Thạch nói D4 (CONFIRMED) |
| Vũ từng là người bị giam | Vũ tự kể D5 (CONFIRMED) | Vũ tự kể D4 đêm (CONFIRMED) |
| Thạch định bỏ đi một mình | **Không bao giờ** | D6 sáng (CONFIRMED) |

**Hiểu lầm cố ý (misinformation) theo vai:**
- Captive: "Vũ tìm thấy điện thoại ngày 3" (chỉ khi STRESS ≥ 60) · "Linh là đồng minh" (trust ban đầu +1).
- Operator: giấy báo "người mới lảng vảng gần hành chính" (Linh nói dối dù **biết** người mới không lấy — `BG_D3M_THEFT` cho Linh OBSERVED=false) · "Đức là kẻ rò rỉ" (kết luận sai của Thạch) · "Mai làm vì mọi người".

**Thứ phát hiện khi chơi lại** (bắt buộc theo brief): Captive sống cuộc khám xét như trừng phạt vì "ai đó ăn cắp"; Operator biết Thạch không hề tìm điện thoại. Operator nhận giấy báo mà không biết Linh viết nó để che cho Đức; Captive thấy Linh thì thầm sau khám xét và bị gọi lên sáng hôm sau.

---

## 7. Lan truyền tri thức NPC (8 luật)

| Luật | Từ → Đến | Khi | Hiệu ứng |
|---|---|---|---|
| PR_LINH_TIP_CAPTIVE | Linh → Thạch, seg 8 | run Captive; Linh còn báo tin; trust Linh < 2 **hoặc** Linh thấy bạn che Đức | Misinformation nhắm vào người mới → `thach.hasCaptiveTip` → thẩm vấn D4 |
| PR_LINH_RELAY_CAPTIVE_TAGS | Linh → Thạch, trễ 1 | Linh còn báo tin | Thạch biết bạn che Đức / cãi Linh / bênh Đức |
| PR_DUC_CONFIDES_LINH | Đức → Linh, seg ≥ 10 | Đức chưa bị cảnh báo về Linh; điện thoại còn trên trần | Linh biết chỗ giấu |
| PR_LINH_RELAY_LOCATION | Linh → Thạch, trễ 1 | Linh còn báo tin | Thạch biết **chỗ**, không biết **ai** → lục trần D5, quy Đức là kẻ rò rỉ (sai) |
| PR_VU_REPORTS_PHONE | Vũ → Thạch, seg 14 | Vũ đang giữ; không ai cho anh ta lý do giữ im | Điện thoại lên Thạch |
| PR_LINH_DOUBLE_AGENT_FEED | Linh → Thạch, seg 17 | Captive đã quay Linh | Rút tin báo cũ |
| PR_THACH_TELLS_VU_SCAPEGOAT | Thạch → Vũ | Đức bị quy | Vũ tin (sai) Đức là kẻ rò rỉ |
| PR_THACH_TELLS_VU_TRANSFER | Thạch → Vũ, seg 18 | Không truy quét | Vũ biết chuyển giao |

Cắt cạnh = dòng chảy dừng: `linh.reportsToThach=false` (vạch mặt, quay cô ấy, Operator nói thật, Operator bác bỏ nguồn) chặn 4 luật đầu.

---

## 8. Hậu quả trễ (15 luật) — ba cầu nối ≥ 2 ngày

| Hạt giống (ngày) | Luật | Hiệu ứng (ngày) |
|---|---|---|
| Quan hệ với Linh D1–D3 | R_INTERROGATION_D4 | Bị thẩm vấn D4; có thể bị cách ly → mất cửa sổ trốn D6 |
| Che Đức D3 / cảnh báo về Linh D3 | PR_DUC_CONFIDES_LINH → R_THACH_RAID_CEILING | Đức bị bắt D5 **hay** Vũ tìm thấy D5 |
| Tuân thủ chỉ tiêu D2–D4 (`quota.score ≥ 3`) | R_THACH_DEAL_OFFER | Đề nghị "lên team" D6 → mầm Đảo vai |
| Hỏi Mai "chị mất gì" D3 | R_MAI_DEAL | Mai đề nghị D5 |
| Giữ điện thoại khi bị để mắt (bất kỳ đêm) | R_SUSPICION_SWEEP | Mất điện thoại, +20 SUSPICION |
| Bằng chứng ra ngoài ≤ D6 | R_EXPOSURE_RAID | Truy quét D7 |

Test 17 bắt buộc ≥ 3 luật có khoảng cách hạt giống → hiệu ứng ≥ 6 segment.

---

## 9. Bốn ending (máy đọc được)

| Ending | checkAt | Ưu tiên | Điều kiện | Cơ chế kích hoạt (khác nhau về bản chất) |
|---|---|---|---|---|
| THOÁT | 17 (đêm 6) | 1 | `player.escaped == true` | Lối ra vật lý + ngưỡng stat |
| PHƠI BÀY | 18, 20 | 2 | `raid.happened == true` | Dòng thông tin ra ngoài |
| ĐẢO VAI | 20 | 3 | Captive: tag `T_C_ACCEPTED_THACH_DEAL` · Operator: `operator.marked` | Lựa chọn đạo đức / bị tổ chức nuốt |
| CHUYỂN GIAO | 20 | 4 | `always` | Mặc định |

Test 19 kiểm tra: 4 id, ưu tiên duy nhất, trigger không trùng, mỗi ending có witness path cho **cả hai vai** với event/choice tồn tại, đúng vai, đúng thứ tự thời gian. Ví dụ witness path Captive → PHƠI BÀY: chia suất ăn D1 → động viên Đức D2 → che Đức D3 → giữ bí mật D3 đêm → tự giữ điện thoại D4 → gọi ra ngoài D5 → kéo mọi người ra chỗ được đếm D7.

**Giới hạn của Phase 2:** witness path mới được kiểm tra *tĩnh* (tồn tại, thứ tự, vai). Kiểm tra *động* (mô phỏng path qua engine, xác nhận stat không vượt ngưỡng) cần evaluator → Phase 5 (xem Q3).

---

## 10. Kết quả test bất biến (21/21)

| # | Test | Gate |
|---|---|---|
| 1 | ID duy nhất, đúng prefix | — |
| 2 | Decoy = false, không holder, không confirmable | B, D4 |
| 3 | truth.initialHolders ↔ npcs.initialBeliefs khớp chính xác; belief ≥ OBSERVED khớp truth | C |
| 4 | Mọi fact/flag/npc/event/tag được tham chiếu đều tồn tại | — |
| 5 | Flag enum chỉ nhận giá trị khai báo | — |
| 6 | **Gate A**: mọi choice mutate state; event không choice phải grant; mọi tag/flag ghi ra đều được đọc | A |
| 7 | OBSERVED/CONFIRMED khớp truth; RUMOR sai phải khai misinformation | D4 |
| 8 | Background không đọc/ghi player | 1 |
| 9–12 | **Gate C**: npcBelieves thỏa mãn được; NPC không thể là nguồn fact nó không thể biết (trừ khi nói dối có khai); npcKnowsTag có nguồn; propagation đi trên cạnh quan hệ có thật | C |
| 13 | **Gate B**: tập vai xác nhận được mỗi fact khớp khai báo | B |
| 14 | ≥ 1 fact chỉ Operator xác nhận; ≥ 40% event role-exclusive | 6 |
| 15 | Slot hợp lệ; scheduled event có người lên lịch, sau thời điểm lên lịch; `abstractionCheck` | E, G |
| 16 | `reads` của rule khớp chính xác điều kiện | 3 |
| 17 | Rule không fire trước khi hạt giống tồn tại; ≥ 3 cầu nối ≥ 2 ngày | D |
| 18 | **Gate E**: slice phủ cả 3 segment ngày 3 cho cả hai vai + echo D5; có misinformation; có lựa chọn đánh đổi quan hệ | E |
| 19 | **Gate F**: 4 ending phân biệt, witness path hợp lệ cho mỗi vai | F |
| 20 | **Gate G**: từ cấm, attestation | G |
| 21 | Chỉ 5 loại container được chứa mutation | 3 |

Bảy lỗi dữ liệu thật đã bị test bắt và sửa trong quá trình viết (Mai thiếu một fact; 3 flag ghi mà không ai đọc; Linh/Mai/Đức là nguồn của fact họ chưa thể biết; 4 fact khai "confirmable" nhưng chưa có event xác nhận). Đó là bằng chứng bộ test có răng.

---

## 11. Câu hỏi kiến trúc còn mở — CẦN PO DUYỆT

| # | Câu hỏi | Đề xuất |
|---|---|---|
| **Q1** | **PC không được chơi đi theo đường nào?** Hiện mã hóa bằng nhánh `role` trong điều kiện (vd. giấy báo của Linh luôn tới Thạch trong run Operator). Phương án khác: file `defaults.json` liệt kê tag mặc định của PC kia, engine mô phỏng như một agent ảo. | Giữ nhánh `role` cho MVP (đơn giản, test được). Chuyển sang `defaults.json` nếu Phase 3 thấy > 10 điều kiện phải nhân đôi. |
| **Q2** | **Hai forced event cùng segment** (D3 chiều Captive: khám xét rồi Linh thì thầm). Thứ tự hiện theo thứ tự khai báo trong file. Có cần trường `order` tường minh? | Thêm `order?: number`, mặc định theo file. |
| **Q3** | **Kiểm tra ending động.** Gate F "mechanically reachable" mới chứng minh tĩnh. Chứng minh động cần evaluator Condition + applier Consequence (≈ 150 dòng, chính là lõi engine). Viết sớm trong Phase 3 như "reference evaluator chỉ cho test"? | **Có**, viết trong Phase 3, giới hạn ở test, không UI. |
| **Q4** | **Clamp và cường độ stat.** Ngưỡng hiện đặt tay (SUSPICION 40/70/90, STRESS 60/80). Chưa cân bằng. | Giữ, cân bằng ở Phase 5 bằng mô phỏng witness path. |
| **Q5** | **Save format**: GameState + checksum; WorldTruth xác minh bằng `contentVersion`. Đổi nội dung → save cũ vô hiệu. Chấp nhận cho MVP? | Chấp nhận. |
| **Q6** | **Trust 2 chiều?** Hiện chỉ NPC → player. Quan hệ NPC ↔ NPC là cạnh tĩnh có `delay`. Đủ cho MVP? | Đủ. Không thêm. |
| **Q7** | **Fact "lưỡng vai"**: một số fact chỉ Captive đạt OBSERVED (chủ điện thoại = "M."), chỉ Operator đạt CONFIRMED. Đây là cố ý (bất đối xứng). PO đồng ý rằng Captive *không bao giờ* biết chắc khám xét là săn rò rỉ, và *không bao giờ* biết Thạch định bỏ đi? | Đồng ý — đó là lý do để chơi lại. |

Nếu không có ý kiến, Phase 3 đi theo cột "Đề xuất".

---

## 12. Phase 3 (sau khi duyệt)

1. Vertical slice ngày 3 ở mức nội dung đầy đủ: lời thoại canonical cho 10 event slice + 2 echo, mỗi vai 15–20 phút.
2. Reference evaluator (Q3) + test động: chạy 8 witness path qua engine, xác nhận 4 ending đạt cho 2 vai.
3. Bảng truy vết: với mỗi choice trong slice → rule/condition nào đọc nó → segment nào.
4. Nộp Claude Opus (kiến trúc) và ChatGPT (logic).
