# THE COMPOUND — PHASE 3: PHONE SCENARIO EXECUTION TRACE (generated)

Sinh tự động bởi `node scripts/trace.mjs` từ content hiện tại qua `src/engine/evaluator.mjs`. Không sửa tay. Ngày: 2026-10-12.
Ký hiệu: segment = D{ngày}{S/C/Đ}; trust = thach/vu/mai/linh/duc; belief = agent:FACT=R|O|C (RUMOR/OBSERVED/CONFIRMED).

## 1. Execution trace từng scenario (chế độ Phase 3 = intents)

### S1_PASSIVE — Không làm gì (bỏ mọi optional, forced = lựa chọn thụ động nhất)

Vai: **captive** · Ending Phase 3: **E_TRANSFER** · Ending Phase 2 baseline: **E_TRANSFER**
Tài liệu kỳ vọng: Linh tip seg 8 → thẩm vấn seg 9 → Đức kể Linh seg 10 → Linh báo chỗ seg 11 → Thạch lục trần seg 12, quy Đức

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | EV_C_D2N_LINH_PROBE/deflect | — | mai_drawer | 15/0 | 0/-1/0/0/1 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D3M_DUC_PALE | — | dorm_ceiling | 20/0 | 0/-1/0/0/1 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_C_D3A_SEARCH/aside<br>EV_C_D3A_LINH_WHISPER/silent | — | dorm_ceiling | 30/0 | 0/-1/0/-1/1 | — | — |
| D3Đ | — | PR_LINH_TIP_CAPTIVE<br>R_INTERROGATION_D4 | dorm_ceiling | 30/10 | 0/-1/0/-1/1 | — | thach:CAPTIVE_PC_NEAR_ADMIN_D3=R |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D4M_INTERROGATION/deny | — | dorm_ceiling | 55/20 | 0/-1/0/-1/1 | — | — |
| D4C | EV_C_D4A_LINH_OFFER/refuse | PR_DUC_CONFIDES_LINH | dorm_ceiling | 55/20 | 0/-1/0/-2/1 | — | linh:PHONE_EXISTS=R<br>linh:PHONE_HIDDEN_DORM_CEILING=R |
| D4Đ | (bỏ qua 1 optional) | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 55/35 | 0/-1/0/-2/1 | — | thach:PHONE_HIDDEN_DORM_CEILING=R<br>thach:PHONE_EXISTS=C<br>thach:PHONE_HIDDEN_DORM_CEILING=C |
| D5S | EV_S_QUOTA_SHIFT/comply | — | thach | 60/35 | 0/-1/0/-2/1 | — | — |
| D5C | — | — | thach | 60/35 | 0/-1/0/-2/1 | — | — |
| D5Đ | — | A_THACH_RECRUIT | thach | 60/35 | 0/-1/0/-2/1 | — | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D6M_THACH_DEAL/refuse | — | thach | 70/50 | 0/-1/0/-2/1 | — | — |
| D6C | — | — | thach | 70/50 | 0/-1/0/-2/1 | — | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 70/50 | 0/-1/0/-2/1 | — | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 70/50 | 0/-1/0/-2/1 | — | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/c_alone | — | thach | 75/50 | 0/-1/0/-2/1 | — | — |
| D7Đ | — | — | thach | 75/50 | 0/-1/0/-2/1 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D4Đ: status "duc:isolated"→"present"; convergence [PR_LINH_RELAY_LOCATION,R_THACH_RAID_CEILING]→[PR_LINH_RELAY_LOCATION,A_THACH_RAID_WHERE_I_BELIEVE]; D5S: status "duc:isolated"→"present"; convergence [PR_THACH_TELLS_VU_SCAPEGOAT]→[]; D5C: status "duc:isolated"→"present"; D5Đ: status "duc:isolated"→"present"; convergence [PR_LINH_RELAY_CAPTIVE_TAGS,R_THACH_DEAL_OFFER]→[A_THACH_RECRUIT]; D6S: status "duc:isolated"→"present".

### S2_COVER_WARN — Che Đức khi khám + cảnh báo Đức về Linh; để nguyên điện thoại

Vai: **captive** · Ending Phase 3: **E_INVERSION** · Ending Phase 2 baseline: **E_INVERSION**
Tài liệu kỳ vọng: Đức không kể Linh → Thạch không biết chỗ → Vũ tìm thấy seg 12, giữ im

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | EV_C_D2N_LINH_PROBE/tell | — | mai_drawer | 20/0 | 0/-1/0/3/3 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D3M_DUC_PALE | — | dorm_ceiling | 25/0 | 0/-1/0/3/3 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_C_D3A_SEARCH/cover<br>EV_C_D3A_LINH_WHISPER/tell | — | dorm_ceiling | 35/15 | 0/-1/0/3/3 | — | — |
| D3Đ | EV_C_D3N_DUC_CONFESSION/warn_linh | PR_LINH_TIP_CAPTIVE<br>PR_LINH_RELAY_CAPTIVE_TAGS<br>R_INTERROGATION_D4 | dorm_ceiling | 45/25 | 0/-1/0/3/3 | — | thach:CAPTIVE_PC_NEAR_ADMIN_D3=R |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D4M_INTERROGATION/blame_linh | — | dorm_ceiling | 60/20 | 0/-1/0/1/3 | — | — |
| D4C | EV_C_D4A_LINH_OFFER/refuse<br>EV_C_D4A_PHONE_DECISION/leave | — | dorm_ceiling | 65/20 | 0/-1/0/0/3 | — | — |
| D4Đ | (bỏ qua 1 optional) | — | dorm_ceiling | 65/20 | 0/-1/0/0/3 | — | — |
| D5S | EV_S_QUOTA_SHIFT/comply | A_VU_ROUTINE_CEILING_CHECK | vu_locker | 70/20 | 0/-1/0/0/3 | — | vu:PHONE_EXISTS=C<br>vu:PHONE_HIDDEN_DORM_CEILING=C<br>vu:PHONE_TAKEN_BY_DUC=R |
| D5C | EV_S_D5A_PHONE_FOUND_BY_VU/c_tell_duc | — | vu_locker | 75/20 | 0/-1/0/0/3 | — | — |
| D5Đ | — | A_VU_HAND_UP<br>A_THACH_RECRUIT | thach | 75/20 | 0/-1/0/0/3 | — | thach:PHONE_EXISTS=C<br>thach:PHONE_HIDDEN_DORM_CEILING=C |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D6M_THACH_DEAL/accept | — | thach | 70/0 | 0/-1/0/-1/1 | — | — |
| D6C | — | — | thach | 70/0 | 0/-1/0/-1/1 | — | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 70/0 | 0/-1/0/-1/1 | — | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 70/0 | 0/-1/0/-1/1 | — | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/c_with_duc | — | thach | 65/0 | 0/-1/0/-1/1 | — | — |
| D7Đ | — | — | thach | 65/0 | 0/-1/0/-1/1 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D5S: convergence [R_VU_CEILING_CHECK]→[A_VU_ROUTINE_CEILING_CHECK]; D5Đ: convergence [PR_VU_REPORTS_PHONE,R_THACH_DEAL_OFFER]→[A_VU_HAND_UP,A_THACH_RECRUIT].

### S3_VU_TRUST — Như S2 + mọi nguồn +trust Vũ khả dụng (volunteer) → Vũ có giữ im không?

