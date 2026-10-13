# THE COMPOUND — ĐÁNH GIÁ: NGUYÊN TẮC "SINGLE-PLAYER / EMERGENT SIM" TRÊN KIẾN TRÚC PHASE 2

Ngày: 2026-10-12 · Người lập: Claude Fable · Đáp ứng: PRODUCT DIRECTIVE — SINGLE PLAYER FIRST
Trạng thái: **ĐÁNH GIÁ, KHÔNG SỬA CODE/CONTENT. CHỜ PO DUYỆT.** Checksum Phase 2 (`docs/phase2-checksums.txt`) vẫn khớp.

Ràng buộc giữ nguyên: 2 vai · 5 NPC · 7 ngày · 4 ending · 0 dependency · không implementation.

---

## 0. Kết luận trước

Kiến trúc Phase 2 là một **máy trạng thái có truy vết** (traceable state machine): mọi thay đổi đều có `CausalOrigin`, tri thức NPC được kiểm chứng là không toàn tri, hậu quả trễ có hạt giống. Nền đó phục vụ tốt 5/7 ưu tiên của directive (2, 4, 5, 7 mạnh; 3 và 6 một phần).

Nhưng Phase 2 **chưa có NPC tự trị** (ưu tiên 1). NPC hiện là *vật thể phản ứng*: họ chỉ đổi trạng thái khi một `DelayedRule` hay `PropagationRule` do tác giả viết sẵn bắn ra. `privateMotive` của mỗi NPC là **văn bản mô tả**, không phải dữ liệu engine đọc được. Do đó "thế giới tự vận động" hiện nay là **6 bối cảnh cố định + 15 luật viết tay**, không phải mô phỏng.

Khoảng cách lớn nhất không nằm ở số lượng content mà ở **một tầng còn thiếu: NPC Intent** (động cơ → hành động, được đánh giá tại convergence point). Tầng này có thể bổ sung bằng cách **tổng quát hóa `DelayedRule`** thay vì thêm hệ thống mới. Ước lượng: không tăng tổng số luật (thay ~5 delayed rule bằng ~12 hành động NPC gắn 5 động cơ), đúng tinh thần "depth over volume".

---

## 1. Bảy ưu tiên → kiến trúc hiện có → khoảng cách

Ký hiệu: ✅ đã có, cơ chế được test · 🟡 có một phần · ❌ thiếu

| # | Ưu tiên | Đã có trong Phase 2 | Khoảng cách |
|---|---|---|---|
| 1 | NPC tự trị | `NpcState{trust,status,knowledge}` · đồ thị quan hệ 8 cạnh có `channel`+`delay` · 8 PropagationRule (chỉ chuyển tri thức) · `npcStatus` 4 trạng thái | ❌ **G1** Không có động cơ dạng dữ liệu. ❌ **G2** NPC không chọn hành động; mọi hành vi NPC là DelayedRule toàn cục do tác giả gán kết quả trước (vd. `R_THACH_RAID_CEILING` luôn quy Đức). ❌ **G3** Điều kiện của rule "NPC làm X" được phép đọc bất kỳ flag/stat nào kể cả thứ NPC không thể quan sát → nguy cơ toàn tri (R4 của GDD) chưa bị test chặn ở tầng hành vi, chỉ bị chặn ở tầng tri thức. |
| 2 | Bất đối xứng & chơi lại | 41/49 event role-exclusive · `confirmableBy` theo vai · 10 fact chỉ Operator xác nhận · 7 decoy · echo slice D5 | 🟡 **G4** Chơi lại *cùng vai* lần 2 sẽ thấy đúng 15 luật đó bắn lại; không có RNG (cố ý) nên độ biến thiên chỉ đến từ không gian trạng thái. Không gian đó hiện hẹp vì NPC không phản ứng khác nhau theo tri thức của họ. |
| 3 | Narrative động theo state | `Observation.when` (văn bản có điều kiện) · `if/then/else` trong consequence · `schedule` · `mutationLog` đầy đủ | 🟡 **G5** Chưa có đặc tả **projection** từ `mutationLog`/belief ra thứ người chơi đọc được ("Sổ ghi nhớ" R8, epilogue card 5 NPC). Dữ liệu có, phép chiếu chưa định nghĩa. |
| 4 | Bất định tâm lý | RUMOR/OBSERVED/CONFIRMED · decoy · `misinformation` attestation · `uncertainAboveStress` · belief không bao giờ hạ cấp | ✅ Đủ cho MVP. Ghi chú: STRESS chỉ méo nhận thức lúc nhận belief; chưa ảnh hưởng lựa chọn hiển thị hay cách NPC đọc người chơi. Không đề xuất mở rộng. |
| 5 | Hậu quả nhân quả bền | `Mutation{cause}` 7 kind · 15 DelayedRule có `reads` được test khớp · ≥3 cầu nối ≥2 ngày · `once:true` | 🟡 **G6** Mọi hậu quả đều được *liệt kê*. Không có hậu quả nào *phát sinh* từ hai hành vi NPC gặp nhau. Tất cả DelayedRule đều `once` → không có áp lực lặp (trừ `R_SUSPICION_SWEEP` theo cửa sổ). |
| 6 | Agency có nghĩa | Gate A: mọi choice mutate state · `phone.location` 9 trạng thái là tài nguyên chung | 🟡 **G7** Agency tập trung quanh điện thoại; `EV_S_QUOTA_SHIFT` 4 thái độ chỉ ra `quota.score`+stat, không chạm NPC. **G8** GDD 2.1 hứa "một hành động chính (chọn địa điểm/NPC/việc)" mỗi segment; Phase 2 chỉ có "chọn ≤1 optional event tại slot". Chưa có hành động hướng NPC ngoài slot (nói chuyện với X, đưa Y cho Z). |
| 7 | Nhiều cách hiểu một sự kiện | `BG_D3M_THEFT` được 4 tác nhân hiểu 4 kiểu · mục 6 tài liệu kiến trúc (mắt xích theo vai) | ✅ ở tầng tác giả. 🟡 **G9** Cách hiểu của NPC là *viết sẵn*, không suy ra từ belief của họ: Vũ phản ứng với điện thoại như nhau dù anh ta tin hay không tin Đức là kẻ rò rỉ. |

