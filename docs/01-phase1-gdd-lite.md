# THE COMPOUND — PHASE 1: GDD LITE

Phiên bản: 0.1 (draft cho review) · Ngày: 2026-10-12
Tác giả: Claude Fable (Lead Game Designer) · Chủ dự án: Huypkc
Reviewer kiến trúc: Claude Opus · Verifier logic: ChatGPT

Trạng thái: CHỜ PRODUCT OWNER DUYỆT. Chưa bắt đầu implementation.

---

## 0. Giả định nền (Assumptions)

Những điều tôi tự quyết để tiến hành. Sai giả định nào thì sửa trước khi vào Phase 2.

| # | Giả định | Lý do |
|---|----------|-------|
| A1 | Bối cảnh là một quốc gia hư cấu, khu compound hư cấu tên **"Khu B – Thiên Hòa"**. Không nêu quốc gia thật, tổ chức thật. | Gate G, tránh ám chỉ cá nhân/tổ chức thực. |
| A2 | Hoạt động tội phạm được trừu tượng hóa thành một khái niệm duy nhất: **"Chỉ tiêu" (Quota)**. Người chơi không bao giờ thấy nội dung công việc, chỉ thấy áp lực và hậu quả. | Gate G. |
| A3 | Hai vai cùng tồn tại trong **cùng một dòng thời gian canonical**, không có "phiên bản thế giới" riêng cho mỗi vai. Quyết định của người chơi ở vai này **không** thay đổi thế giới của lần chơi vai kia (mỗi run là độc lập), nhưng **sự thật nền** (world truth) là một. | Gate B. Tránh phải mô phỏng "người chơi còn lại" bằng AI. |
| A4 | 4 ending là **ending của thế giới**, chung cho cả hai vai, mỗi vai trải nghiệm khác nhau (không phải 4 ending × 2 vai = 8). | Giữ scope MVP. |
| A5 | Giao diện text-first, không art nhân vật trong MVP. | Scope. |
| A6 | Ngôn ngữ nội dung MVP: tiếng Việt, kiến trúc hỗ trợ localization nhưng chưa dịch. | Scope. |
| A7 | Không có "rewind" trong một run. Save tự động theo segment. | Hậu quả phải có trọng lượng. |

---

## 1. Game Vision

**One-liner:** Một game sinh tồn tâm lý trong đó bạn sống 7 ngày bên trong một khu lừa đảo xuyên quốc gia, từ hai phía của cánh cửa khóa, và nhận ra rằng không ai trong đó, kể cả bạn, biết toàn bộ sự thật.

**Trải nghiệm cốt lõi (core experience):**

- **Đọc người, không đọc cốt truyện.** Người chơi tiến lên bằng cách suy đoán động cơ của NPC từ hành vi quan sát được, không phải bằng cách tìm "lựa chọn đúng".
- **Thông tin là tài nguyên khan hiếm và không đáng tin.** Thứ bạn "biết" có thể là tin đồn do một người có động cơ riêng gieo vào.
- **Mọi lựa chọn đều có giá, và hóa đơn đến muộn.** Hậu quả của ngày 1 xuất hiện ngày 5.
- **Thấu hiểu không đồng nghĩa với tha thứ.** Biết vì sao Thạch làm vậy không làm điều anh ta làm bớt tàn nhẫn.

**Trụ cột thiết kế (design pillars):**

1. **Một thế giới, một sự thật.** Mọi sự kiện đều là hệ quả của một `WorldTruth` duy nhất. Hai vai là hai lát cắt của nó.
2. **Mô phỏng sinh ra câu chuyện.** Nội dung là dữ liệu (JSON), logic là rule engine deterministic. Không có nhánh được viết tay cho từng tổ hợp.
3. **Agency có thể truy vết.** Mỗi lựa chọn có nghĩa phải mutate ít nhất một trường state không phải text, và trường đó phải được đọc bởi ít nhất một điều kiện ở tương lai.
4. **Đạo đức mờ, hậu quả rõ.** Không có lựa chọn "tốt/xấu", chỉ có lựa chọn "bảo vệ ai, trả giá bằng gì".