Vai: **captive** · Ending Phase 3: **E_INVERSION** · Ending Phase 2 baseline: **E_INVERSION**
Tài liệu kỳ vọng: trust Vũ lên 2 → PROTECT_DUC thắng → không nộp seg 14 → Đức gọi được D5 (docs/04 hàng 3)
**KHOẢNG CÁCH ĐÃ BIẾT:** F-01: trần trust.vu của Captive trước seg 14 = 1 (< 2). Hàng 3 của docs/04 §3.4 KHÔNG đạt được với content hiện tại.

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | EV_C_D2N_LINH_PROBE/tell | — | mai_drawer | 20/0 | 0/-1/0/3/3 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D3M_DUC_PALE | — | dorm_ceiling | 25/0 | 0/-1/0/3/3 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_C_D3A_SEARCH/volunteer<br>EV_C_D3A_LINH_WHISPER/tell | — | dorm_ceiling | 30/0 | 0/0/0/3/3 | — | — |
| D3Đ | EV_C_D3N_DUC_CONFESSION/warn_linh | — | dorm_ceiling | 40/0 | 0/0/0/3/3 | — | — |
| D4S | EV_S_QUOTA_SHIFT/comply | — | dorm_ceiling | 55/0 | 0/0/0/3/3 | — | — |
| D4C | EV_C_D4A_LINH_OFFER/refuse<br>EV_C_D4A_PHONE_DECISION/leave | — | dorm_ceiling | 60/0 | 0/0/0/2/3 | — | — |
| D4Đ | (bỏ qua 1 optional) | — | dorm_ceiling | 60/0 | 0/0/0/2/3 | — | — |
| D5S | EV_S_QUOTA_SHIFT/comply | A_VU_ROUTINE_CEILING_CHECK | vu_locker | 65/0 | 0/0/0/2/3 | — | vu:PHONE_EXISTS=C<br>vu:PHONE_HIDDEN_DORM_CEILING=C<br>vu:PHONE_TAKEN_BY_DUC=R |
| D5C | EV_S_D5A_PHONE_FOUND_BY_VU/c_tell_duc | — | vu_locker | 70/0 | 0/0/0/2/3 | — | — |
| D5Đ | — | A_VU_HAND_UP<br>A_THACH_RECRUIT | thach | 70/0 | 0/0/0/2/3 | — | thach:PHONE_EXISTS=C<br>thach:PHONE_HIDDEN_DORM_CEILING=C |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D6M_THACH_DEAL/accept | — | thach | 65/0 | 0/0/0/1/1 | — | — |
| D6C | — | — | thach | 65/0 | 0/0/0/1/1 | — | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 65/0 | 0/0/0/1/1 | — | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 65/0 | 0/0/0/1/1 | — | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/c_with_duc | — | thach | 60/0 | 0/0/0/1/1 | — | — |
| D7Đ | — | — | thach | 60/0 | 0/0/0/1/1 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D5S: convergence [R_VU_CEILING_CHECK]→[A_VU_ROUTINE_CEILING_CHECK]; D5Đ: convergence [PR_VU_REPORTS_PHONE,R_THACH_DEAL_OFFER]→[A_VU_HAND_UP,A_THACH_RECRUIT].

### S4_TAKE_SWEEP — Tự giữ điện thoại D4 chiều với SUSPICION ≥ 40 (deny khi thẩm vấn)

Vai: **captive** · Ending Phase 3: **E_INVERSION** · Ending Phase 2 baseline: **E_INVERSION**
Tài liệu kỳ vọng: R_SUSPICION_SWEEP lấy mất seg 10; +20 SUSPICION; Thạch CONFIRMED có điện thoại nhưng không biết ai giấu → không quy ai

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | EV_C_D2N_LINH_PROBE/tell | — | mai_drawer | 20/0 | 0/-1/0/3/3 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D3M_DUC_PALE | — | dorm_ceiling | 25/0 | 0/-1/0/3/3 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_C_D3A_SEARCH/cover<br>EV_C_D3A_LINH_WHISPER/tell | — | dorm_ceiling | 35/15 | 0/-1/0/3/3 | — | — |
| D3Đ | EV_C_D3N_DUC_CONFESSION/keep_secret | PR_LINH_TIP_CAPTIVE<br>PR_LINH_RELAY_CAPTIVE_TAGS<br>R_INTERROGATION_D4 | dorm_ceiling | 45/25 | 0/-1/0/3/3 | — | thach:CAPTIVE_PC_NEAR_ADMIN_D3=R |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D4M_INTERROGATION/deny | — | dorm_ceiling | 70/35 | 0/-1/0/3/3 | — | — |
| D4C | EV_C_D4A_LINH_OFFER/refuse<br>EV_C_D4A_PHONE_DECISION/take | R_SUSPICION_SWEEP | thach | 85/60 | 0/-1/0/2/2 | — | thach:PHONE_EXISTS=C |
| D4Đ | (bỏ qua 1 optional) | — | thach | 85/60 | 0/-1/0/2/2 | — | — |
| D5S | EV_S_QUOTA_SHIFT/comply | — | thach | 90/60 | 0/-1/0/2/2 | — | — |
| D5C | — | — | thach | 90/60 | 0/-1/0/2/2 | — | — |
| D5Đ | — | A_THACH_RECRUIT | thach | 90/60 | 0/-1/0/2/2 | — | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D6M_THACH_DEAL/accept | — | thach | 85/30 | 0/-1/0/1/0 | — | — |
| D6C | — | — | thach | 85/30 | 0/-1/0/1/0 | — | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 85/30 | 0/-1/0/1/0 | — | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 85/30 | 0/-1/0/1/0 | — | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/c_with_duc | — | thach | 80/30 | 0/-1/0/1/0 | — | — |
| D7Đ | — | — | thach | 80/30 | 0/-1/0/1/0 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D5Đ: convergence [R_THACH_DEAL_OFFER]→[A_THACH_RECRUIT].

### S4b_TAKE_CALL — Tự giữ điện thoại với SUSPICION thấp (blame_linh) → đọc nội dung, gọi ra ngoài

Vai: **captive** · Ending Phase 3: **E_EXPOSURE** · Ending Phase 2 baseline: **E_EXPOSURE**
Tài liệu kỳ vọng: CF-2: không rule nào chạm điện thoại; PHƠI BÀY

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | EV_C_D2N_LINH_PROBE/tell | — | mai_drawer | 20/0 | 0/-1/0/3/3 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D3M_DUC_PALE | — | dorm_ceiling | 25/0 | 0/-1/0/3/3 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_C_D3A_SEARCH/cover<br>EV_C_D3A_LINH_WHISPER/tell | — | dorm_ceiling | 35/15 | 0/-1/0/3/3 | — | — |
| D3Đ | EV_C_D3N_DUC_CONFESSION/keep_secret | PR_LINH_TIP_CAPTIVE<br>PR_LINH_RELAY_CAPTIVE_TAGS<br>R_INTERROGATION_D4 | dorm_ceiling | 45/25 | 0/-1/0/3/3 | — | thach:CAPTIVE_PC_NEAR_ADMIN_D3=R |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D4M_INTERROGATION/blame_linh | — | dorm_ceiling | 60/20 | 0/-1/0/1/3 | — | — |
| D4C | EV_C_D4A_LINH_OFFER/refuse<br>EV_C_D4A_PHONE_DECISION/take | — | player | 75/25 | 0/-1/0/0/2 | — | — |
| D4Đ | (bỏ qua 1 optional) | — | player | 75/25 | 0/-1/0/0/2 | — | — |
| D5S | EV_S_QUOTA_SHIFT/comply | — | player | 80/25 | 0/-1/0/0/2 | — | — |
| D5C | EV_C_D5A_PHONE_CONTENTS/call_out | — | player | 90/35 | 0/-1/0/0/2 | — | — |
| D5Đ | — | A_THACH_RECRUIT | player | 90/35 | 0/-1/0/0/2 | — | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D6M_THACH_DEAL/accept | — | player | 85/5 | 0/-1/0/-1/0 | — | — |
| D6C | — | — | player | 85/5 | 0/-1/0/-1/0 | — | — |
| D6Đ | — | R_EXPOSURE_RAID | player | 85/5 | 0/-1/0/-1/0 | — | — |
| D7S | EV_S_D7M_RAID/c_help | — | player | 75/5 | 0/-1/0/-1/0 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D5Đ: convergence [R_THACH_DEAL_OFFER]→[A_THACH_RECRUIT].

### S5_TELL_LINH — Nói với Linh "em thấy Đức" D3 chiều (tell) — Linh có tên