### Ba yêu cầu bổ sung của directive

| Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|
| Thế giới tiếp tục vận động không cần người chơi | 🟡 | Mô phỏng tay "người chơi thụ động" (Captive, không chọn gì): Linh báo tin D3 đêm (trust 1 < 2) → thẩm vấn D4 → Đức tâm sự Linh D4 → Thạch biết chỗ → lục trần D5 → Đức bị bắt → chuyển giao D7. Chuỗi chạy trọn. **Nhưng** động cơ của Mai không bao giờ tự vận động: cô ấy *mất điện thoại của chính mình*, biết nó chứa bằng chứng, mà không có luật nào cho Mai đi tìm. `evidence.outside` chỉ người chơi đặt được. |
| NPC có động cơ độc lập, tri thức giới hạn, trí nhớ nhất quán | Động cơ ❌ · Tri thức ✅ · Trí nhớ ✅ | Tri thức: Test 9–12. Trí nhớ: `TagRecord{at,source,via}` + belief không hạ cấp = nhất quán theo định nghĩa. Động cơ: chỉ là `LocalizedText`. |
| Lựa chọn ảnh hưởng mô phỏng, không chỉ lời thoại | ✅ (Gate A) nhưng chưa đủ | Gate A chứng minh choice đổi *state*. Chưa có test nào chứng minh choice đổi *hành vi NPC*, vì chưa có hành vi NPC để đổi. |

---

## 2. Đề xuất lấp khoảng cách — tối thiểu, tái dùng kiến trúc hiện có

Nguyên tắc: **không thêm hệ thống mới, tổng quát hóa hệ thống có sẵn.** Mọi thứ dưới đây là đề xuất thiết kế; chưa sửa `types.ts`.

### 2.1 Tầng NPC Intent = `DelayedRule` + `actor` (lấp G1, G2, G6, G9)

```
NpcDrive   { id, npc, name, description }                       // 2–3 động cơ mỗi NPC, 5 NPC
NpcAction  = DelayedRule + { actor: NpcId, drive: DriveId, repeatable?: boolean, cooldown?: number }
CausalOrigin += { kind: 'npc_action'; actor: NpcId; actionId; at }
```