**Không phải:** visual novel tuyến tính, game "quản lý trại", game hành động, mô phỏng hành vi tội phạm.

---

## 2. Core Gameplay Mechanics

### 2.1 Cấu trúc thời gian

- 7 ngày × 3 phân đoạn (segment): **SÁNG (ca làm)**, **CHIỀU (giờ sinh hoạt)**, **ĐÊM (giờ cấm)** = 21 segment.
- Mỗi segment người chơi có đúng **một hành động chính** (chọn địa điểm/NPC/việc) + có thể có **một sự kiện ép buộc** (forced event) do thế giới đẩy tới.
- Cuối mỗi ĐÊM là **điểm hội tụ (convergence point)**: engine chạy rule hậu quả trễ, lan truyền tri thức NPC, cập nhật trạng thái thế giới cho ngày mới. Mọi nhánh trong ngày hội tụ về một tập state hữu hạn ở điểm này.

### 2.2 Ba chỉ số cốt lõi

| Chỉ số | Thuộc về | Ý nghĩa | Hiển thị cho người chơi |
|--------|----------|---------|-------------------------|
| **TRUST** | Quan hệ, theo từng cặp NPC → người chơi (−3..+3) | NPC sẵn sàng chia sẻ thông tin / bảo vệ / mạo hiểm vì bạn đến đâu | Gián tiếp qua hành vi NPC, không hiện số |
| **SUSPICION** | Tổ chức → người chơi (0..100) | "Độ nóng" bạn đang bị bộ máy kiểm soát để mắt | Hiển thị định tính 4 mức (Vô hình / Để ý / Theo dõi / Đánh dấu) |
| **STRESS** | Nội tâm người chơi (0..100) | Áp lực tích lũy. Cao → mất lựa chọn, nhận thức méo | Hiển thị định tính 4 mức |

**Cơ chế then chốt của STRESS: nhận thức méo (distorted perception).** Khi STRESS ≥ 60, một số quan sát được giao cho người chơi ở dạng **mơ hồ** (tagged `uncertain`), ví dụ "Hình như Vũ vừa nhìn về phía giường Đức" thay vì "Vũ nhìn giường Đức". Engine **không bao giờ nói dối** về sự kiện đã `CONFIRMED`; nó chỉ hạ cấp độ chắc chắn của quan sát mới. Đây là nguồn chính của "misleading interpretation" mà vẫn fair.

**SUSPICION ngưỡng:** ≥40 → kiểm tra đồ ngẫu nhiên; ≥70 → mất quyền đi lại giờ CHIỀU; ≥90 → sự kiện "gọi lên phòng" (có thể dẫn tới ending Đảo vai).

### 2.3 Hệ thống tri thức (Knowledge)

Thế giới được mô tả bằng các **Fact** rời rạc (ví dụ `F_PHONE_OWNER_IS_MAI`, `F_TRANSFER_DAY7`). Ba tầng tách biệt tuyệt đối:

- **WorldTruth**: tập Fact đúng. Bất biến trong một run. Chỉ nội dung canonical được ghi.
- **PlayerKnowledge**: với mỗi Fact, người chơi có một `BeliefStatus`: `UNKNOWN` → `RUMOR(source)` → `OBSERVED` → `CONFIRMED`. **RUMOR có thể sai** (source có động cơ). Chỉ `CONFIRMED` là bảo đảm khớp WorldTruth.
- **NPCKnowledge**: mỗi NPC có tập Fact họ biết + tập **DecisionTag** của người chơi họ đã chứng kiến hoặc được kể. NPC chỉ hành động dựa trên tập này (Gate C).