Vai: **captive** · Ending Phase 3: **E_INVERSION** · Ending Phase 2 baseline: **E_INVERSION**
Tài liệu kỳ vọng: Linh báo Đức seg 8 → Thạch lục trần seg 9 (sớm hơn 1 ngày) (docs/04 hàng 5)
**KHOẢNG CÁCH ĐÃ BIẾT:** docs/04 hàng 5 giả định một luật "Linh báo TÊN Đức" không tồn tại trong content (T_C_TOLD_LINH_ABOUT_DUC không có reader lan truyền). Kết quả thực tế: chuỗi thường (chỗ giấu qua Đức→Linh→Thạch, raid seg 11). Đức bị quy vì Thạch biết người mới che giường Đức (tag relay), không phải vì Linh báo tên.

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | EV_C_D2N_LINH_PROBE/tell | — | mai_drawer | 20/0 | 0/-1/0/3/3 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D3M_DUC_PALE | — | dorm_ceiling | 25/0 | 0/-1/0/3/3 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_C_D3A_SEARCH/cover<br>EV_C_D3A_LINH_WHISPER/tell | — | dorm_ceiling | 35/15 | 0/-1/0/3/3 | — | — |
| D3Đ | EV_C_D3N_DUC_CONFESSION/keep_secret | PR_LINH_TIP_CAPTIVE<br>PR_LINH_RELAY_CAPTIVE_TAGS<br>R_INTERROGATION_D4 | dorm_ceiling | 45/25 | 0/-1/0/3/3 | — | thach:CAPTIVE_PC_NEAR_ADMIN_D3=R |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D4M_INTERROGATION/blame_linh | — | dorm_ceiling | 60/20 | 0/-1/0/1/3 | — | — |
| D4C | EV_C_D4A_LINH_OFFER/refuse<br>EV_C_D4A_PHONE_DECISION/leave | PR_DUC_CONFIDES_LINH | dorm_ceiling | 65/20 | 0/-1/0/0/3 | — | linh:PHONE_EXISTS=R<br>linh:PHONE_HIDDEN_DORM_CEILING=R |
| D4Đ | (bỏ qua 1 optional) | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 65/20 | 0/-1/0/0/3 | duc:isolated | thach:PHONE_HIDDEN_DORM_CEILING=R<br>thach:PHONE_EXISTS=C<br>thach:PHONE_HIDDEN_DORM_CEILING=C<br>thach:PHONE_TAKEN_BY_DUC=R<br>thach:DUC_IS_THE_LEAK=R |
| D5S | EV_S_QUOTA_SHIFT/comply | PR_THACH_TELLS_VU_SCAPEGOAT | thach | 70/20 | 0/-1/0/0/3 | duc:isolated | vu:DUC_IS_THE_LEAK=R |
| D5C | EV_S_D5A_DUC_TAKEN/c_speak | — | thach | 80/40 | 0/-1/0/0/3 | duc:isolated | — |
| D5Đ | — | PR_LINH_RELAY_CAPTIVE_TAGS<br>A_THACH_RECRUIT | thach | 80/40 | 0/-1/0/0/3 | duc:isolated | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D6M_THACH_DEAL/accept | — | thach | 75/10 | 0/-1/0/-1/1 | duc:isolated | — |
| D6C | — | — | thach | 75/10 | 0/-1/0/-1/1 | duc:isolated | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 75/10 | 0/-1/0/-1/1 | duc:isolated | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 75/10 | 0/-1/0/-1/1 | duc:isolated | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/c_with_duc | — | thach | 70/10 | 0/-1/0/-1/1 | duc:isolated | — |
| D7Đ | — | — | thach | 70/10 | 0/-1/0/-1/1 | duc:isolated | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D4Đ: convergence [PR_LINH_RELAY_LOCATION,R_THACH_RAID_CEILING]→[PR_LINH_RELAY_LOCATION,A_THACH_RAID_WHERE_I_BELIEVE]; D5Đ: convergence [PR_LINH_RELAY_CAPTIVE_TAGS,R_THACH_DEAL_OFFER]→[PR_LINH_RELAY_CAPTIVE_TAGS,A_THACH_RECRUIT].

### S6_MOVE_YARD_DUC_CALLS — Chuyển điện thoại ra sân cùng Đức rồi KHÔNG đọc nó → Đức tự gọi (hệ quả phát sinh)

Vai: **captive** · Ending Phase 3: **E_INVERSION** · Ending Phase 2 baseline: **E_INVERSION**
Tài liệu kỳ vọng: A_DUC_TRY_CALL seg 13 → duc.calledHome; A_VU_SEES_DUC_CALL seg 14 → Vũ OBSERVED Đức muốn gọi mẹ (không +trust vì người chơi không đưa)

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | EV_C_D2N_LINH_PROBE/tell | — | mai_drawer | 20/0 | 0/-1/0/3/3 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D3M_DUC_PALE | — | dorm_ceiling | 25/0 | 0/-1/0/3/3 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_C_D3A_SEARCH/cover<br>EV_C_D3A_LINH_WHISPER/tell | — | dorm_ceiling | 35/15 | 0/-1/0/3/3 | — | — |
| D3Đ | EV_C_D3N_DUC_CONFESSION/keep_secret | PR_LINH_TIP_CAPTIVE<br>PR_LINH_RELAY_CAPTIVE_TAGS<br>R_INTERROGATION_D4 | dorm_ceiling | 45/25 | 0/-1/0/3/3 | — | thach:CAPTIVE_PC_NEAR_ADMIN_D3=R |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D4M_INTERROGATION/blame_linh | — | dorm_ceiling | 60/20 | 0/-1/0/1/3 | — | — |
| D4C | EV_C_D4A_LINH_OFFER/refuse<br>EV_C_D4A_PHONE_DECISION/move_yard | — | yard_cache | 70/30 | 0/-1/0/0/3 | — | — |
| D4Đ | (bỏ qua 1 optional) | — | yard_cache | 70/30 | 0/-1/0/0/3 | — | — |
| D5S | EV_S_QUOTA_SHIFT/comply | — | yard_cache | 75/30 | 0/-1/0/0/3 | — | — |
| D5C | (bỏ qua 1 optional) | A_DUC_TRY_CALL<br>A_VU_SEES_DUC_CALL | yard_cache | 75/30 | 0/-1/0/0/3 | — | vu:DUC_WANTS_TO_CALL_MOTHER=O |
| D5Đ | — | A_THACH_RECRUIT | yard_cache | 75/30 | 0/-1/0/0/3 | — | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D6M_THACH_DEAL/accept | — | yard_cache | 70/0 | 0/-1/0/-1/1 | — | — |
| D6C | — | — | yard_cache | 70/0 | 0/-1/0/-1/1 | — | — |
| D6Đ | — | R_TRANSFER_PREP | yard_cache | 70/0 | 0/-1/0/-1/1 | — | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | yard_cache | 70/0 | 0/-1/0/-1/1 | — | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/c_with_duc | — | yard_cache | 65/0 | 0/-1/0/-1/1 | — | — |
| D7Đ | — | — | yard_cache | 65/0 | 0/-1/0/-1/1 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D5C: convergence []→[A_DUC_TRY_CALL,A_VU_SEES_DUC_CALL]; D5Đ: convergence [R_THACH_DEAL_OFFER]→[A_THACH_RECRUIT].

### S7_MAI_NEVER_ACTS — Mai có drive SELF_RESCUE nhưng không có đường tri thức hợp lệ → không hành động (docs/04 hàng 6)

Vai: **captive** · Ending Phase 3: **E_INVERSION** · Ending Phase 2 baseline: **E_INVERSION**
Tài liệu kỳ vọng: Mai suy ra "ở ký túc" sau khám xét → tự lục 14:00 D4 → lấy lại trước Linh báo (docs/04 hàng 6)
**KHOẢNG CÁCH ĐÃ BIẾT:** NOT IMPLEMENTED: cuộc khám xét D3 chiều là canonical nhưng không phải BackgroundOccurrence → Mai không có quan sát hợp lệ để suy luận. Cần PO duyệt thêm BG_D3A_SEARCH (content Phase 2) trước khi viết A_MAI_SEARCH_DORM.

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | EV_C_D2N_LINH_PROBE/tell | — | mai_drawer | 20/0 | 0/-1/0/3/3 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D3M_DUC_PALE | — | dorm_ceiling | 25/0 | 0/-1/0/3/3 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_C_D3A_SEARCH/cover<br>EV_C_D3A_LINH_WHISPER/tell | — | dorm_ceiling | 35/15 | 0/-1/0/3/3 | — | — |
| D3Đ | EV_C_D3N_DUC_CONFESSION/keep_secret | PR_LINH_TIP_CAPTIVE<br>PR_LINH_RELAY_CAPTIVE_TAGS<br>R_INTERROGATION_D4 | dorm_ceiling | 45/25 | 0/-1/0/3/3 | — | thach:CAPTIVE_PC_NEAR_ADMIN_D3=R |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D4M_INTERROGATION/blame_linh | — | dorm_ceiling | 60/20 | 0/-1/0/1/3 | — | — |
| D4C | EV_C_D4A_LINH_OFFER/refuse<br>EV_C_D4A_PHONE_DECISION/leave | PR_DUC_CONFIDES_LINH | dorm_ceiling | 65/20 | 0/-1/0/0/3 | — | linh:PHONE_EXISTS=R<br>linh:PHONE_HIDDEN_DORM_CEILING=R |
| D4Đ | (bỏ qua 1 optional) | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 65/20 | 0/-1/0/0/3 | duc:isolated | thach:PHONE_HIDDEN_DORM_CEILING=R<br>thach:PHONE_EXISTS=C<br>thach:PHONE_HIDDEN_DORM_CEILING=C<br>thach:PHONE_TAKEN_BY_DUC=R<br>thach:DUC_IS_THE_LEAK=R |
| D5S | EV_S_QUOTA_SHIFT/comply | PR_THACH_TELLS_VU_SCAPEGOAT | thach | 70/20 | 0/-1/0/0/3 | duc:isolated | vu:DUC_IS_THE_LEAK=R |
| D5C | EV_S_D5A_DUC_TAKEN/c_speak | — | thach | 80/40 | 0/-1/0/0/3 | duc:isolated | — |
| D5Đ | — | PR_LINH_RELAY_CAPTIVE_TAGS<br>A_THACH_RECRUIT | thach | 80/40 | 0/-1/0/0/3 | duc:isolated | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_C_D6M_THACH_DEAL/accept | — | thach | 75/10 | 0/-1/0/-1/1 | duc:isolated | — |
| D6C | — | — | thach | 75/10 | 0/-1/0/-1/1 | duc:isolated | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 75/10 | 0/-1/0/-1/1 | duc:isolated | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 75/10 | 0/-1/0/-1/1 | duc:isolated | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/c_with_duc | — | thach | 70/10 | 0/-1/0/-1/1 | duc:isolated | — |
| D7Đ | — | — | thach | 70/10 | 0/-1/0/-1/1 | duc:isolated | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D4Đ: convergence [PR_LINH_RELAY_LOCATION,R_THACH_RAID_CEILING]→[PR_LINH_RELAY_LOCATION,A_THACH_RAID_WHERE_I_BELIEVE]; D5Đ: convergence [PR_LINH_RELAY_CAPTIVE_TAGS,R_THACH_DEAL_OFFER]→[PR_LINH_RELAY_CAPTIVE_TAGS,A_THACH_RECRUIT].