- Đánh giá tại convergence point, **sau** propagation (6a), **trước** delayed rule toàn cục (6b). Thứ tự giữa các NPC: theo `priority`, rồi thứ tự NPC cố định (thach, vu, mai, linh, duc). Deterministic, không RNG.
- Mỗi NPC **tối đa một hành động** mỗi convergence point (giống người chơi một hành động mỗi segment). Cạnh tranh giữa drive của cùng NPC giải quyết bằng `priority`.
- Khi hai NPC muốn cùng một tài nguyên (vd. `phone.location`), NPC chạy trước thắng; NPC chạy sau thấy điều kiện không còn đúng. **Đây chính là nguồn emergence**: kết quả phụ thuộc ai biết gì vào lúc nào, không phụ thuộc tác giả định sẵn.

### 2.2 Ràng buộc tầm nhìn (lấp G3)

- `FlagDefinition += { visibleTo: 'all' | NpcId[] | 'player' }`. Ví dụ `phone.location` chỉ visible với người đang giữ; `thach.hasCaptiveTip` visible với Thạch, Vũ.
- **Test mới (Gate C mở rộng):** điều kiện của `NpcAction` chỉ được chứa `npcBelieves/npcKnowsTag/npcStatus` với `npc == actor`, `trust` với `npc == actor`, `flag` có `visibleTo` chứa actor, `segment`, `eventFired` của event actor có mặt. **Cấm** `stat` (STRESS/SUSPICION của người chơi) trừ khi actor là Thạch/Vũ đọc SUSPICION (tổ chức) — SUSPICION theo D1 là chỉ số của tổ chức nên hợp lệ.
- Hệ quả: NPC chỉ hành động trên điều họ *tin*, kể cả khi tin sai. Thạch có thể lục trần vì Linh báo, hoặc thẩm vấn người mới vì tin báo giả. Cùng một luật, hai mục tiêu khác nhau → G9 được lấp bằng dữ liệu, không bằng nhánh.

### 2.3 Thay thế, không cộng thêm

| DelayedRule hiện tại | Trở thành |
|---|---|
| `R_THACH_RAID_CEILING`, `R_THACH_RECOVERS_PHONE_QUIET` | Thạch · drive FIND_LEAK · action "lục nơi tôi tin là có" (mục tiêu = fact Thạch tin, không cố định Đức) |
| `R_THACH_DEAL_OFFER` | Thạch · drive EXIT_WITH_MONEY · action "tuyển người tuân thủ" |
| `R_VU_CEILING_CHECK` | Vũ · drive STAY_ABOVE · action "kiểm tra định kỳ"; `PR_VU_REPORTS_PHONE` thành action "nộp lên" có đối trọng drive PROTECT_DUC |
| `R_MAI_DEAL` | Mai · drive SELF_RESCUE · action "tiếp cận người có thể có điện thoại" (**mới có thể nhắm Vũ hoặc Đức**, không chỉ Operator) |
| (chưa có) | Mai · action "tự lục ký túc lúc 14:00" nếu tin điện thoại ở ký túc — lấp lỗ hổng "Mai không đi tìm đồ của mình" |
| `R_LINH_PULLED_OUT`, propagation của Linh | Linh · drive EARN_RELEASE · action "báo chuyện nhỏ"; drive PROTECT_DUC (yếu hơn) giải thích vì sao báo *chỗ* không báo *người* |
| (chưa có) | Đức · drive CALL_MOTHER · action "thử gọi" khi điện thoại trong tầm, pin còn → có thể bị Vũ thấy → `R_DUC_CALLED_HOME` trở thành hệ quả phát sinh |

Ước lượng: 5 drive × ~2 = 10–12 action, **bỏ 6 delayed rule** → tổng luật ≈ 15 + 6 = 21, không phải 15 + 12 = 27. Nội dung event giữ nguyên 49.

### 2.4 Projection cho narrative (lấp G5) — chỉ đặc tả

- "Sổ ghi nhớ" = lọc `mutationLog` theo `cause.kind ∈ {choice, observation}` + belief của người chơi, hiển thị theo segment. Không thêm state.
- Epilogue card NPC = hàm thuần của `NpcState` cuối + tập `npc_action` đã bắn của NPC đó. Nghĩa là **epilogue kể lại điều NPC đã làm**, không phải văn bản chọn theo ending.

### 2.5 Hành động hướng NPC (G7, G8) — **đề xuất hoãn**

Cho phép "nói chuyện với X" tự do mỗi segment là mở rộng kỹ thuật thật sự (cần hệ thống địa điểm + lịch NPC). Directive nói "không mở rộng scope kỹ thuật". Đề xuất: giữ mô hình slot của Phase 2 cho MVP; ghi nhận G8 là sai lệch so với GDD 2.1 để PO quyết sau khi thấy scenario mục 3 chạy.