Tri thức **lan truyền theo cạnh quan hệ với độ trễ**: Linh biết X ở segment N → Thạch biết X ở segment N+1 *nếu* Linh vẫn là người báo tin. Cắt cạnh (Linh không còn báo tin) thì dòng chảy dừng.

### 2.4 Lựa chọn và hậu quả

Mỗi `Choice` phải khai báo ít nhất một trong:

- Thay đổi stat (TRUST/SUSPICION/STRESS).
- Thêm `DecisionTag` vào nhật ký quyết định (`decisionLog`).
- Thay đổi `BeliefStatus` của một Fact.
- Thay đổi `WorldFlag` (ví dụ `phone.location`).

Lựa chọn chỉ đổi text bị **validator từ chối** lúc build (Gate A tự động).

**Hậu quả trễ (butterfly)** là các `DelayedRule`: điều kiện trên state + `earliestSegment`, được đánh giá tại điểm hội tụ. Ví dụ: `day>=5 && has(PROTECTED_DUC) && trust.duc>=2 → unlock EV_DUC_SHOWS_HIDING_SPOT`.

### 2.5 Động từ của hai vai (vì sao chơi lại không phải "đổi skin")

| | CAPTIVE | OPERATOR |
|---|---|---|
| Động từ chính | Quan sát, Giấu, Kết thân, Chịu đựng, Chia sẻ/Giữ lại | Điều tra, Báo cáo/Che giấu, Ép/Nương tay, Mặc cả với cấp trên |
| Vùng truy cập | Ký túc, sân, nhà ăn, (phòng làm việc chỉ giờ SÁNG) | Phòng làm việc, hành lang quản lý, kho, (ký túc chỉ khi khám xét) |
| Nguồn thông tin | Tin đồn ký túc, hành vi lính gác | Báo cáo, sổ sách, lệnh từ trên |
| Áp lực chính | STRESS | SUSPICION (từ chính tổ chức của mình) |
| Nguồn STRESS | Chỉ tiêu, trừng phạt | Phải tự tay thực thi trừng phạt |

### 2.6 "Chỉ tiêu" (Quota) — trừu tượng hóa hoạt động tội phạm

Ca SÁNG là một hành động duy nhất với 4 thái độ: **Tuân thủ / Làm cầm chừng / Giúp người khác đạt / Ngầm phá**. Kết quả là một con số trừu tượng và hệ quả lên stat + DecisionTag. Không có mini-game, không có nội dung "công việc". Người chơi hiểu đây là tội ác qua **hậu quả** (một NPC nói về "người ở đầu dây bên kia"), không qua cơ chế.

---

## 3. Năm NPC

Nguyên tắc chung: mỗi NPC biết **đúng một mắt xích** của bí ẩn trung tâm, và mỗi người có lý do để **không nói**.

### 3.1 THẠCH — Quản lý tầng (Floor Manager)

- **Vai trò:** Cấp trung, chịu trách nhiệm chỉ tiêu của cả tầng trước "Ông Chủ" (off-screen).
- **Công khai:** Điềm tĩnh, thực dụng. "Đạt số thì không ai phải khổ." Không bao giờ tự tay đánh ai.
- **Riêng tư:** Biết tầng này sắp bị **chuyển giao** (bán nguyên lô sang khu khác) ngày 7. Đang tìm cách đi khỏi trước đó với đủ tiền. Coi con người là tài sản có thể thương lượng, kể cả chính mình.
- **Ranh giới tri thức:** Biết `F_TRANSFER_DAY7`, biết "có rò rỉ" (Ông Chủ báo). **Không** biết ai rò rỉ, không biết điện thoại là của Mai.
- **Phụ thuộc:** Cần Vũ để thực thi, cần Mai để làm giấy tờ, dùng Linh làm tai mắt.
- **Arc:** Từ "người quản lý hợp lý" → lộ ra là người sẵn sàng bán cả tầng để mua lối thoát riêng. Tùy người chơi: có thể trở thành đồng minh vụ lợi (cùng trốn), hoặc kẻ phản bội đúng lúc.
- **Kết cục có thể:** Trốn thoát một mình / Bị cấp trên xử lý vì để rò rỉ / Đi cùng người chơi và bỏ rơi giữa đường / Bị bắt trong ending Phơi bày.