### O1_PASSIVE — Operator thụ động (optional bỏ qua, forced = choice đầu)

Vai: **operator** · Ending Phase 3: **E_TRANSFER** · Ending Phase 2 baseline: **E_TRANSFER**

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | (bỏ qua 1 optional) | — | mai_drawer | 5/5 | 1/0/0/0/-2 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D3M_THACH_ORDER/accept<br>(bỏ qua 1 optional) | — | dorm_ceiling | 10/0 | 1/0/0/0/-2 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_O_D3A_SEARCH/thorough | — | dorm_ceiling | 20/0 | 1/0/0/0/-3 | — | — |
| D3Đ | EV_O_D3N_LINH_TIP/pass_up | — | dorm_ceiling | 20/0 | 1/0/0/0/-3 | — | thach:CAPTIVE_PC_NEAR_ADMIN_D3=R |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D4M_THACH_NAME/stall<br>EV_O_D4M_INTERROGATE_NEWCOMER/pressure | — | dorm_ceiling | 55/5 | 1/0/0/0/-3 | — | — |
| D4C | (bỏ qua 1 optional) | PR_DUC_CONFIDES_LINH | dorm_ceiling | 55/5 | 1/0/0/0/-3 | — | linh:PHONE_EXISTS=R<br>linh:PHONE_HIDDEN_DORM_CEILING=R |
| D4Đ | — | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 55/5 | 1/0/0/0/-3 | — | thach:PHONE_HIDDEN_DORM_CEILING=R<br>thach:PHONE_EXISTS=C<br>thach:PHONE_HIDDEN_DORM_CEILING=C |
| D5S | EV_S_QUOTA_SHIFT/comply | — | thach | 60/5 | 1/0/0/0/-3 | — | — |
| D5C | — | — | thach | 60/5 | 1/0/0/0/-3 | — | — |
| D5Đ | (bỏ qua 1 optional) | — | thach | 60/5 | 1/0/0/0/-3 | — | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D6M_THACH_OFFER/accept | — | thach | 65/0 | 1/0/0/0/-3 | — | — |
| D6C | — | — | thach | 65/0 | 1/0/0/0/-3 | — | — |
| D6Đ | (bỏ qua 1 optional) | R_TRANSFER_PREP | thach | 65/0 | 1/0/0/0/-3 | — | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 65/0 | 1/0/0/0/-3 | — | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/o_cab | — | thach | 70/0 | 1/0/0/0/-3 | — | — |
| D7Đ | — | — | thach | 70/0 | 1/0/0/0/-3 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D4Đ: status "duc:isolated"→"present"; convergence [PR_LINH_RELAY_LOCATION,R_THACH_RAID_CEILING]→[PR_LINH_RELAY_LOCATION,A_THACH_RAID_WHERE_I_BELIEVE]; D5S: status "duc:isolated"→"present"; convergence [PR_THACH_TELLS_VU_SCAPEGOAT]→[]; D5C: status "duc:isolated"→"present".

### O2_HIDE_ABSORB — Operator cắt Linh (discredit), Vũ tìm thấy, Operator bảo "giữ im" → vu_locker hấp thụ (audit CF-10)

Vai: **operator** · Ending Phase 3: **E_TRANSFER** · Ending Phase 2 baseline: **E_TRANSFER**
Tài liệu kỳ vọng: Đức vẫn kể Linh (Operator không thể cảnh báo em), nhưng kênh Linh→Thạch đã bị cắt (discredit) nên Thạch không bao giờ biết chỗ.
**KHOẢNG CÁCH ĐÃ BIẾT:** F-06: sau o_hide không còn writer nào cho phone.location → Operator không thể lấy/đưa điện thoại cho Mai.

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | (bỏ qua 1 optional) | — | mai_drawer | 5/0 | 1/1/1/0/0 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D3M_THACH_ORDER/accept<br>(bỏ qua 1 optional) | — | dorm_ceiling | 10/0 | 1/1/1/0/0 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_O_D3A_SEARCH/watch_linh | — | dorm_ceiling | 10/0 | 1/1/1/0/0 | — | — |
| D3Đ | EV_O_D3N_LINH_TIP/verify | — | dorm_ceiling | 15/0 | 1/1/1/0/0 | — | — |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D4M_THACH_NAME/stall<br>EV_O_D4M_VERIFY_TIP/discredit | — | dorm_ceiling | 35/20 | 0/1/1/0/0 | — | — |
| D4C | (bỏ qua 2 optional) | PR_DUC_CONFIDES_LINH | dorm_ceiling | 35/20 | 0/1/1/0/0 | — | linh:PHONE_EXISTS=R<br>linh:PHONE_HIDDEN_DORM_CEILING=R |
| D4Đ | — | — | dorm_ceiling | 35/20 | 0/1/1/0/0 | — | — |
| D5S | EV_S_QUOTA_SHIFT/comply | A_VU_ROUTINE_CEILING_CHECK | vu_locker | 40/20 | 0/1/1/0/0 | — | vu:PHONE_EXISTS=C<br>vu:PHONE_HIDDEN_DORM_CEILING=C<br>vu:PHONE_TAKEN_BY_DUC=R |
| D5C | EV_S_D5A_PHONE_FOUND_BY_VU/o_hide | A_VU_SHIELD_PHONE | vu_locker | 40/25 | 0/2/1/0/0 | — | — |
| D5Đ | (bỏ qua 1 optional) | — | vu_locker | 40/25 | 0/2/1/0/0 | — | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D6M_THACH_OFFER/refuse | — | vu_locker | 45/50 | -2/2/1/0/0 | — | — |
| D6C | — | — | vu_locker | 45/50 | -2/2/1/0/0 | — | — |
| D6Đ | — | R_TRANSFER_PREP | vu_locker | 45/50 | -2/2/1/0/0 | — | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | vu_locker | 45/50 | -2/2/1/0/0 | — | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/o_cab | — | vu_locker | 50/50 | -2/2/1/0/0 | — | — |
| D7Đ | — | — | vu_locker | 50/50 | -2/2/1/0/0 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D5S: convergence [R_VU_CEILING_CHECK]→[A_VU_ROUTINE_CEILING_CHECK]; D5C: convergence []→[A_VU_SHIELD_PHONE].

### O3_POINT_MAI_DEAL — Operator chỉ điểm Mai với Thạch (point_mai) NHƯNG đã hỏi Mai "chị mất gì" → Mai có tới đề nghị không?