### 2.6 Điều kiện bắt buộc: reference evaluator (Q3 của Phase 2)

Emergence **không thể kiểm chứng tĩnh**. Test 1–21 chỉ chứng minh dữ liệu nhất quán; không chứng minh hai drive gặp nhau cho kết quả nào. Reference evaluator (~150 dòng, chỉ cho test, không UI) chuyển từ "nên có" thành **bắt buộc** trước khi viết bất kỳ NpcAction nào. Mọi scenario đi kèm **bảng kết quả** (mục 3.4) được test khẳng định.

---

## 3. Một scenario chơi được: "AI ĐANG TÌM CHIẾC ĐIỆN THOẠI?"

Khung thời gian: D3 chiều (seg 7) → D5 sáng (seg 12). Vai minh họa: **Captive** (vai Operator chạy cùng luật, điểm nhìn khác). Toàn bộ event dùng là event **đã có** trong `timeline.json`; thứ mới là NPC hành động theo drive.

### 3.1 Bốn hệ thống tương tác

| Hệ thống | Phần đã có | Phần cần tầng Intent |
|---|---|---|
| **S1 Tri thức & lan truyền** — ai biết điện thoại ở đâu | `PR_DUC_CONFIDES_LINH`, `PR_LINH_RELAY_LOCATION` (delay 1), belief của Mai/Thạch/Vũ | Không đổi |
| **S2 Tài nguyên tranh chấp** — `phone.location` 9 trạng thái | Flag + `R_SUSPICION_SWEEP` | Ba NPC có drive muốn *di chuyển* nó: Mai (lấy lại), Vũ (giữ im / nộp), Thạch (tịch thu) |
| **S3 Trust** — NPC làm gì *vì* hay *chống* người chơi | `trust` −3..3, ngưỡng trong `PR_LINH_TIP_CAPTIVE` (<2), `PR_VU_REPORTS_PHONE` (≥2) | Trust trở thành đầu vào của drive: Vũ ≥2 → PROTECT_DUC thắng STAY_ABOVE |
| **S4 SUSPICION của tổ chức** — áp lực thời gian | `R_SUSPICION_SWEEP` (≥40 & đang giữ), `BG_D4M_QUOTA_RAISED` | Thạch · FIND_LEAK đọc SUSPICION để chọn cường độ: ≥40 thẩm vấn người mới, <40 chờ tin |

### 3.2 Trạng thái khởi điểm (sau `BG_D3M_THEFT`, seg 6 — canonical, mọi run)

- `phone.location = dorm_ceiling`. Đức CONFIRMED chỗ giấu. Linh OBSERVED "Đức bỏ gì vào túi" (không biết là gì). Mai CONFIRMED mất điện thoại, **không biết ai lấy**. Thạch CONFIRMED có kẻ rò rỉ, tin "mất điện thoại" là cớ do mình bịa. Vũ chưa biết gì.
- Người chơi Captive: trust Linh +1, Đức +1, Vũ −1. SUSPICION 0–20 tùy D1–D2.

### 3.3 Drive của 4 NPC trong scenario (dữ liệu, không code)

| NPC | Drive (ưu tiên) | Hành động khi điều kiện đúng (chỉ đọc điều NPC tin) |
|---|---|---|
| **Mai** | SELF_RESCUE (1) | a) Tin điện thoại ở ký túc (RUMOR trở lên) → **tự lục lúc 14:00** (seg chiều) → nếu `phone.location == dorm_ceiling` thì lấy lại: `phone.location = mai`, Mai CONFIRMED. b) Chưa biết chỗ, nhưng biết Vũ đang giữ (qua resents-edge, Vũ→Mai không có cạnh nên **không biết**; chỉ biết nếu Operator nói) → đề nghị Vũ. |
| **Linh** | EARN_RELEASE (1) · PROTECT_DUC (2) | Biết chỗ → báo *chỗ* lên Thạch (có sẵn). Biết người chơi che Đức → báo *người chơi* thay vì Đức (có sẵn, misinformation). PROTECT_DUC chặn việc báo *tên Đức* trừ khi `linh.reportsToThach` và trust người chơi <0. |
| **Vũ** | STAY_ABOVE (1) · PROTECT_DUC (2) | Kiểm tra trần seg 12 (có sẵn). Nếu giữ điện thoại: nộp lên seg 14 **trừ khi** trust người chơi ≥2 **hoặc** Vũ CONFIRMED `F_DUC_WANTS_TO_CALL_MOTHER` (mới: Vũ thấy mình trong Đức) → giữ im thêm 1 ngày → tạo cửa sổ cho `R_DUC_CALLED_HOME`. |
| **Thạch** | FIND_LEAK (1) · EXIT_WITH_MONEY (2) | Mục tiêu = tác nhân Thạch *tin* liên quan: có tin báo người mới → thẩm vấn người mới; tin chỗ giấu → lục chỗ đó và quy **người Thạch tin** (Đức nếu Linh báo Đức; "người mới" nếu có tip giả; **không ai** nếu chỉ biết chỗ) → `duc.scapegoated` không còn là hằng số. |