### 3.2 VŨ — Bảo vệ (Enforcer)

- **Vai trò:** An ninh, khám xét, trừng phạt. Từng là người bị giam, "lên" làm bảo vệ sau 1 năm.
- **Công khai:** Lạnh, đúng quy trình, thích thể hiện quyền.
- **Riêng tư:** Sợ hãi tột độ việc bị "hạ xuống" lại. Thấy mình trong Đức. Tự thuyết phục rằng tàn nhẫn vừa đủ là cách bảo vệ người khác khỏi tàn nhẫn hơn.
- **Ranh giới tri thức:** Biết sơ đồ khu, điểm mù camera, lịch tuần tra. **Không** biết chuyển giao. Ngày 5 sẽ tìm thấy chỗ giấu điện thoại (nếu rule kích hoạt) nhưng không biết của ai.
- **Phụ thuộc:** Trung thành với Thạch vì Thạch là người kéo anh lên. Ghét Mai vì Mai giữ "sổ nợ" của anh.
- **Arc:** Người thực thi → người biết điểm mù → có thể là chìa khóa lối thoát vật lý, *với giá* là anh ta không được ở lại gánh hậu quả.
- **Kết cục:** Ở lại và bị chuyển giao như hàng / Mở cửa cho người chơi rồi ở lại chịu đòn / Phản bội phút cuối để giữ chỗ / Bị bắt.

### 3.3 MAI — Hành chính / Sổ nợ (Admin)

- **Vai trò:** Quản lý "hợp đồng nợ" của từng người, sổ sách, giấy tờ chuyển giao.
- **Công khai:** Lạnh lùng, chính xác, quan liêu. "Tôi chỉ ghi số."
- **Riêng tư:** Cũng là nạn nhân bị lừa, được "thăng" lên hành chính vì có học. Là **chủ nhân chiếc điện thoại ngầm**, dùng nó liên lạc với một đầu mối bên ngoài để đổi thông tin chuyển giao lấy một cuộc giải cứu *cho riêng mình*.
- **Ranh giới tri thức:** Biết `F_TRANSFER_DAY7` (từ giấy tờ), biết cấu trúc nợ của mọi người, biết ai "có giá". **Không** biết ai lấy điện thoại. Không biết Thạch đã được báo có rò rỉ.
- **Phụ thuộc:** Cần Thạch không nghi ngờ. Bị Vũ ghét. Biết Linh là tai mắt (thấy trong sổ "thưởng").
- **Arc:** Người ngoài cuộc lạnh lùng → kẻ rò rỉ có động cơ ích kỷ → có thể mở rộng cuộc giải cứu cho người khác *nếu* người chơi khiến việc đó có lợi cho cô.
- **Kết cục:** Được giải cứu một mình / Bị lộ và bị "hạ xuống" / Trở thành nguồn bằng chứng trong Phơi bày / Chết lặng, tiếp tục ghi sổ ở khu mới.

### 3.4 LINH — Người bị giam kỳ cựu (5 tháng)