Vai: **operator** · Ending Phase 3: **E_TRANSFER** · Ending Phase 2 baseline: **E_TRANSFER**
Tài liệu kỳ vọng: Phase 2: R_MAI_DEAL bị chặn bởi T_O_POINTED_AT_MAI. Phase 3: Mai không biết mình bị chỉ điểm → vẫn tới.

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | (bỏ qua 1 optional) | — | mai_drawer | 5/5 | 1/0/1/0/0 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D3M_THACH_ORDER/point_mai<br>EV_O_D3M_MAI_PANIC/confront | — | dorm_ceiling | 15/0 | 1/0/2/0/0 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false)<br>thach:PHONE_OWNER_MAI=R |
| D3C | EV_O_D3A_SEARCH/thorough | — | dorm_ceiling | 25/0 | 1/0/2/0/-1 | — | — |
| D3Đ | EV_O_D3N_LINH_TIP/suppress | — | dorm_ceiling | 30/10 | 1/0/2/0/-1 | — | — |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D4M_THACH_NAME/stall | — | dorm_ceiling | 50/25 | 1/0/2/0/-1 | — | — |
| D4C | (bỏ qua 2 optional) | PR_DUC_CONFIDES_LINH | dorm_ceiling | 50/25 | 1/0/2/0/-1 | — | linh:PHONE_EXISTS=R<br>linh:PHONE_HIDDEN_DORM_CEILING=R |
| D4Đ | — | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 50/25 | 1/0/2/0/-1 | — | thach:PHONE_HIDDEN_DORM_CEILING=R<br>thach:PHONE_EXISTS=C<br>thach:PHONE_HIDDEN_DORM_CEILING=C |
| D5S | EV_S_QUOTA_SHIFT/comply | A_MAI_APPROACH_OPERATOR | thach | 55/25 | 1/0/2/0/-1 | — | — |
| D5C | EV_O_D5A_MAI_DEAL/agree | — | thach | 55/25 | 1/0/3/0/-1 | — | — |
| D5Đ | (bỏ qua 1 optional) | — | thach | 55/25 | 1/0/3/0/-1 | — | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D6M_THACH_OFFER/refuse | — | thach | 60/50 | -1/0/3/0/-1 | — | — |
| D6C | — | — | thach | 60/50 | -1/0/3/0/-1 | — | — |
| D6Đ | — | R_TRANSFER_PREP | thach | 60/50 | -1/0/3/0/-1 | — | — |
| D7S | EV_S_D7M_LOADING_PREP | PR_THACH_TELLS_VU_TRANSFER | thach | 60/50 | -1/0/3/0/-1 | — | vu:TRANSFER_DAY7=R |
| D7C | EV_S_D7A_LOADING/o_cab | — | thach | 65/50 | -1/0/3/0/-1 | — | — |
| D7Đ | — | — | thach | 65/50 | -1/0/3/0/-1 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D4Đ: status "duc:isolated"→"present"; convergence [PR_LINH_RELAY_LOCATION,R_THACH_RAID_CEILING]→[PR_LINH_RELAY_LOCATION,A_THACH_RAID_WHERE_I_BELIEVE]; D5S: status "duc:isolated"→"present"; convergence [PR_THACH_TELLS_VU_SCAPEGOAT]→[A_MAI_APPROACH_OPERATOR]; D5C: status "duc:isolated"→"present".

### O4_EXPOSURE — Operator: đối chất Mai → chép sổ → nhận thỏa thuận → gửi bằng chứng → PHƠI BÀY, được nhận là nguồn

Vai: **operator** · Ending Phase 3: **E_EXPOSURE** · Ending Phase 2 baseline: **E_EXPOSURE**

| Seg | Người chơi | Convergence (rule/action/PR) | phone | STRESS/SUSP | trust | NPC status | NPC belief mới |
|---|---|---|---|---|---|---|---|
| D2Đ | (bỏ qua 1 optional) | — | mai_drawer | 5/0 | 1/0/1/0/0 | — | thach:BOSS_KNOWS_LEAK=C |
| D3S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D3M_THACH_ORDER/accept<br>EV_O_D3M_MAI_PANIC/confront | — | dorm_ceiling | 15/0 | 1/0/2/0/0 | — | duc:PHONE_EXISTS=C<br>duc:PHONE_TAKEN_BY_DUC=C<br>duc:PHONE_HIDDEN_DORM_CEILING=C<br>linh:LINH_SAW_DUC_TAKE_PHONE=C<br>linh:PHONE_TAKEN_BY_DUC=R<br>thach:SEARCH_IS_LEAK_HUNT=C<br>thach:SEARCH_IS_ABOUT_STOLEN_PHONE=C(false)<br>duc:PHONE_OWNER_MAI=R<br>linh:PHONE_TAKEN_BY_CAPTIVE_PC=O(false) |
| D3C | EV_O_D3A_SEARCH/watch_linh | — | dorm_ceiling | 15/0 | 1/0/2/0/0 | — | — |
| D3Đ | EV_O_D3N_LINH_TIP/suppress | — | dorm_ceiling | 20/10 | 1/0/2/0/0 | — | — |
| D4S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D4M_THACH_NAME/stall | — | dorm_ceiling | 40/25 | 1/0/2/0/0 | — | — |
| D4C | EV_O_D4A_LEDGER/copy | PR_DUC_CONFIDES_LINH | dorm_ceiling | 50/35 | 1/0/2/0/0 | — | linh:PHONE_EXISTS=R<br>linh:PHONE_HIDDEN_DORM_CEILING=R |
| D4Đ | — | PR_LINH_RELAY_LOCATION<br>A_THACH_RAID_WHERE_I_BELIEVE | thach | 50/35 | 1/0/2/0/0 | — | thach:PHONE_HIDDEN_DORM_CEILING=R<br>thach:PHONE_EXISTS=C<br>thach:PHONE_HIDDEN_DORM_CEILING=C |
| D5S | EV_S_QUOTA_SHIFT/comply | A_MAI_APPROACH_OPERATOR | thach | 55/35 | 1/0/2/0/0 | — | — |
| D5C | EV_O_D5A_MAI_DEAL/agree | — | thach | 55/35 | 1/0/3/0/0 | — | — |
| D5Đ | (bỏ qua 1 optional) | — | thach | 55/35 | 1/0/3/0/0 | — | — |
| D6S | EV_S_QUOTA_SHIFT/comply<br>EV_O_D6M_THACH_OFFER/accept | — | thach | 60/25 | 1/0/3/0/0 | — | — |
| D6C | EV_O_D6A_EVIDENCE_ROUTE/send | — | thach | 70/40 | 1/0/3/0/0 | — | — |
| D6Đ | (bỏ qua 1 optional) | R_EXPOSURE_RAID | thach | 70/40 | 1/0/3/0/0 | — | — |
| D7S | EV_S_D7M_RAID/o_surrender | — | thach | 60/40 | 1/0/3/0/0 | — | — |

Khác biệt Phase 2 → Phase 3 (cùng lựa chọn): D4Đ: status "duc:isolated"→"present"; convergence [PR_LINH_RELAY_LOCATION,R_THACH_RAID_CEILING]→[PR_LINH_RELAY_LOCATION,A_THACH_RAID_WHERE_I_BELIEVE]; D5S: status "duc:isolated"→"present"; convergence [PR_THACH_TELLS_VU_SCAPEGOAT,R_MAI_DEAL]→[A_MAI_APPROACH_OPERATOR]; D5C: status "duc:isolated"→"present".

## 2. Mọi lần `phone.location` đổi tay trong corpus (T08)

| Scenario | Seg | Từ → Đến | Tác nhân (CausalOrigin) |
|---|---|---|---|
| S1_PASSIVE | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| S1_PASSIVE | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| S2_COVER_WARN | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| S2_COVER_WARN | D5S | dorm_ceiling → vu_locker | npc_action:A_VU_ROUTINE_CEILING_CHECK (vu) |
| S2_COVER_WARN | D5Đ | vu_locker → thach | npc_action:A_VU_HAND_UP (vu) |
| S3_VU_TRUST | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| S3_VU_TRUST | D5S | dorm_ceiling → vu_locker | npc_action:A_VU_ROUTINE_CEILING_CHECK (vu) |
| S3_VU_TRUST | D5Đ | vu_locker → thach | npc_action:A_VU_HAND_UP (vu) |
| S4_TAKE_SWEEP | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| S4_TAKE_SWEEP | D4C | dorm_ceiling → player | choice:EV_C_D4A_PHONE_DECISION |
| S4_TAKE_SWEEP | D4C | player → thach | delayed_rule:R_SUSPICION_SWEEP |
| S4b_TAKE_CALL | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| S4b_TAKE_CALL | D4C | dorm_ceiling → player | choice:EV_C_D4A_PHONE_DECISION |
| S5_TELL_LINH | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| S5_TELL_LINH | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| S6_MOVE_YARD_DUC_CALLS | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| S6_MOVE_YARD_DUC_CALLS | D4C | dorm_ceiling → yard_cache | choice:EV_C_D4A_PHONE_DECISION |
| S7_MAI_NEVER_ACTS | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| S7_MAI_NEVER_ACTS | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| O1_PASSIVE | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| O1_PASSIVE | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| O2_HIDE_ABSORB | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| O2_HIDE_ABSORB | D5S | dorm_ceiling → vu_locker | npc_action:A_VU_ROUTINE_CEILING_CHECK (vu) |
| O3_POINT_MAI_DEAL | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| O3_POINT_MAI_DEAL | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| O4_EXPOSURE | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| O4_EXPOSURE | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| WP_E_ESCAPE_captive | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| WP_E_ESCAPE_captive | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| WP_E_ESCAPE_operator | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| WP_E_ESCAPE_operator | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| WP_E_EXPOSURE_captive | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| WP_E_EXPOSURE_captive | D4C | dorm_ceiling → player | choice:EV_C_D4A_PHONE_DECISION |
| WP_E_EXPOSURE_captive | D4C | player → thach | delayed_rule:R_SUSPICION_SWEEP |
| WP_E_EXPOSURE_operator | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| WP_E_EXPOSURE_operator | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| WP_E_INVERSION_captive | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| WP_E_INVERSION_captive | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| WP_E_INVERSION_operator | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| WP_E_INVERSION_operator | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| WP_E_TRANSFER_captive | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| WP_E_TRANSFER_captive | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| WP_E_TRANSFER_operator | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| WP_E_TRANSFER_operator | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| ZP_captive_first | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| ZP_captive_first | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| ZP_captive_last | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| ZP_captive_last | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| ZP_operator_first | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| ZP_operator_first | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |
| ZP_operator_last | D3S | mai_drawer → dorm_ceiling | background:BG_D3M_THEFT |
| ZP_operator_last | D4Đ | dorm_ceiling → thach | npc_action:A_THACH_RAID_WHERE_I_BELIEVE (thach) |