### 3.4 Cùng một thế giới, kết quả khác nhau — bảng kỳ vọng (evaluator phải xác nhận)

| Người chơi Captive làm gì D3–D4 | Chuỗi NPC phát sinh | `phone.location` seg 12 | Hệ thống tương tác |
|---|---|---|---|
| **Không làm gì** (bỏ qua mọi optional) | Linh báo tip (trust 1<2) seg 8 → Thạch thẩm vấn người mới seg 9 → Đức tâm sự Linh seg 10 → Linh báo chỗ seg 11 → Thạch lục trần seg 12, quy Đức | `thach`, Đức isolated | S1→S4→S1→S2 |
| **Che Đức khi khám + cảnh báo Đức về Linh** (`cover`, `warn_linh`) | Linh thấy che → báo người chơi (misinfo) → thẩm vấn D4 nhưng Đức **không** kể Linh → Thạch không biết chỗ → Vũ tìm thấy seg 12, giữ im | `vu_locker`, Đức present | S1 bị cắt → S2 chuyển sang Vũ |
| **Như trên + chia suất ăn D1, xem tuần tra, trust Vũ lên 2 qua D4N** | Vũ tìm thấy seg 12 → PROTECT_DUC thắng → **không nộp** seg 14 → Đức gọi được D5 chiều → `R_DUC_CALLED_HOME` | `vu_locker` → `duc` tạm | S3 đảo chiều S2 |
| **Tự giữ điện thoại D4 chiều** (`take`) với SUSPICION ≥40 | `R_SUSPICION_SWEEP` seg 10 hoặc 11 lấy mất; +20 SUSPICION; Thạch CONFIRMED có điện thoại nhưng **không biết ai giấu** → không quy ai, tăng thẩm vấn | `thach`, không ai bị quy | S4 cướp S2 |
| **Để nguyên + Mai được Operator… (không áp dụng vai Captive)** — thay bằng: **nói với Linh "em thấy Đức" D3 chiều** (`tell`) | Linh có *tên* → PROTECT_DUC của Linh thua vì trust người chơi cao hơn Đức → báo Đức seg 8 → Thạch lục trần **seg 9** (sớm hơn 1 ngày) → Mai thấy điện thoại về tay Thạch → `mai.exposed` sớm → Mai isolated D4 | `thach` D4, Mai isolated | S1 nhanh → S2 → drive Mai sụp |
| **Người chơi thụ động nhưng Mai có drive** (mới) | Mai tin điện thoại ở ký túc? Cô không biết — **không hành động**. Cho tới khi Thạch khám xét công khai D3 chiều, Mai suy ra "ở ký túc" (RUMOR, self) → tự lục 14:00 D4 → **lấy lại trước Linh báo chỗ** (seg 10 < seg 11) | `mai` — kết quả **không tồn tại** trong Phase 2 | S1 (suy luận) → S2 (đua) |

Hàng cuối là minh họa rõ nhất cho directive: **không ai viết kịch bản "Mai lấy lại điện thoại"**. Nó phát sinh vì Mai có động cơ, có một suy luận hợp lý từ điều cô quan sát, và vì đồng hồ của cô (14:00 D4, seg 10) chạy trước đồng hồ của Linh (delay 1 → seg 11). Đổi `delay` của cạnh Linh→Thạch từ 1 thành 0 là Linh thắng. Đó là **cân bằng bằng tham số mô phỏng**, không bằng nhánh.

### 3.5 Vì sao scenario này, không phải scenario khác