- **Vai trò:** "Chị cả" ký túc. Người đầu tiên tiếp cận người mới.
- **Công khai:** Ấm áp, chỉ dẫn, "cứ tin chị".
- **Riêng tư:** Là **người báo tin cho Thạch**, đổi lấy một "ngày thả" liên tục bị lùi. Tự thuyết phục rằng cô chỉ báo "chuyện nhỏ" để cứu người khác khỏi "chuyện lớn".
- **Ranh giới tri thức:** Biết đời sống ký túc, ai đang gãy. **Thấy Đức cầm điện thoại ngày 3** (mắt xích duy nhất cô có). **Không** biết chuyển giao, **không** biết ngày thả là lời nói dối.
- **Phụ thuộc:** Thạch (hy vọng). Đức (cảm giác tội lỗi). Người chơi Captive (đối tượng báo cáo hoặc người cô muốn bảo vệ).
- **Arc:** Đồng minh duy nhất → bị lộ là tai mắt → người chơi quyết định: vạch mặt, dùng cô làm kênh phản gián (gieo tin giả cho Thạch), hay tha thứ. Tin nhắn của cô cho Thạch là **nguồn misleading interpretation** chính của phía Operator.
- **Kết cục:** Bị ký túc tẩy chay / Được thả thật (chỉ trong Phơi bày) / Bị chuyển giao cùng "ngày thả" vĩnh viễn không tới / Phản bội Thạch phút cuối.

### 3.5 ĐỨC — Người bị giam mới (19 tuổi)

- **Vai trò:** Cùng lô với người chơi Captive (đến trước 2 ngày).
- **Công khai:** Im lặng, ngoan ngoãn, sợ.
- **Riêng tư:** **Lấy trộm điện thoại của Mai ngày 3** khi giao sổ ở phòng hành chính, chỉ để gọi cho mẹ. Hoảng, giấu trong khe trần nhà vệ sinh ký túc. Chưa gọi được.
- **Ranh giới tri thức:** Biết chỗ giấu, biết một điểm mù (vô tình). **Không** biết điện thoại của ai, **không** biết trong đó có gì, không biết Linh đã thấy.
- **Phụ thuộc:** Người chơi Captive (người duy nhất có thể là bạn). Vũ (sợ nhưng Vũ ngầm che). Linh (tin tưởng mù quáng).
- **Arc:** Nạn nhân thụ động → người nắm bằng chứng quan trọng nhất mà không biết → tùy người chơi: được bảo vệ và trao điện thoại, hoặc bị đẩy ra làm vật tế thần.
- **Kết cục:** Bị đổ tội, bị "hạ xuống" / Trốn cùng người chơi / Bị chuyển giao / Gọi được một cuộc gọi (ending-neutral, nhưng là khoảnh khắc nhân tính).

---

## 4. Bí ẩn trung tâm: "NGÀY THỨ BẢY"

**World truth (canonical, bất biến):**

> Tầng này sẽ bị **chuyển giao nguyên lô** sang khu khác vào đêm ngày 7 vì sắp có đợt truy quét. Chỉ Thạch và Mai biết. Mai đã rò rỉ ngày giờ ra ngoài bằng điện thoại ngầm. Ông Chủ phát hiện có rò rỉ, lệnh cho Thạch tìm. Ngày 3, Đức lấy trộm chiếc điện thoại đó mà không biết nó là gì. Linh nhìn thấy. Cuộc "khám xét tìm điện thoại" ngày 3 thực chất là **cuộc săn kẻ rò rỉ**, nhưng chỉ Thạch biết điều đó.

**Chuỗi mắt xích tri thức (mỗi NPC một mắt xích):**

| Mắt xích | Ai biết | Vai nào thấy dễ hơn |
|----------|---------|---------------------|
| Chuyển giao ngày 7 tồn tại | Thạch, Mai | Operator (sổ sách, lệnh) |
| Có kẻ rò rỉ, khám xét là để tìm kẻ đó | Thạch | Operator (được giao việc) |
| Điện thoại là của Mai | Mai | Operator (nếu điều tra) |
| Ai lấy điện thoại | Đức, Linh | Captive (ký túc) |
| Điện thoại ở đâu | Đức (Vũ từ ngày 5) | Captive |
| Trong điện thoại có gì (bằng chứng + đầu mối bên ngoài) | Không ai cho đến khi có người mở | Cả hai, bằng cách khác nhau |

**Điều người chơi phát hiện khi chơi lại vai kia (bắt buộc theo brief):**