## 3. Bản đồ phụ thuộc (flag → writers → readers), content hiện tại

| Flag | visibleTo | Writers | Readers |
|---|---|---|---|
| `phone.location` | byValue | BG_D3M_THEFT, EV_C_D4A_PHONE_DECISION/move_yard, EV_C_D4A_PHONE_DECISION/take, EV_C_D4A_LINH_OFFER/hand_over, EV_S_D5A_PHONE_FOUND_BY_VU/o_take, EV_S_D5A_PHONE_FOUND_BY_VU/o_report, EV_C_D5A_PHONE_CONTENTS, EV_O_D5A_PHONE_CONTENTS/to_thach, EV_O_D5A_PHONE_CONTENTS/to_mai, EV_O_D5A_PHONE_CONTENTS/destroy, R_SUSPICION_SWEEP, ~~R_THACH_RAID_CEILING~~, ~~R_THACH_RECOVERS_PHONE_QUIET~~, ~~R_VU_CEILING_CHECK~~, ~~PR_VU_REPORTS_PHONE~~, **A_THACH_RAID_WHERE_I_BELIEVE**, **A_VU_ROUTINE_CEILING_CHECK**, **A_VU_HAND_UP** | EV_C_D4A_PHONE_DECISION, EV_C_D4A_LINH_OFFER/hand_over, EV_C_D5A_PHONE_CONTENTS, EV_O_D5A_PHONE_CONTENTS, EV_O_D6A_EVIDENCE_ROUTE, EV_C_D6A_PHONE_LAST_CHANCE, R_SUSPICION_SWEEP, R_DUC_CONFIDES_LATE, ~~R_THACH_RAID_CEILING~~, ~~R_THACH_RECOVERS_PHONE_QUIET~~, ~~R_VU_CEILING_CHECK~~, PR_DUC_CONFIDES_LINH, ~~PR_VU_REPORTS_PHONE~~, **A_THACH_RAID_WHERE_I_BELIEVE**, **A_VU_ROUTINE_CEILING_CHECK**, **A_VU_SHIELD_PHONE**, **A_VU_HAND_UP**, **A_DUC_TRY_CALL** |
| `evidence.outside` | — | EV_C_D5A_PHONE_CONTENTS/call_out, EV_O_D5A_PHONE_CONTENTS/send_out, EV_O_D5A_PHONE_CONTENTS/to_mai, EV_O_D6A_EVIDENCE_ROUTE/send, EV_C_D6A_PHONE_LAST_CHANCE/call | EV_O_D6A_EVIDENCE_ROUTE, EV_C_D6A_PHONE_LAST_CHANCE, R_EXPOSURE_RAID |
| `evidence.ledgerCopy` | — | EV_O_D4A_LEDGER/copy, EV_O_D6A_EVIDENCE_ROUTE/burn | EV_O_D6A_EVIDENCE_ROUTE, EV_S_D7M_RAID/o_surrender, EV_O_D7M_CALLED_UP/blackmail |
| `linh.reportsToThach` | linh,thach,vu | EV_O_D4M_VERIFY_TIP/discredit, EV_O_D5N_LINH_CONTACT/tell_truth, EV_C_D6A_LINH_TRUTH/expose, EV_C_D6A_LINH_TRUTH/turn | PR_LINH_TIP_CAPTIVE, PR_LINH_RELAY_CAPTIVE_TAGS, PR_LINH_RELAY_LOCATION |
| `linh.doubleAgent` | linh | EV_C_D6A_LINH_TRUTH/turn | PR_LINH_DOUBLE_AGENT_FEED |
| `thach.hasCaptiveTip` | thach,vu | EV_O_D3N_LINH_TIP/pass_up, EV_O_D4M_INTERROGATE_NEWCOMER/clear, PR_LINH_TIP_CAPTIVE, PR_LINH_DOUBLE_AGENT_FEED | R_INTERROGATION_D4, **A_THACH_RAID_WHERE_I_BELIEVE** |
| `duc.scapegoated` | all | EV_C_D4M_INTERROGATION/blame_duc, EV_O_D4M_THACH_NAME/name_duc, ~~R_THACH_RAID_CEILING~~, **A_THACH_RAID_WHERE_I_BELIEVE** | PR_THACH_TELLS_VU_SCAPEGOAT |
| `duc.calledHome` | duc,vu | EV_C_D5A_PHONE_CONTENTS/duc_call, **A_DUC_TRY_CALL** | ~~R_DUC_CALLED_HOME~~, **A_VU_SEES_DUC_CALL**, **A_DUC_TRY_CALL** |
| `mai.exposed` | thach,vu,mai | EV_O_D4M_THACH_NAME/name_mai, EV_O_D5A_PHONE_CONTENTS/to_thach | R_MAI_EXPOSED, ~~R_MAI_DEAL~~ |
| `mai.dealActive` | mai | EV_O_D5A_MAI_DEAL/agree, EV_O_D5A_MAI_DEAL/demand_all | EV_O_D5A_PHONE_CONTENTS/to_mai |
| `mai.dealIncludesAll` | mai | EV_O_D5A_MAI_DEAL/demand_all | EV_S_D7M_RAID |
| `escape.routeKnown` | — | EV_C_D4N_PATROL2/watch, EV_O_D4N_VU_CONFIDES, EV_C_D5N_VU_TALK, EV_O_D6M_THACH_OFFER/accept, EV_O_D6M_THACH_OFFER/feign | EV_C_D6A_DUC_ASK, EV_S_D6N_ESCAPE |
| `escape.vuWillOpen` | vu | EV_C_D5N_VU_TALK/ask_look_away | EV_S_D6N_ESCAPE/go |
| `escape.withDuc` | duc | EV_C_D6A_DUC_ASK/yes | EV_S_D6N_ESCAPE/go |
| `escape.withThach` | thach | EV_O_D6M_THACH_OFFER/accept | EV_S_D6N_ESCAPE/go |
| `player.escaped` | all | EV_S_D6N_ESCAPE/go | E_ESCAPE |
| `player.caught` | all | EV_S_D6N_ESCAPE/go | EV_S_D6N_ESCAPE |
| `captive_pc.isolated` | all | EV_C_D4M_INTERROGATION/silent, EV_O_D4M_INTERROGATE_NEWCOMER/pressure, EV_S_D6N_ESCAPE/go | EV_S_D6N_ESCAPE, ~~R_THACH_DEAL_OFFER~~, **A_THACH_RECRUIT** |
| `operator.marked` | thach,vu | EV_S_D6N_ESCAPE/go, EV_O_D7M_CALLED_UP/blackmail, R_OPERATOR_MARKED | EV_S_D7A_LOADING/o_cab, EV_S_D7A_LOADING/o_back, R_OPERATOR_MARKED, R_CALLED_UP, E_INVERSION |
| `operator.cooperationProof` | — | EV_O_D5A_PHONE_CONTENTS/send_out, EV_O_D6A_EVIDENCE_ROUTE/send, EV_S_D7M_RAID/o_surrender | EV_S_D7M_RAID |
| `raid.scheduled` | — | R_EXPOSURE_RAID | R_TRANSFER_PREP, R_CALLED_UP, PR_THACH_TELLS_VU_TRANSFER |
| `raid.happened` | all | EV_S_D7M_RAID | E_EXPOSURE |
| `transfer.prepStarted` | all | R_TRANSFER_PREP | EV_S_D7M_LOADING_PREP, EV_S_D7A_LOADING |
| `quota.score` | thach,vu | EV_S_QUOTA_SHIFT/comply, EV_S_QUOTA_SHIFT/slack, EV_S_QUOTA_SHIFT/sabotage | ~~R_THACH_DEAL_OFFER~~, **A_THACH_RECRUIT** |
| `vu.shieldingPhone` | vu | **A_VU_SHIELD_PHONE** | **A_VU_HAND_UP** |

