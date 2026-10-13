// THE COMPOUND — scenario corpus. Shared by tests/evaluator.test.mjs, tests/engine.test.mjs and scripts/trace.mjs.
// Every scenario is a fully scripted, deterministic path. `expect` is what the engine must reproduce; `docsClaim`
// is what the design document (docs/04 §3.4) or the audit (docs/05 §10) claimed — they are reconciled in docs/08.
// MVP content (2026-10-13) fixed audit F-01/F-02/F-05/F-06/F-12/F-13/F-14/F-15/F-23 and added C2 (Mai acts), so
// several Phase 3 "known gaps" are now positive expectations.
import { scriptedPolicy, passivePolicy } from '../src/engine/evaluator.mjs';

/** Captive common prefix up to the Day-4 morning interrogation (audit S₀): friendly with Linh, covers Đức, keeps his secret. */
const C_PREFIX = {
  EV_S_D1M_INTAKE: 'c_sign', EV_C_D1A_LINH_APPROACH: 'open', EV_C_D1A_DUC_FOOD: 'share', EV_C_D1N_PATROL: 'watch',
  EV_S_QUOTA_SHIFT: 'comply', EV_C_D2A_DUC_CONFIDES: 'encourage', EV_C_D2N_LINH_PROBE: 'tell',
  EV_C_D3A_SEARCH: 'cover', EV_C_D3A_LINH_WHISPER: 'tell', EV_C_D3N_DUC_CONFESSION: 'keep_secret',
  EV_C_D4N_LINH_OFFER: 'refuse', EV_C_D4N_PATROL2: 'watch', EV_C_D6M_THACH_DEAL: 'stall', EV_C_D6A_DUC_ASK: 'no', EV_S_D6N_ESCAPE: 'stay',
};
const C_OPT = ['EV_C_D1A_DUC_FOOD', 'EV_C_D1N_PATROL', 'EV_C_D2A_DUC_CONFIDES', 'EV_C_D3N_DUC_CONFESSION'];
/** Operator common prefix: plain intake, asks Mai about the debt, files the inventory sheet. */
const O_PREFIX = { EV_S_D1M_INTAKE: 'o_plain', EV_O_D1A_MAI_PAPERWORK: 'ask', EV_S_QUOTA_SHIFT: 'comply', EV_O_D2M_INVENTORY_SHEET: 'file', EV_O_D4M_THACH_NAME: 'stall', EV_O_D6M_THACH_OFFER: 'refuse' };