- Chơi Captive trước: bạn sống cuộc khám xét như một trận trừng phạt tập thể vì "ai đó ăn cắp". Chơi Operator sau: bạn biết Thạch chưa bao giờ quan tâm chiếc điện thoại, anh ta tìm *người gửi tin nhắn*.
- Chơi Operator trước: bạn nhận tin báo "thằng mới (Captive) lảng vảng gần phòng hành chính" và có thể đã xử lý nhầm người. Chơi Captive sau: bạn biết tin đó đến từ Linh, và vì sao cô gửi nó.

**Foreshadowing (chi tiết quan sát được từ ngày 1–2, trước khi có nghĩa):**

- Mai luôn vào nhà vệ sinh hành chính đúng 14:00 (giờ cô nhắn tin).
- Thạch bắt đầu nói "sau tuần này" thay vì "tháng sau" khi hứa hẹn.
- Xe tải đến đếm giường ngày 2 (Captive thấy, không hiểu). Operator thấy phiếu "kiểm kê tài sản".
- Linh biết tên người chơi trước khi được giới thiệu.

Không có twist "hóa ra tất cả là mơ". Mọi tiết lộ đều là ghép mắt xích đã có.

---

## 5. Ranh giới MVP (Boundaries)

**Có trong MVP:**

- 2 vai, 5 NPC trên, 1 khu (6 địa điểm: Ký túc, Sân, Nhà ăn, Sàn làm việc, Phòng hành chính, Hành lang quản lý).
- 7 ngày × 3 segment. Vertical slice = trọn ngày 3 (3 segment) + **một segment "echo" ở ngày 5** để chứng minh hậu quả trễ.
- 3 stat đúng như định nghĩa mục 2.2.
- 4 ending thế giới (mục 6.3 bên dưới), mỗi ending có epilogue card cho 5 NPC theo state.
- Ước lượng nội dung: ~70–90 event, ~200–260 choice toàn game; vertical slice ~24–30 event.
- Save/load: autosave mỗi segment + 3 slot thủ công. LocalStorage/JSON file.
- Offline hoàn toàn. Không SI bắt buộc.

**Không có trong MVP (cần duyệt riêng nếu muốn thêm):**

- Nhiều hơn 5 NPC, nhiều hơn 1 khu, NPC phụ có tên.
- Art nhân vật, âm thanh, animation.
- Hệ thống inventory tổng quát (chỉ có vài `WorldFlag` cho vật phẩm then chốt: điện thoại, sổ nợ, chìa khóa).
- Mini-game cho ca làm.
- Lớp SI dialogue (thiết kế interface ở Phase 2, implement sau MVP).
- Localization thực tế.
- Multiplayer, 3D, procedural.

**Sơ bộ 4 ending (để kiểm tra Gate F sớm, chi tiết ở Phase 2):**

| Ending | Điều kiện cốt lõi (sơ bộ) | Captive trải nghiệm | Operator trải nghiệm |
|--------|---------------------------|---------------------|----------------------|
| **THOÁT** (Escape) | Có lối ra vật lý (TRUST Vũ hoặc tri thức điểm mù) + SUSPICION < 70 + STRESS < 80 tại cửa sổ đêm 6 | Ra ngoài, có thể cùng/không cùng Đức | Rời đi trước chuyển giao, mang hoặc không mang ai |
| **PHƠI BÀY** (Exposure) | Nội dung điện thoại ra ngoài trước đêm 6 (qua Mai, hoặc tự gọi) | Truy quét ngày 7; được thả nhưng không phải ai cũng | Bị bắt như thủ phạm *trừ khi* đã tạo bằng chứng hợp tác |
| **CHUYỂN GIAO** (Transfer) | Mặc định nếu không có ending nào khác | Lên xe. Game kết thúc ở khu mới, tiếp tục | Theo tầng sang khu mới, "thăng chức" |
| **ĐẢO VAI** (Inversion) | Captive: nhận lời Thạch "lên" làm team (tag `ACCEPTED_DEAL`). Operator: SUSPICION ≥ 90 hoặc bị Thạch bán → "hạ xuống" | Bạn trở thành người gác cửa cho lô mới | Bạn thức dậy trong ký túc, Linh đến giới thiệu |