In đậm = NpcAction (Phase 3); gạch ngang = rule Phase 2 bị thay thế khi intents được nạp.

## 4. Kiểm toán lan truyền tri thức NPC — ai biết gì, từ đâu, lúc nào (S1_PASSIVE và O4_EXPOSURE)

### S1_PASSIVE

| NPC | Fact | Status | believed | Nguồn | Seg | Cause |
|---|---|---|---|---|---|---|
| thach | F_TRUCK_DAY2_WAS_INVENTORY | CONFIRMED | true | self | D2S | background:BG_D2M_TRUCK_INVENTORY |
| thach | F_BOSS_KNOWS_LEAK | CONFIRMED | true | self | D2Đ | background:BG_D2N_BOSS_CALL |
| thach | F_SEARCH_IS_LEAK_HUNT | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| thach | F_SEARCH_IS_ABOUT_STOLEN_PHONE | CONFIRMED | false | self | D3S | background:BG_D3M_THEFT |
| thach | F_CAPTIVE_PC_NEAR_ADMIN_D3 | RUMOR | true | linh | D3Đ | propagation:PR_LINH_TIP_CAPTIVE **(misinfo)** |
| thach | F_PHONE_HIDDEN_DORM_CEILING | CONFIRMED | true | self | D4Đ | npc_action:A_THACH_RAID_WHERE_I_BELIEVE |
| thach | F_PHONE_EXISTS | CONFIRMED | true | self | D4Đ | npc_action:A_THACH_RAID_WHERE_I_BELIEVE |
| vu | F_TRANSFER_DAY7 | RUMOR | true | thach | D7S | propagation:PR_THACH_TELLS_VU_TRANSFER |
| mai | F_TRUCK_DAY2_WAS_INVENTORY | CONFIRMED | true | self | D2S | background:BG_D2M_TRUCK_INVENTORY |
| linh | F_DUC_WANTS_TO_CALL_MOTHER | RUMOR | true | duc | D2C | background:BG_D2A_DUC_TELLS_LINH |
| linh | F_LINH_SAW_DUC_TAKE_PHONE | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| linh | F_PHONE_TAKEN_BY_DUC | RUMOR | true | self | D3S | background:BG_D3M_THEFT |
| linh | F_PHONE_TAKEN_BY_CAPTIVE_PC | OBSERVED | false | self | D3S | background:BG_D3M_THEFT |
| linh | F_PHONE_EXISTS | RUMOR | true | duc | D4C | propagation:PR_DUC_CONFIDES_LINH |
| linh | F_PHONE_HIDDEN_DORM_CEILING | RUMOR | true | duc | D4C | propagation:PR_DUC_CONFIDES_LINH |
| duc | F_PHONE_EXISTS | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| duc | F_PHONE_TAKEN_BY_DUC | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| duc | F_PHONE_HIDDEN_DORM_CEILING | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| duc | F_PHONE_OWNER_MAI | RUMOR | true | self | D3S | background:BG_D3M_THEFT |

### O4_EXPOSURE

| NPC | Fact | Status | believed | Nguồn | Seg | Cause |
|---|---|---|---|---|---|---|
| thach | F_TRUCK_DAY2_WAS_INVENTORY | CONFIRMED | true | self | D2S | background:BG_D2M_TRUCK_INVENTORY |
| thach | F_BOSS_KNOWS_LEAK | CONFIRMED | true | self | D2Đ | background:BG_D2N_BOSS_CALL |
| thach | F_SEARCH_IS_LEAK_HUNT | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| thach | F_SEARCH_IS_ABOUT_STOLEN_PHONE | CONFIRMED | false | self | D3S | background:BG_D3M_THEFT |
| thach | F_PHONE_HIDDEN_DORM_CEILING | CONFIRMED | true | self | D4Đ | npc_action:A_THACH_RAID_WHERE_I_BELIEVE |
| thach | F_PHONE_EXISTS | CONFIRMED | true | self | D4Đ | npc_action:A_THACH_RAID_WHERE_I_BELIEVE |
| mai | F_TRUCK_DAY2_WAS_INVENTORY | CONFIRMED | true | self | D2S | background:BG_D2M_TRUCK_INVENTORY |
| linh | F_DUC_WANTS_TO_CALL_MOTHER | RUMOR | true | duc | D2C | background:BG_D2A_DUC_TELLS_LINH |
| linh | F_LINH_SAW_DUC_TAKE_PHONE | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| linh | F_PHONE_TAKEN_BY_DUC | RUMOR | true | self | D3S | background:BG_D3M_THEFT |
| linh | F_PHONE_TAKEN_BY_CAPTIVE_PC | OBSERVED | false | self | D3S | background:BG_D3M_THEFT |
| linh | F_PHONE_EXISTS | RUMOR | true | duc | D4C | propagation:PR_DUC_CONFIDES_LINH |
| linh | F_PHONE_HIDDEN_DORM_CEILING | RUMOR | true | duc | D4C | propagation:PR_DUC_CONFIDES_LINH |
| duc | F_PHONE_EXISTS | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| duc | F_PHONE_TAKEN_BY_DUC | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| duc | F_PHONE_HIDDEN_DORM_CEILING | CONFIRMED | true | self | D3S | background:BG_D3M_THEFT |
| duc | F_PHONE_OWNER_MAI | RUMOR | true | self | D3S | background:BG_D3M_THEFT |

## 5. Liveness — rule/action/PR nào từng bắn trong corpus (T07)

| Rule | Bắn trong | Ghi chú |
|---|---|---|
| R_SUSPICION_SWEEP | 2 run | S4_TAKE_SWEEP, WP_E_EXPOSURE_captive |
| R_INTERROGATION_D4 | 12 run | S1_PASSIVE, S2_COVER_WARN, S4_TAKE_SWEEP… |
| R_DUC_CONFIDES_LATE | 3 run | WP_E_ESCAPE_captive, WP_E_INVERSION_captive, ZP_captive_first |
| R_MAI_EXPOSED | 1 run | WP_E_EXPOSURE_operator |
| R_OPERATOR_MARKED | 1 run | ZP_operator_last |
| R_LINH_PULLED_OUT | **KHÔNG BAO GIỜ** | reachable, không có trong corpus |
| R_EXPOSURE_RAID | 2 run | S4b_TAKE_CALL, O4_EXPOSURE |
| R_TRANSFER_PREP | 20 run | S1_PASSIVE, S2_COVER_WARN, S3_VU_TRUST… |
| R_CALLED_UP | 1 run | ZP_operator_last |
| A_THACH_RAID_WHERE_I_BELIEVE | 17 run | S1_PASSIVE, S5_TELL_LINH, S7_MAI_NEVER_ACTS… |
| A_VU_ROUTINE_CEILING_CHECK | 24 run | S1_PASSIVE, S2_COVER_WARN, S3_VU_TRUST… |
| A_VU_SHIELD_PHONE | 1 run | O2_HIDE_ABSORB |
| A_VU_HAND_UP | 2 run | S2_COVER_WARN, S3_VU_TRUST |
| A_VU_SEES_DUC_CALL | 1 run | S6_MOVE_YARD_DUC_CALLS |
| A_DUC_TRY_CALL | 1 run | S6_MOVE_YARD_DUC_CALLS |
| A_MAI_APPROACH_OPERATOR | 2 run | O3_POINT_MAI_DEAL, O4_EXPOSURE |
| A_THACH_RECRUIT | 13 run | S1_PASSIVE, S2_COVER_WARN, S3_VU_TRUST… |
| PR_LINH_TIP_CAPTIVE | 12 run | S1_PASSIVE, S2_COVER_WARN, S4_TAKE_SWEEP… |
| PR_LINH_RELAY_CAPTIVE_TAGS | 11 run | S2_COVER_WARN, S4_TAKE_SWEEP, S4b_TAKE_CALL… |
| PR_DUC_CONFIDES_LINH | 18 run | S1_PASSIVE, S5_TELL_LINH, S7_MAI_NEVER_ACTS… |
| PR_LINH_RELAY_LOCATION | 17 run | S1_PASSIVE, S5_TELL_LINH, S7_MAI_NEVER_ACTS… |
| PR_LINH_DOUBLE_AGENT_FEED | **KHÔNG BAO GIỜ** | chết động (F-01 cascade) |
| PR_THACH_TELLS_VU_SCAPEGOAT | 5 run | S5_TELL_LINH, S7_MAI_NEVER_ACTS, WP_E_ESCAPE_captive… |
| PR_THACH_TELLS_VU_TRANSFER | 20 run | S1_PASSIVE, S2_COVER_WARN, S3_VU_TRUST… |
| ~~R_THACH_RAID_CEILING~~ | — | thay thế bởi A_THACH_RAID_WHERE_I_BELIEVE |
| ~~R_THACH_RECOVERS_PHONE_QUIET~~ | — | thay thế bởi A_THACH_RAID_WHERE_I_BELIEVE |
| ~~R_VU_CEILING_CHECK~~ | — | thay thế bởi A_VU_ROUTINE_CEILING_CHECK |
| ~~PR_VU_REPORTS_PHONE~~ | — | thay thế bởi A_VU_HAND_UP |
| ~~R_DUC_CALLED_HOME~~ | — | thay thế bởi A_VU_SEES_DUC_CALL |
| ~~R_MAI_DEAL~~ | — | thay thế bởi A_MAI_APPROACH_OPERATOR |
| ~~R_THACH_DEAL_OFFER~~ | — | thay thế bởi A_THACH_RECRUIT |