export const SCENARIOS = [
  // ---------------------------------------------------------------- docs/04 §3.4 rows (Captive)
  {
    id: 'S1_PASSIVE', role: 'captive', title: 'Không làm gì (bỏ mọi optional, forced = lựa chọn thụ động nhất)',
    policy: scriptedPolicy({ EV_S_D1M_INTAKE: 'c_sign', EV_C_D1A_LINH_APPROACH: 'guarded', EV_S_QUOTA_SHIFT: 'comply', EV_C_D2N_LINH_PROBE: 'deflect', EV_C_D3A_SEARCH: 'aside', EV_C_D3A_LINH_WHISPER: 'silent', EV_C_D4M_INTERROGATION: 'deny', EV_C_D4N_LINH_OFFER: 'refuse', EV_C_D6M_THACH_DEAL: 'refuse', EV_C_D6A_DUC_ASK: 'no', EV_S_D7A_LOADING: 'c_alone' }, []),
    docsClaim: 'Linh tip seg 8 → thẩm vấn seg 9 → Đức kể Linh seg 10 → Linh báo chỗ seg 11 → Thạch lục trần seg 11; không quy ai vì Thạch chỉ biết CHỖ (P1). Mai không tự lục vì Thạch đã có nghi phạm (tin báo về người mới).',
    expect: { phoneAt: { 10: 'dorm_ceiling', 11: 'thach', 12: 'thach' }, fired: ['PR_LINH_TIP_CAPTIVE', 'R_INTERROGATION_D4', 'PR_DUC_CONFIDES_LINH', 'PR_LINH_RELAY_LOCATION', 'A_THACH_RAID_WHERE_I_BELIEVE'], notFired: ['A_VU_SHIELD_PHONE', 'A_VU_HAND_UP', 'A_MAI_SEARCH_DORM'], flags: { 'duc.scapegoated': false }, ending: 'E_TRANSFER' },
    baselineExpect: { flags: { 'duc.scapegoated': true } },
  },
  {
    id: 'S2_COVER_WARN', role: 'captive', title: 'Che Đức khi khám + cảnh báo Đức về Linh; để nguyên điện thoại',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D3N_DUC_CONFESSION: 'warn_linh', EV_C_D4M_INTERROGATION: 'blame_linh', EV_C_D4A_PHONE_DECISION: 'leave', EV_S_D5A_PHONE_FOUND_BY_VU: 'c_tell_duc' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION']),
    docsClaim: 'Đức không kể Linh → Thạch không biết chỗ → Vũ tìm thấy seg 12; không ai cho Vũ lý do giữ im → nộp seg 14',
    expect: { phoneAt: { 11: 'dorm_ceiling', 12: 'vu_locker', 14: 'thach' }, fired: ['PR_LINH_TIP_CAPTIVE', 'A_VU_ROUTINE_CEILING_CHECK', 'A_VU_HAND_UP'], notFired: ['PR_DUC_CONFIDES_LINH', 'A_THACH_RAID_WHERE_I_BELIEVE', 'A_VU_SHIELD_PHONE', 'A_MAI_SEARCH_DORM'], status: { duc: 'present' } },
  },
  {
    id: 'S3_VU_TRUST', role: 'captive', title: 'Lạnh với Linh (tin báo), xung phong bị khám, cảnh báo Đức, giữ kín khi Vũ cho xem → Vũ che máy (F-01 đã sửa)',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D1A_LINH_APPROACH: 'ask_name', EV_C_D2N_LINH_PROBE: 'deflect', EV_C_D3A_SEARCH: 'volunteer', EV_C_D3A_LINH_WHISPER: 'suspect', EV_C_D3N_DUC_CONFESSION: 'warn_linh', EV_C_D4M_INTERROGATION: 'deny', EV_C_D4A_PHONE_DECISION: 'leave', EV_S_D5A_PHONE_FOUND_BY_VU: 'c_hide', EV_C_D5N_VU_TALK: 'listen' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION', 'EV_C_D5N_VU_TALK']),
    docsClaim: 'docs/04 hàng 3: trust Vũ lên 2 → PROTECT_DUC thắng STAY_ABOVE → Vũ không nộp seg 14. Phase 3 không đạt được (F-01); MVP: c_sign +1, volunteer +1, c_hide +1 (khi Vũ đã cho xem) → trust 2 tại seg 13.',
    expect: { trustAt: { 12: { vu: 1 }, 13: { vu: 2 } }, phoneAt: { 12: 'vu_locker', 14: 'vu_locker', 20: 'vu_locker' }, fired: ['A_VU_ROUTINE_CEILING_CHECK', 'A_VU_SHIELD_PHONE'], notFired: ['A_VU_HAND_UP', 'A_MAI_SEARCH_DORM'], events: ['EV_C_D5N_VU_TALK'], tags: ['T_W_VU_SHOWED_PHONE'] },
  },
  {
    id: 'S4_TAKE_SWEEP', role: 'captive', title: 'Tự giữ điện thoại D4 chiều với SUSPICION ≥ 40 (deny khi thẩm vấn)',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D4M_INTERROGATION: 'deny', EV_C_D4A_PHONE_DECISION: 'take' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION']),
    docsClaim: 'R_SUSPICION_SWEEP lấy mất seg 10; +20 SUSPICION; Thạch CONFIRMED có điện thoại nhưng không biết ai giấu → không quy ai',
    expect: { phoneAt: { 10: 'thach' }, fired: ['R_SUSPICION_SWEEP'], notFired: ['PR_DUC_CONFIDES_LINH', 'A_VU_SHIELD_PHONE', 'A_MAI_SEARCH_DORM'], flags: { 'duc.scapegoated': false }, npcBelief: { thach: { F_PHONE_EXISTS: 'CONFIRMED' } } },
  },
  {
    id: 'S4b_TAKE_CALL', role: 'captive', title: 'Tự giữ điện thoại với SUSPICION thấp (blame_linh) → đọc nội dung, gọi ra ngoài → PHƠI BÀY',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D4M_INTERROGATION: 'blame_linh', EV_C_D4A_PHONE_DECISION: 'take', EV_C_D5A_PHONE_CONTENTS: 'call_out', EV_S_D7M_RAID: 'c_help' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION', 'EV_C_D5A_PHONE_CONTENTS']),
    docsClaim: 'CF-2: không rule nào chạm điện thoại trước khi gọi; PHƠI BÀY',
    expect: { phoneAt: { 10: 'player', 12: 'player', 14: 'player' }, notFired: ['A_THACH_RAID_WHERE_I_BELIEVE', 'A_VU_SHIELD_PHONE', 'A_MAI_SEARCH_DORM'], flags: { 'evidence.outside': true }, ending: 'E_EXPOSURE' },
  },
  {
    id: 'S5_TELL_LINH', role: 'captive', title: 'Che Đức + nói với Linh "em thấy Đức" (tell) → Thạch có lý do quy Đức',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D3A_LINH_WHISPER: 'tell', EV_C_D4M_INTERROGATION: 'blame_linh', EV_C_D4A_PHONE_DECISION: 'leave' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION']),
    docsClaim: 'docs/04 hàng 5 giả định một luật "Linh báo TÊN Đức" (không tồn tại). Thực tế: chuỗi chỗ giấu Đức→Linh→Thạch, raid seg 11; Đức bị quy vì Thạch biết người mới che giường Đức (PR_LINH_RELAY_CAPTIVE_TAGS), không phải vì Linh báo tên.',
    expect: { phoneAt: { 9: 'dorm_ceiling', 10: 'dorm_ceiling', 11: 'thach' }, fired: ['PR_DUC_CONFIDES_LINH', 'PR_LINH_RELAY_LOCATION', 'A_THACH_RAID_WHERE_I_BELIEVE', 'PR_THACH_TELLS_VU_SCAPEGOAT'], flags: { 'duc.scapegoated': true }, status: { duc: 'isolated' }, events: ['EV_S_D5A_DUC_TAKEN'] },
  },
  {
    id: 'S6_MOVE_YARD_DUC_CALLS', role: 'captive', title: 'Chuyển điện thoại ra sân cùng Đức rồi KHÔNG đọc nó → Đức tự gọi (hệ quả phát sinh)',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D4M_INTERROGATION: 'blame_linh', EV_C_D4A_PHONE_DECISION: 'move_yard' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION']),
    docsClaim: 'A_DUC_TRY_CALL seg 13 → duc.calledHome; A_VU_SEES_DUC_CALL seg 14 → Vũ OBSERVED Đức muốn gọi mẹ (không +trust vì người chơi không đưa)',
    expect: { phoneAt: { 10: 'yard_cache', 13: 'yard_cache' }, fired: ['A_DUC_TRY_CALL', 'A_VU_SEES_DUC_CALL'], flags: { 'duc.calledHome': true }, trustAt: { 15: { vu: 0 } }, npcBelief: { vu: { F_DUC_WANTS_TO_CALL_MOTHER: 'OBSERVED' } } },
    baselineExpect: { flags: { 'duc.calledHome': false } },
  },
  {
    id: 'S7_MAI_RECOVERS', role: 'captive', title: 'Thân với Linh, KHÔNG che Đức (không có tin báo) → Mai tự lục ký túc D4 chiều và lấy lại máy trước khi Linh kịp báo chỗ (docs/04 hàng 6, C2)',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D3A_SEARCH: 'aside', EV_C_D4A_PHONE_DECISION: 'leave' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION', 'EV_C_D4N_PATROL2']),
    docsClaim: 'Mai suy ra "ở ký túc" từ cuộc khám xét (BG_D3A_SEARCH) → tự lục 14:00 D4 (seg 10) → lấy lại trước Linh báo (seg 11). Chỉ khi Thạch chưa có nghi phạm: không có tin báo về người mới.',
    expect: { phoneAt: { 9: 'dorm_ceiling', 10: 'mai', 11: 'mai', 20: 'mai' }, fired: ['A_MAI_SEARCH_DORM', 'PR_DUC_CONFIDES_LINH', 'PR_LINH_RELAY_LOCATION', 'A_THACH_RAID_WHERE_I_BELIEVE'], notFired: ['PR_LINH_TIP_CAPTIVE', 'A_VU_SHIELD_PHONE', 'A_VU_HAND_UP'], flags: { 'duc.scapegoated': false }, status: { duc: 'present', mai: 'present' }, tags: ['T_W_PHONE_VANISHED'], npcBelief: { mai: { F_PHONE_HIDDEN_DORM_CEILING: 'CONFIRMED' } } },
    baselineExpect: { phoneAt: { 11: 'thach' } },
  },
  {
    id: 'S8_HAND_OVER_LINH', role: 'captive', title: 'Tự giữ máy rồi đưa Linh "giữ hộ" đêm D4 → sáng D5 máy lên bàn Thạch kèm tên người mới (F-05a/F-06 đã sửa)',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D4M_INTERROGATION: 'blame_linh', EV_C_D4A_PHONE_DECISION: 'take', EV_C_D4N_LINH_OFFER: 'hand_over' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION']),
    docsClaim: 'Audit CF-11: sau khi sửa F-05a, hand_over phải khả dụng và `linh` phải có reader (Linh nộp lên Thạch, +SUSPICION).',
    expect: { phoneAt: { 10: 'player', 11: 'linh', 12: 'thach' }, fired: ['A_LINH_HANDS_PHONE_UP'], notFired: ['R_SUSPICION_SWEEP', 'A_MAI_SEARCH_DORM'], tags: ['T_C_GAVE_LINH_PHONE', 'T_W_CALLED_ABOUT_PHONE'], npcBelief: { thach: { F_PHONE_EXISTS: 'CONFIRMED', F_PHONE_TAKEN_BY_CAPTIVE_PC: 'RUMOR' } } },
  },
  {
    id: 'S9_ESCAPE_WITH_DUC', role: 'captive', title: 'Đường trốn cùng Đức: ký lặng lẽ, xung phong, Vũ cho xem máy, giữ kín, xin Vũ "nhìn đi chỗ khác" (trust 2) → THOÁT cùng Đức (F-01 cascade đã sửa)',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D1A_LINH_APPROACH: 'ask_name', EV_S_QUOTA_SHIFT: 'slack', EV_C_D2N_LINH_PROBE: 'deflect', EV_C_D3A_SEARCH: 'volunteer', EV_C_D3A_LINH_WHISPER: 'suspect', EV_C_D3N_DUC_CONFESSION: 'warn_linh', EV_C_D4M_INTERROGATION: 'blame_linh', EV_C_D4A_PHONE_DECISION: 'leave', EV_S_D5A_PHONE_FOUND_BY_VU: 'c_hide', EV_C_D5N_VU_TALK: 'ask_look_away', EV_C_D6A_DUC_ASK: 'yes', EV_S_D6N_ESCAPE: 'go' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION', 'EV_C_D4N_PATROL2', 'EV_C_D5N_VU_TALK', 'EV_S_D6N_ESCAPE']),
    docsClaim: 'GDD §6.3: Captive có thể trốn cùng Đức. Audit F-01 chứng minh không thể (trần trust.vu = 1). MVP: trần = 3, đường này cần 5 bước có chủ đích.',
    expect: { flags: { 'escape.vuWillOpen': true, 'escape.withDuc': true, 'player.escaped': true }, fired: ['A_VU_SHIELD_PHONE'], ending: 'E_ESCAPE', tags: ['T_C_WILL_TAKE_DUC', 'T_ESCAPE_SUCCEEDED'] },
  },
  {
    id: 'S10_TURN_LINH', role: 'captive', title: 'Nghe Vũ kể (ngày thả là dối) rồi quay Linh thành kênh phản gián → Linh rút tin báo, SUSPICION giảm trước cửa sổ trốn (F-15 đã sửa)',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D1A_LINH_APPROACH: 'open', EV_C_D3A_SEARCH: 'volunteer', EV_C_D3N_DUC_CONFESSION: 'warn_linh', EV_C_D4M_INTERROGATION: 'deny', EV_C_D4A_PHONE_DECISION: 'leave', EV_C_D4N_LINH_OFFER: 'confront', EV_S_D5A_PHONE_FOUND_BY_VU: 'c_hide', EV_C_D5N_VU_TALK: 'listen', EV_C_D6A_LINH_TRUTH: 'turn' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION', 'EV_C_D5N_VU_TALK', 'EV_C_D6A_LINH_TRUTH']),
    docsClaim: 'Phase 3: PR_LINH_DOUBLE_AGENT_FEED chết (F-01 cascade). MVP: bắn tại seg 16, rút thach.hasCaptiveTip, −15 SUSPICION.',
    expect: { fired: ['PR_LINH_DOUBLE_AGENT_FEED'], flags: { 'linh.doubleAgent': true, 'linh.reportsToThach': false, 'thach.hasCaptiveTip': false }, tags: ['T_C_TURNED_LINH'], npcBelief: { thach: { F_PHONE_TAKEN_BY_CAPTIVE_PC: 'RUMOR' } } },
  },
  {
    id: 'S11_EXPOSE_LINH', role: 'captive', title: 'Vạch mặt Linh trước cả ký túc D6 chiều → Thạch rút cô ấy đi (R_LINH_PULLED_OUT)',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D4M_INTERROGATION: 'deny', EV_C_D4A_PHONE_DECISION: 'leave', EV_C_D4N_LINH_OFFER: 'confront', EV_C_D6A_LINH_TRUTH: 'expose' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION', 'EV_C_D6A_LINH_TRUTH']),
    expect: { fired: ['R_LINH_PULLED_OUT'], status: { linh: 'isolated' }, flags: { 'linh.reportsToThach': false }, tags: ['T_C_EXPOSED_LINH'] },
  },
  // ---------------------------------------------------------------- Operator
  {
    id: 'O1_PASSIVE', role: 'operator', title: 'Operator thụ động (optional bỏ qua, forced = defaultChoice)',
    policy: passivePolicy('default'),
    docsClaim: 'pass_up (mặc định) → Thạch có nghi phạm → Mai không tự lục; chuỗi Đức→Linh→Thạch, raid seg 11, không quy ai.',
    expect: { phoneAt: { 11: 'thach' }, fired: ['PR_DUC_CONFIDES_LINH', 'PR_LINH_RELAY_LOCATION', 'A_THACH_RAID_WHERE_I_BELIEVE'], notFired: ['A_MAI_SEARCH_DORM'], flags: { 'duc.scapegoated': false }, ending: 'E_TRANSFER' },
    baselineExpect: { flags: { 'duc.scapegoated': true } },
  },
  {
    id: 'O2_HIDE_ABSORB', role: 'operator', title: 'Operator hỏi Mai (chặn cô tự lục), cắt Linh (discredit), Vũ tìm thấy, Operator bảo "giữ im" → vu_locker hấp thụ (audit CF-10)',
    policy: scriptedPolicy({ ...O_PREFIX, EV_O_D1N_VU_DRINK: 'join', EV_O_D3M_THACH_ORDER: 'accept', EV_O_D3M_MAI_PANIC: 'confront', EV_O_D3A_SEARCH: 'watch_linh', EV_O_D3N_LINH_TIP: 'verify', EV_O_D4M_VERIFY_TIP: 'discredit', EV_S_D5A_PHONE_FOUND_BY_VU: 'o_hide', EV_O_D5A_MAI_DEAL: 'refuse' }, ['EV_O_D1N_VU_DRINK', 'EV_O_D3M_MAI_PANIC']),
    expect: { phoneAt: { 12: 'vu_locker', 14: 'vu_locker', 17: 'vu_locker' }, fired: ['A_VU_ROUTINE_CEILING_CHECK', 'A_VU_SHIELD_PHONE', 'PR_DUC_CONFIDES_LINH', 'A_MAI_APPROACH_OPERATOR'], notFired: ['A_VU_HAND_UP', 'PR_LINH_RELAY_LOCATION', 'A_THACH_RAID_WHERE_I_BELIEVE', 'A_MAI_SEARCH_DORM'] },
    docsClaim: 'Đức vẫn kể Linh (Operator không thể cảnh báo em), nhưng kênh Linh→Thạch đã bị cắt nên Thạch không bao giờ biết chỗ. Mai không tự lục vì đã bị hỏi "chị mất gì" → cô tìm đến Operator (A_MAI_APPROACH_OPERATOR).',
    knownGap: 'vu_locker sau o_hide là trạng thái hấp thụ có chủ ý: Operator đã chọn chôn bằng chứng.',
  },
  {
    id: 'O2b_SUPPRESS_MAI_RECOVERS', role: 'operator', title: 'Operator xé giấy báo (không có nghi phạm) và không hỏi Mai → Mai tự lục D4 chiều, lấy lại máy; Vũ không tìm thấy gì',
    policy: scriptedPolicy({ ...O_PREFIX, EV_O_D3M_THACH_ORDER: 'accept', EV_O_D3A_SEARCH: 'watch_linh', EV_O_D3N_LINH_TIP: 'suppress' }, []),
    expect: { phoneAt: { 10: 'mai', 12: 'mai' }, fired: ['A_MAI_SEARCH_DORM', 'PR_DUC_CONFIDES_LINH', 'PR_LINH_RELAY_LOCATION', 'A_THACH_RAID_WHERE_I_BELIEVE'], notFired: ['A_VU_HAND_UP', 'A_MAI_APPROACH_OPERATOR'], flags: { 'duc.scapegoated': false }, status: { mai: 'present' } },
  },
  {
    id: 'O3_POINT_MAI_DEAL', role: 'operator', title: 'Operator chỉ điểm Mai với Thạch (point_mai) NHƯNG đã hỏi Mai "chị mất gì" → Mai vẫn tới đề nghị',
    policy: scriptedPolicy({ ...O_PREFIX, EV_O_D2A_MAI_ROUTINE: 'follow', EV_O_D3M_THACH_ORDER: 'point_mai', EV_O_D3M_MAI_PANIC: 'confront', EV_O_D3N_LINH_TIP: 'suppress', EV_O_D5A_MAI_DEAL: 'agree' }, ['EV_O_D2A_MAI_ROUTINE', 'EV_O_D3M_MAI_PANIC']),
    docsClaim: 'Phase 2: R_MAI_DEAL bị chặn bởi T_O_POINTED_AT_MAI. Phase 3+: Mai không biết mình bị chỉ điểm → vẫn tới.',
    expect: { fired: ['A_MAI_APPROACH_OPERATOR'], events: ['EV_O_D5A_MAI_DEAL'], flags: { 'mai.dealActive': true } },
    baselineExpect: { notFired: ['R_MAI_DEAL'], notEvents: ['EV_O_D5A_MAI_DEAL'] },
  },
  {
    id: 'O4_EXPOSURE', role: 'operator', title: 'Operator: đối chất Mai → chép sổ → nhận thỏa thuận → gửi bằng chứng → PHƠI BÀY, được nhận là nguồn',
    policy: scriptedPolicy({ ...O_PREFIX, EV_O_D3M_THACH_ORDER: 'accept', EV_O_D3M_MAI_PANIC: 'confront', EV_O_D3A_SEARCH: 'watch_linh', EV_O_D3N_LINH_TIP: 'suppress', EV_O_D4A_LEDGER: 'copy', EV_O_D5A_MAI_DEAL: 'agree', EV_O_D6A_EVIDENCE_ROUTE: 'send', EV_S_D7M_RAID: 'o_surrender' }, ['EV_O_D3M_MAI_PANIC', 'EV_O_D4A_LEDGER', 'EV_O_D6A_EVIDENCE_ROUTE']),
    expect: { ending: 'E_EXPOSURE', fired: ['A_MAI_APPROACH_OPERATOR', 'R_EXPOSURE_RAID'], notFired: ['R_TRANSFER_PREP'], tags: ['T_W_RECOGNIZED_AS_SOURCE'], notTags: ['T_W_DETAINED_AS_PERPETRATOR'] },
  },
  {
    id: 'O5_NAME_MAI', role: 'operator', title: 'Operator theo Mai lúc 14:00, đưa tên Mai cho Thạch sáng D4 → Mai bị cách ly (R_MAI_EXPOSED); Thạch CONFIRMED chủ máy',
    policy: scriptedPolicy({ ...O_PREFIX, EV_O_D2A_MAI_ROUTINE: 'follow', EV_O_D3M_THACH_ORDER: 'accept', EV_O_D3N_LINH_TIP: 'pass_up', EV_O_D4M_THACH_NAME: 'name_mai' }, ['EV_O_D2A_MAI_ROUTINE']),
    expect: { fired: ['R_MAI_EXPOSED'], status: { mai: 'isolated' }, flags: { 'mai.exposed': true }, notFired: ['A_MAI_SEARCH_DORM', 'A_MAI_APPROACH_OPERATOR'], npcBelief: { thach: { F_PHONE_OWNER_MAI: 'CONFIRMED', F_MAI_LEAKING: 'CONFIRMED' } } },
  },
  {
    id: 'O6_NAME_DUC_VERIFIED', role: 'operator', title: 'F-05b đã sửa: kiểm tra sổ ra vào (scheduled, order 0) chạy TRƯỚC khi Thạch đòi tên (forced, order 10) → có thể đưa tên Đức ngay sáng D4. Review L-01/L-06: tên chỉ là tin đồn Thạch cầm; vì Operator không hỏi Mai, Mai lấy lại máy D4 chiều trước khi Thạch lục trần → không có bằng chứng, Đức không bị gọi lên',
    policy: scriptedPolicy({ ...O_PREFIX, EV_O_D3M_THACH_ORDER: 'accept', EV_O_D3N_LINH_TIP: 'verify', EV_O_D4M_VERIFY_TIP: 'keep', EV_O_D4M_THACH_NAME: 'name_duc', EV_S_D5A_DUC_TAKEN: 'o_object' }, []),
    expect: { tags: ['T_O_NAMED_DUC'], flags: { 'duc.scapegoated': false }, status: { duc: 'present', mai: 'present' }, phoneAt: { 10: 'mai', 20: 'mai' }, fired: ['PR_DUC_CONFIDES_LINH', 'A_MAI_SEARCH_DORM', 'A_THACH_RAID_WHERE_I_BELIEVE'], notFired: ['PR_THACH_TELLS_VU_SCAPEGOAT'], notEvents: ['EV_S_D5A_DUC_TAKEN'], npcBelief: { thach: { F_PHONE_TAKEN_BY_DUC: 'RUMOR' } } },
  },
  {
    id: 'O7_NAME_DUC_TAKEN', role: 'operator', title: 'Review L-01 đã sửa: đưa tên Đức sáng D4 VÀ đã hỏi Mai "chị mất gì" (Mai không dám tự lục) → Linh báo chỗ, Thạch lục trần có lý do → Đức bị gọi lên D5 chiều; Operator ngầm sắp xếp "hạ xuống"',
    policy: scriptedPolicy({ ...O_PREFIX, EV_O_D3M_THACH_ORDER: 'accept', EV_O_D3M_MAI_PANIC: 'confront', EV_O_D3N_LINH_TIP: 'verify', EV_O_D4M_VERIFY_TIP: 'keep', EV_O_D4M_THACH_NAME: 'name_duc', EV_S_D5A_DUC_TAKEN: 'o_soften' }, ['EV_O_D3M_MAI_PANIC']),
    expect: { tags: ['T_O_NAMED_DUC', 'T_W_SAW_DUC_TAKEN', 'T_O_SOFTENED_DUC'], flags: { 'duc.scapegoated': true }, status: { duc: 'demoted' }, phoneAt: { 11: 'thach' }, fired: ['PR_DUC_CONFIDES_LINH', 'PR_LINH_RELAY_LOCATION', 'A_THACH_RAID_WHERE_I_BELIEVE', 'PR_THACH_TELLS_VU_SCAPEGOAT'], notFired: ['A_MAI_SEARCH_DORM'], events: ['EV_S_D5A_DUC_TAKEN'], npcBelief: { thach: { F_DUC_IS_THE_LEAK: 'RUMOR' }, vu: { F_DUC_IS_THE_LEAK: 'RUMOR' } } },
  },
  {
    id: 'O8_OPERATOR_OPTIONALS', role: 'operator', title: 'Operator đi hết các optional ít gặp: nghe lén D2 đêm, hỏi Đức D4 chiều (tha), Vũ tâm sự D4 đêm (giữ kín), lấy máy từ Vũ, đưa Thạch, dùng Linh',
    policy: scriptedPolicy({ ...O_PREFIX, EV_O_D1N_VU_DRINK: 'join', EV_O_D2N_OVERHEAR: 'linger', EV_O_D3M_THACH_ORDER: 'accept', EV_O_D3M_MAI_PANIC: 'confront', EV_O_D3N_LINH_TIP: 'verify', EV_O_D4M_VERIFY_TIP: 'discredit', EV_O_D4A_DUC_QUESTIONED: 'spare', EV_O_D4N_VU_CONFIDES: 'keep', EV_S_D5A_PHONE_FOUND_BY_VU: 'o_take', EV_O_D5A_MAI_DEAL: 'refuse', EV_O_D5A_PHONE_CONTENTS: 'to_thach', EV_O_D5N_LINH_CONTACT: 'use' }, ['EV_O_D1N_VU_DRINK', 'EV_O_D2N_OVERHEAR', 'EV_O_D3M_MAI_PANIC', 'EV_O_D4A_DUC_QUESTIONED', 'EV_O_D4N_VU_CONFIDES', 'EV_O_D5A_PHONE_CONTENTS', 'EV_O_D5N_LINH_CONTACT']),
    expect: { events: ['EV_O_D2N_OVERHEAR', 'EV_O_D4A_DUC_QUESTIONED', 'EV_O_D4N_VU_CONFIDES', 'EV_S_D5A_PHONE_FOUND_BY_VU', 'EV_O_D5A_PHONE_CONTENTS', 'EV_O_D5N_LINH_CONTACT'], tags: ['T_O_SPARED_DUC', 'T_O_KEPT_VU_SECRET', 'T_O_TOOK_PHONE_FROM_VU', 'T_O_USED_LINH'], trustAt: { 14: { vu: 3 } }, phoneAt: { 12: 'vu_locker', 13: 'thach', 20: 'thach' }, status: { duc: 'present' }, ending: 'E_TRANSFER' },
  },
  // ---------------------------------------------------------------- Review 2026-10-13 (logic) additions
  {
    id: 'S12_BLAME_DUC', role: 'captive', title: 'F-22/L-06 đã sửa: "Thử hỏi Đức xem" chỉ cho Thạch một tin đồn; Đức bị quy đúng khi (và chỉ khi) Thạch lục trần thấy máy → gọi lên D5 chiều; người chơi lên tiếng',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D4M_INTERROGATION: 'blame_duc', EV_C_D4A_PHONE_DECISION: 'leave', EV_S_D5A_DUC_TAKEN: 'c_speak' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION']),
    expect: { tags: ['T_C_BLAMED_DUC', 'T_W_SAW_DUC_TAKEN', 'T_C_SPOKE_FOR_DUC'], flags: { 'duc.scapegoated': true }, status: { duc: 'isolated' }, phoneAt: { 11: 'thach' }, fired: ['A_THACH_RAID_WHERE_I_BELIEVE', 'PR_THACH_TELLS_VU_SCAPEGOAT'], events: ['EV_S_D5A_DUC_TAKEN'] },
  },
  {
    id: 'S12b_BLAME_DUC_NO_EVIDENCE', role: 'captive', title: 'F-22/L-06: đổ cho Đức nhưng đã cảnh báo em về Linh → Thạch không bao giờ biết chỗ, Vũ tìm thấy rồi nộp; Đức vẫn present, KHÔNG bị quy (tên không bằng chứng = không hành động)',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D3N_DUC_CONFESSION: 'warn_linh', EV_C_D4M_INTERROGATION: 'blame_duc', EV_C_D4A_PHONE_DECISION: 'leave' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION']),
    expect: { tags: ['T_C_BLAMED_DUC'], flags: { 'duc.scapegoated': false }, status: { duc: 'present' }, phoneAt: { 12: 'vu_locker', 14: 'thach' }, fired: ['A_VU_HAND_UP'], notFired: ['A_THACH_RAID_WHERE_I_BELIEVE', 'PR_THACH_TELLS_VU_SCAPEGOAT'], notEvents: ['EV_S_D5A_DUC_TAKEN'], npcBelief: { thach: { F_PHONE_TAKEN_BY_DUC: 'RUMOR' } } },
  },
  {
    id: 'S13_LAST_CHANCE_CALL', role: 'captive', title: 'Giữ máy tới D6 chiều rồi mới gọi ra ngoài ("cơ hội cuối") → PHƠI BÀY sáng D7',
    policy: scriptedPolicy({ ...C_PREFIX, EV_C_D4M_INTERROGATION: 'blame_linh', EV_C_D4A_PHONE_DECISION: 'take', EV_C_D5A_PHONE_CONTENTS: 'keep', EV_C_D6A_PHONE_LAST_CHANCE: 'call', EV_S_D7M_RAID: 'c_hide' }, [...C_OPT, 'EV_C_D4A_PHONE_DECISION', 'EV_C_D5A_PHONE_CONTENTS', 'EV_C_D6A_PHONE_LAST_CHANCE']),
    expect: { events: ['EV_C_D6A_PHONE_LAST_CHANCE'], flags: { 'evidence.outside': true }, phoneAt: { 16: 'player' }, fired: ['R_EXPOSURE_RAID'], ending: 'E_EXPOSURE' },
  },
];

/** Witness paths from endings.json, run as scripts (fallback = each event's declared defaultChoice). */
export function witnessPolicies(content) {
  const out = [];
  for (const en of content.endings) for (const p of en.witnessPaths) {
    const script = {}, optionals = [];
    for (const s of p.steps) { script[s.eventId] = s.choiceId; const e = content.events.find((x) => x.id === s.eventId); if (e.trigger === 'optional') optionals.push(s.eventId); }
    out.push({ id: `WP_${en.id}_${p.role}`, ending: en.id, role: p.role, policy: scriptedPolicy(script, optionals, 'default') });
  }
  return out;
}