Bốn ending **khác nhau về cơ chế** (lối ra vật lý / dòng thông tin / mặc định / tag lựa chọn) nên không thể gộp.

---

## 6. Rủi ro thiết kế lớn

| # | Rủi ro | Mức | Giảm thiểu |
|---|--------|-----|------------|
| R1 | **Bùng nổ nội dung** khi nhánh nhân lên | Cao | Gating bằng state, không bằng path. Điểm hội tụ mỗi đêm. Giới hạn cứng số WorldFlag (≤ 40). |
| R2 | **Lựa chọn ảo** (chỉ đổi text) | Cao | Validator build-time từ chối choice không mutate state. Bảng truy vết choice → rule đọc nó. |
| R3 | **Mâu thuẫn giữa hai vai** | Cao | Một file `truth.json` duy nhất + timeline canonical theo segment. Test tự động: mọi event của cả hai vai phải tham chiếu Fact trong truth, không có Fact nào có hai giá trị. |
| R4 | **NPC toàn tri** (biết điều chưa được kể) | Trung | NPC chỉ đọc `NPCKnowledge` của mình. Test: với mỗi điều kiện event NPC, mọi Fact được tham chiếu phải có đường lan truyền hợp lệ tới NPC đó. |
| R5 | **Nhận thức méo bị cảm nhận là game gian lận** | Trung | Quan sát `uncertain` được đánh dấu rõ trong UI. Không bao giờ hạ cấp `CONFIRMED`. Người chơi có thể xác minh lại. |
| R6 | **Chơi lại vai kia thấy nhàm** | Trung | Bộ động từ khác, vùng truy cập khác, áp lực khác (mục 2.5). Ít nhất 40% event là role-exclusive. |
| R7 | **Chủ đề nhạy cảm bị tầm thường hóa hoặc thành hướng dẫn** | Cao | Trừu tượng hóa Chỉ tiêu (A2). Checklist Gate G cho từng event khi viết. Không mô tả kỹ thuật thao túng, chỉ mô tả *hậu quả* lên nhân vật. |
| R8 | **Stat không đọc được** → người chơi không hiểu vì sao bị trừng phạt | Trung | Nhật ký ("Sổ ghi nhớ") ghi lại quan sát và suy đoán. NPC phản ứng bằng hành vi cụ thể, không bằng số. |
| R9 | **Lớp SI làm lộ Fact ẩn** | Thấp (chưa trong MVP) | SI chỉ nhận `PlayerKnowledge` đã lọc + personality, không nhận WorldTruth. Text canonical luôn là fallback. |

---

## 7. Quyết định kiến trúc còn mở

Mỗi mục có đề xuất của tôi. **Cần Product Owner duyệt** trước Phase 2.