## 6. Kết quả test thực tế

```
ok 1 - IDs: unique and correctly prefixed
ok 2 - WORLD TRUTH: decoys are false, unconfirmable, unheld; non-decoys are true
ok 3 - WORLD TRUTH ↔ NPC initial knowledge agree exactly (CONFIRMED holders)
ok 4 - REFERENTIAL INTEGRITY: facts, flags, npcs, events, tags all exist
ok 5 - FLAGS: enumerated string flags only take declared values; flagAdd only on numbers
ok 6 - GATE A: every choice mutates state; observation-only events grant something; every player tag is read somewhere
ok 7 - BELIEF INVARIANTS: OBSERVED/CONFIRMED grants match truth; wrong RUMORs are flagged misinformation
ok 8 - NPC KNOWLEDGE never reads the player: background effects touch only NPCs and flags
ok 9 - GATE C: every npcBelieves condition is satisfiable by a traceable path
ok 10 - GATE C: an NPC can only be the source of a fact it can hold (unless deliberately lying)
ok 11 - GATE C: npcKnowsTag conditions reference tags the NPC can actually receive
ok 12 - GATE C: propagation edges exist in the relationship graph
ok 13 - GATE B: facts are confirmable exactly for the roles truth.json declares
ok 14 - ASYMMETRY: some facts are confirmable by only one role, and ≥40% of events are role-exclusive
ok 15 - TIMELINE: slots are valid; scheduled events are scheduled by someone, after the scheduler
ok 16 - RULES: `reads` documents exactly the seeds the condition uses
ok 17 - BUTTERFLY: every delayed rule reads a seed produced strictly earlier than it can fire
ok 18 - VERTICAL SLICE: Day 3 fully covered for both roles, plus a Day-5 echo
ok 19 - GATE F: four distinct endings with disjoint triggers; witness paths exist and are chronological
ok 20 - GATE G: no operational content; every text field is abstract
ok 21 - CAUSAL ORIGIN: every mutation container is one of the five enumerated kinds
ok 22 - T01 — NPC never learns a fact without a valid information path (dynamic + adversarial)
ok 23 - T02 — no consequence precedes its cause (monotonic log, schedules strictly in the future, seeds before rules)
ok 24 - T03 — NPC never acts beyond its knowledge (visibility contract, dynamic belief-age check, adversarial)
ok 25 - T04 — no two incompatible world states coexist (per segment, every run)
ok 26 - T05 — a rumor never becomes canonical: beliefs ≥ OBSERVED always match truth; status never downgrades; relays cap at OBSERVED
ok 27 - T06 — replay divergence never corrupts shared facts: WorldTruth frozen, canonical background identical, runs deterministic
ok 28 - T07 — delayed consequences never silently disappear: every schedule fires or is logged as skipped; liveness report
ok 29 - T08 — phone scenario never violates access constraints: every phone.location transition has an authorised actor
ok 30 - T09 — NPC intention never contradicts its beliefs (scapegoat needs a reason; shield needs a reason; hand-up needs no shield)
ok 31 - T10 — no unauthorised scope expansion (counts, dependencies, no UI, no G8, no randomness)
ok 32 - SCENARIO S1_PASSIVE (captive) — Không làm gì (bỏ mọi optional, forced = lựa chọn thụ động nhất)
ok 33 - SCENARIO S2_COVER_WARN (captive) — Che Đức khi khám + cảnh báo Đức về Linh; để nguyên điện thoại
ok 34 - SCENARIO S3_VU_TRUST (captive) — Như S2 + mọi nguồn +trust Vũ khả dụng (volunteer) → Vũ có giữ im không?
ok 35 - SCENARIO S4_TAKE_SWEEP (captive) — Tự giữ điện thoại D4 chiều với SUSPICION ≥ 40 (deny khi thẩm vấn)
ok 36 - SCENARIO S4b_TAKE_CALL (captive) — Tự giữ điện thoại với SUSPICION thấp (blame_linh) → đọc nội dung, gọi ra ngoài
ok 37 - SCENARIO S5_TELL_LINH (captive) — Nói với Linh "em thấy Đức" D3 chiều (tell) — Linh có tên
ok 38 - SCENARIO S6_MOVE_YARD_DUC_CALLS (captive) — Chuyển điện thoại ra sân cùng Đức rồi KHÔNG đọc nó → Đức tự gọi (hệ quả phát sinh)
ok 39 - SCENARIO S7_MAI_NEVER_ACTS (captive) — Mai có drive SELF_RESCUE nhưng không có đường tri thức hợp lệ → không hành động (docs/04 hàng 6)
ok 40 - SCENARIO O1_PASSIVE (operator) — Operator thụ động (optional bỏ qua, forced = choice đầu)
ok 41 - SCENARIO O2_HIDE_ABSORB (operator) — Operator cắt Linh (discredit), Vũ tìm thấy, Operator bảo "giữ im" → vu_locker hấp thụ (audit CF-10)
ok 42 - SCENARIO O3_POINT_MAI_DEAL (operator) — Operator chỉ điểm Mai với Thạch (point_mai) NHƯNG đã hỏi Mai "chị mất gì" → Mai có tới đề nghị không?
ok 43 - SCENARIO O4_EXPOSURE (operator) — Operator: đối chất Mai → chép sổ → nhận thỏa thuận → gửi bằng chứng → PHƠI BÀY, được nhận là nguồn
ok 44 - GATE F (dynamic) — every ending is reached by at least one run per role; witness-path self-sufficiency report
ok 45 - CF-6 sensitivity — convergence priority decides the race: Vũ checking before Thạch raids changes who holds the phone
ok 46 - CF-7 sensitivity — Linh→Thạch delay 0 does not change the outcome with current windows, but changes when Thạch knows
ok 47 - CF-8 sensitivity — swapping 6a/6b (rules before propagation) kills the Day-4 interrogation (protects audit O1)
ok 48 - ZP — zero-player runs complete for both roles under both default policies and the NPC chain runs on its own
ok 49 - F-01 ceiling (static, audit T-C) — Captive cannot reach trust.vu ≥ 2 before segment 14 with current content
ok 50 - INTENTS: ids, prefixes, actor/drive/supersedes references
ok 51 - INTENTS: each superseded Phase 2 rule is superseded by exactly one action
ok 52 - GATE C (behaviour): every NpcAction decision reads only what the actor can know
ok 53 - GATE C (behaviour): PropagationRule conditions obey visibility for `from`, except declared exceptions with a reason
ok 54 - INTENTS: resolution (`effects`) may read only visible state or declared `touches`
ok 55 - INTENTS: `reads` documents exactly the flags/facts the decision uses (same contract as DelayedRule)
ok 56 - GATE C (knowledge): action belief grants and npcBelieves conditions stay inside the reachable-knowledge fixpoint
ok 57 - INTENTS: no two actions of different NPCs write the same flag at the same priority in overlapping windows (docs/04 R-E4)
ok 58 - INTENTS: new flags are read somewhere; flag visibility declarations are well-formed
ok 59 - GATE G (Phase 3 content): intent texts carry no operational detail; D9: no real places, organisations or cases are named anywhere
# tests 59
# pass 59
# fail 0
# skipped 0
```

Node: v22.23.3. Lệnh: `node --test tests/*.test.mjs`.