- Dùng 10 event slice đã có, 0 event mới. Chi phí = dữ liệu drive + evaluator.
- Chạm cả 4 ending: điện thoại về Thạch → CHUYỂN GIAO; về người chơi/Đức → mở PHƠI BÀY (gọi ra ngoài D5–D6) và THOÁT (Vũ "nhìn đi chỗ khác"); Thạch quy nhầm người mới → áp lực ĐẢO VAI (`R_THACH_DEAL_OFFER` qua SUSPICION ≥70).
- Chạy được cho vai Operator không cần đổi luật: Operator nhìn cùng cuộc đua từ phía Mai/Vũ/Thạch, có quyền *nói cho Mai biết Vũ đang giữ* (một câu nối cạnh tri thức không tồn tại tự nhiên) → Mai đề nghị Vũ → Vũ (resents Mai) từ chối hoặc tố cô → `mai.exposed`. Một dòng tri thức, ba NPC phản ứng theo quan hệ có sẵn.

---

## 4. Rủi ro của hướng đi này

| # | Rủi ro | Giảm thiểu |
|---|---|---|
| R-E1 | Emergent ≠ kiểm soát được: drive gặp nhau cho kết quả tác giả không lường, phá ending hoặc Gate G | Deterministic, không RNG. Evaluator + **scenario test**: mỗi scenario có bảng kỳ vọng như 3.4, test khẳng định từng hàng. Thêm hàng khi phát hiện kết quả mới (và quyết định giữ hay chặn). |
| R-E2 | NPC "quá thông minh": suy luận (Mai suy ra "ở ký túc") là belief RUMOR(self) do tác giả cấp qua rule, có thể trượt thành toàn tri | Mọi suy luận là một `NpcAction` tường minh có `reads`; test Gate C mở rộng (2.2) bắt điều kiện đọc ngoài tầm nhìn. |
| R-E3 | Người chơi không hiểu vì sao thế giới đổi (R8 GDD nặng hơn khi NPC tự hành động) | Projection 2.4: mọi `npc_action` người chơi *có thể* quan sát sinh một Observation; cái không quan sát được thì để lại dấu vết (điện thoại biến mất, Mai bình tĩnh lại). |
| R-E4 | Thứ tự NPC trong convergence point quyết định ai thắng đua → "Thạch luôn thắng vì chạy trước" | Thứ tự theo `priority` của action, không theo NPC; cùng priority mới theo thứ tự NPC. Test: không có hai action của hai NPC khác nhau cùng ghi một flag ở cùng priority. |
| R-E5 | Trượt sang "AI NPC" (planner, utility AI) — vượt scope kỹ thuật | Giới hạn cứng: drive là **danh sách action có điều kiện + priority**, đánh giá một lượt, không tìm kiếm, không lập kế hoạch nhiều bước. Đúng mức "small, consistent simulation". |

---

## 5. Cần PO quyết

| # | Câu hỏi | Đề xuất |
|---|---|---|
| P1 | Chấp nhận tầng NPC Intent = tổng quát hóa `DelayedRule` (2.1) thay vì hệ thống riêng? | Có. |
| P2 | Chấp nhận ràng buộc tầm nhìn + test Gate C mở rộng (2.2), kể cả khi nó buộc viết lại ~6 rule hiện có? | Có; đây là điều kiện để "NPC tri thức giới hạn" đúng ở tầng hành vi, không chỉ tầng belief. |
| P3 | Reference evaluator trở thành deliverable **đầu tiên** của Phase 3, trước content slice? | Có. Không có evaluator thì mọi bảng 3.4 chỉ là lời hứa. |
| P4 | Hoãn hành động hướng NPC tự do (G8) sang sau MVP, chấp nhận lệch GDD 2.1? | Hoãn; đánh giá lại sau khi scenario 3 chạy. |
| P5 | Scenario "Ai đang tìm chiếc điện thoại?" là vertical slice của Phase 3, thay cho "Day-3 slice" thuần nội dung đã nêu trong Phase 2 mục 12? | Có — cùng event, thêm chiều mô phỏng, đúng directive "depth over volume". |
| P6 | Giữ 4 ending, 15→~21 luật, 49 event, 0 NPC mới: xác nhận đây là trong ràng buộc "không mở rộng scope kỹ thuật"? | Xin PO xác nhận; phần mới duy nhất là ~40 dòng type + 1 test + evaluator chỉ-cho-test. |

**Dừng tại đây. Không viết code, không sửa content, chờ duyệt P1–P6.**