| # | Quyết định | Lựa chọn | Đề xuất |
|---|-----------|----------|---------|
| D1 | **Ngữ nghĩa 3 stat** | (a) cả 3 là thuộc tính người chơi; (b) TRUST theo cặp, SUSPICION thuộc tổ chức, STRESS nội tâm | **(b)**. TRUST toàn cục làm NPC mất cá tính. |
| D2 | **Số segment/ngày** | 3 hay 4 | **3**. 21 segment đủ cho 7 ngày; 4 làm nội dung tăng 33% mà không thêm chiều sâu. |
| D3 | **Ending chung hay theo vai** | 4 chung (A4) hay 4×2 | **4 chung**, epilogue theo vai. |
| D4 | **Mô hình tri thức** | boolean "biết/không" hay 4 trạng thái có nguồn | **4 trạng thái** `UNKNOWN/RUMOR/OBSERVED/CONFIRMED` + `source`. Đây là cái làm "thông tin không đáng tin" thành cơ chế thật. |
| D5 | **Thứ tự chơi** | Ép Captive trước, hay tự do | **Tự do**, gợi ý Captive. Run thứ hai được đánh dấu "bạn đã biết điều này từ vai kia" trong sổ ghi nhớ. |
| D6 | **Rewind** | Không / rewind 1 segment / tự do | **Không** trong run (A7). Cho phép "replay từ ngày N" sau khi hoàn thành. |
| D7 | **Định dạng điều kiện** | JSON AST (`{"op":"and","args":[...]}`) hay chuỗi DSL (`"day>=5 && has(X)"`) | **JSON AST** với ~10 toán tử. An toàn, test được, không cần parser. |
| D8 | **Stack kỹ thuật** | Vanilla TS + Vite / Preact / React | **Vanilla TS + Vite, 0 runtime dependency**, Vitest cho test. Engine tách hoàn toàn khỏi DOM để test headless. |
| D9 | **Tên nhân vật & bối cảnh** | Tên Việt / tên hư cấu trung tính / codename | Hiện dùng tên Việt. **Cần PO quyết** vì chủ đề nhạy cảm với cộng đồng thực. Có thể đổi sang tên trung tính mà không ảnh hưởng thiết kế. |
| D10 | **Hiển thị stat** | Số / định tính 4 mức / hoàn toàn ẩn | **Định tính** cho SUSPICION và STRESS; TRUST ẩn hoàn toàn. |
| D11 | **Vai Operator có "tội" đến đâu** | Hoàn toàn bị ép / có chọn mức tham gia / đã tự nguyện từ đầu | **Có chọn mức tham gia** qua 4 thái độ ca làm. Game không quyết hộ người chơi họ là nạn nhân hay thủ phạm. |
| D12 | **Lớp SI** | Thiết kế interface ở Phase 2 nhưng không implement trong MVP | **Đồng ý**, chỉ định nghĩa `DialogueProvider` interface với `StaticProvider` là implementation duy nhất. |

**Các mục cần PO duyệt ngay:** D1, D3, D4, D9, D11. Các mục còn lại tôi sẽ đi theo đề xuất nếu không có ý kiến.

---

## 8. Kiểm tra sơ bộ Quality Gates (ở mức thiết kế)

| Gate | Trạng thái Phase 1 | Cơ chế bảo đảm ở Phase 2+ |
|------|--------------------|---------------------------|
| A — Hậu quả truy vết được | Thiết kế có (mục 2.4) | Validator build-time |
| B — Hai vai một timeline | Thiết kế có (A3, mục 4) | `truth.json` + test tham chiếu |
| C — NPC không toàn tri | Thiết kế có (mục 2.3) | Test đường lan truyền |
| D — Chơi được không SI | Có (A5, D12) | Static text là bắt buộc cho mọi event |
| E — Vertical slice trong scope | Có (mục 5) | Đếm event khi thiết kế Phase 3 |
| F — 4 ending khác nhau, tới được | Sơ bộ có (mục 5) | Test tự động: ít nhất 1 path tới mỗi ending cho mỗi vai |
| G — Không hướng dẫn tội phạm | Có (A2, R7) | Checklist mỗi event |

---

## 9. Đề xuất bước tiếp theo (Phase 2, sau khi duyệt)

1. Thiết kế `WorldState`, `KnowledgeState`, `Condition` AST, `DelayedRule` dưới dạng TypeScript interface.
2. Viết `truth.json` cho toàn bộ 7 ngày ở mức timeline (không viết lời thoại).
3. Mô hình quan hệ NPC: đồ thị cạnh có hướng + độ trễ lan truyền.
4. Đặc tả 4 ending bằng điều kiện máy đọc được.
5. Nộp cho Claude Opus review kiến trúc, ChatGPT verify logic.
