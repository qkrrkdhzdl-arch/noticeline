/* NoticeLine i18n
   Korean notices are the input either way. This file only decides the language
   of the interface around them: the notice names, dates and amounts stay exactly
   as published. */
var NLI18N = (function () {
  var KEY = "noticeline.lang";

  function detect() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === "ko" || saved === "en") return saved;
    } catch (e) {}
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || "ko"];
    for (var i = 0; i < list.length; i++) { if (/^ko/i.test(list[i])) return "ko"; }
    return "en";
  }

  var lang = detect();

  var S = {
    ko: {
      title: "NoticeLine — 공고문 한 장을 오늘의 할 일로",
      description: "한국어 지원사업 공고문을 붙여넣으면 자격 대조, 제출서류 목록, D-day 계획과 근거 문장을 한 화면에 정리합니다. 판정은 브라우저 안에서 끝납니다.",
      nav_how: "작동 방식",
      nav_trust: "근거와 한계",
      nav_notices: "비슷한 공고",
      kicker: "1인 사업자·예비창업자를 위한 지원사업 공고 판독기",
      hero_html: "마감은 아는데, <em>내가 낼 수 있는지</em>를 모릅니다.",
      lede_html: "지원사업 공고문은 평균 3~5쪽이고, 자격·서류·일정이 서로 다른 문단에 흩어져 있습니다. NoticeLine은 공고문을 붙여넣는 순간 <strong>자격 조건, 제출서류, D-day 계획, 근거 문장</strong>을 한 화면에 정리합니다. 판정은 브라우저 안의 규칙 엔진이 하고, 문장 요약만 선택적으로 AI가 맡습니다.",
      stat_min: "3분",
      stat_min_sub: "공고 한 건 판독",
      stat_fields: "6종",
      stat_fields_sub: "추출 항목",
      stat_local: "100%",
      stat_local_sub: "브라우저 내 처리",
      input_title: "공고문 붙여넣기",
      input_hint: "텍스트 전체 또는 핵심 문단",
      input_placeholder: "예) 2026년 ○○ 창업 아이디어 공모전\n- 접수기간: 2026. 11. 13. ~ 12. 10. 18:00\n- 참가대상: 농촌에 기반을 두고 사업을 운영하는 예비창업자 또는 업력 7년 이내 창업자\n- 제출서류: 참가신청서, 사업계획서, 개인정보 수집 및 이용동의서, 참가서약서",
      run: "공고 분석하기",
      privacy: "붙여넣은 내용은 서버로 전송되지 않습니다. 아래 AI 기능을 직접 켜지 않는 한 모든 계산은 이 브라우저 안에서 끝납니다.",
      empty_title: "아직 분석한 공고가 없습니다",
      empty_body: "왼쪽에 공고문을 붙여넣거나, 예시 공고를 눌러 시작해 보세요.",
      how_title: "어떻게 판정하나요",
      how1_html: "<b>문장 단위로 쪼갭니다.</b> 공고문을 문장·줄 단위로 나누고, 라벨(접수기간·참가대상·제출서류·주최)을 먼저 찾습니다.",
      how2_html: "<b>규칙 엔진이 조건을 뽑습니다.</b> 예비창업자 여부, 업력, 지역, 학생 신분, 팀 인원, 사업자등록 요구를 정규식과 사전으로 판정하고 <u>근거 문장을 함께 보관</u>합니다.",
      how3_html: "<b>내 조건과 대조합니다.</b> 사용자가 고른 신분·지역·사업자 상태를 조건과 맞춰 “충족 / 확인 필요 / 신청 불가”를 나눕니다.",
      how4_html: "<b>찾지 못하면 비워 둡니다.</b> 금액·마감처럼 확인되지 않은 값은 추정하지 않고 <span class=\"tag warn\">확인 필요</span>로 남깁니다.",
      trust_title: "근거와 한계",
      trust1_html: "모든 판정 카드에는 <b>원문 문장</b>이 함께 붙습니다. 문장을 못 찾으면 판정하지 않습니다.",
      trust2_html: "공고문에 없는 자격을 추론하지 않습니다. “아마 될 것”은 결론이 아니라 확인 항목으로 내보냅니다.",
      trust3_html: "마감일·금액은 원문 표기를 그대로 보여주고, 자동 계산값은 <b>추정</b>으로 표시합니다.",
      trust4_html: "대신 신청하지 않습니다. 서류 초안과 캘린더 파일까지만 만들고 제출은 사람이 합니다.",
      llm_title: "선택 기능 · AI 요약",
      llm_body_html: "기본값은 <b>꺼짐</b>입니다. 직접 키를 넣으면 공고문 요약과 자격 문장 해설에만 쓰이고, 키와 문서는 저장하지 않습니다.",
      llm_placeholder: "sk-... (OpenAI 호환 키, 선택)",
      llm_test: "연결 확인",
      llm_off: "꺼짐 · 규칙 엔진만 사용",
      llm_checking: "확인 중…",
      llm_on: "켜짐 · 요약에만 사용, 저장하지 않음",
      llm_fail: "연결 실패({status}) · 규칙 엔진 모드로 계속",
      llm_fail_plain: "연결 실패 · 규칙 엔진 모드로 계속",
      corpus_hint: "TF-IDF 코사인 유사도 · 브라우저 내 계산",
      footer_entry: "NoticeLine · 2026 SLAY HACKS 제출작",
      footer_author: "만든 사람 박가온 · 부산대학교 정치외교학과 · 개인사업자 운영 경험",
      lang_group: "언어",
      lang_ko: "한국어로 보기",
      lang_en: "영어로 보기",

      badge_no_deadline: "마감 미확인",
      badge_soon: "마감",
      missing_label: "원문에서 찾지 못한 항목:",
      missing_deadline: "마감일",
      missing_amount: "지원 규모",
      missing_docs: "제출서류",
      missing_target: "참가대상",
      name_unknown: "이름 미확인",
      org_unknown: "주최·주관 미확인",
      card1: "자격 대조",
      card2: "한눈에",
      card3: "제출서류",
      card4: "D-day 계획",
      card5: "비슷한 공고",
      my_conditions: "내 조건",
      state_ok: "충족",
      state_warn: "확인 필요",
      state_no: "불가",
      deadline_row: "접수 마감",
      check_needed: "확인 필요",
      days_left: "{n}일 남음",
      days_passed: "지남",
      amount_row: "지원 규모",
      how_row: "접수 방법",
      eval_row: "심사 기준",
      docs_empty: "제출서류 문단을 찾지 못했습니다. 공고문의 ‘제출서류’ 항목을 그대로 붙여넣으면 자동으로 나뉩니다.",
      plan_empty: "마감일을 찾으면 D-14부터 역산한 계획을 만듭니다.",
      ics: "캘린더 파일(.ics) 내려받기",
      copy_plan: "할 일 복사",
      copied: "복사됨",
      similar_deadline: "마감 {date}",
      footnote: "이 화면은 참고용 요약입니다. 접수 전 반드시 원문 공고문의 자격·서류·마감 시각을 확인하세요. NoticeLine은 대신 신청하지 않습니다.",

      profile_status: "신분",
      profile_business: "사업자",
      profile_region: "지역",
      status_leave: "대학생 휴학",
      status_active: "대학생 재학",
      status_graduate: "졸업·일반인",
      status_other: "기타",
      biz_none: "없음(예비창업)",
      biz_open: "운영 중",
      region_other: "기타"
    },

    en: {
      title: "NoticeLine — one Korean grant notice, turned into today's tasks",
      description: "Paste a Korean grant notice and get an eligibility check, a document checklist, a D-day plan and the sentence behind every answer, on one screen. The verdict runs in your browser.",
      nav_how: "How it works",
      nav_trust: "Evidence and limits",
      nav_notices: "Similar notices",
      kicker: "A notice reader for one-person businesses and pre-founders",
      hero_html: "The deadline is clear. <em>Whether you can apply</em> is the part nobody tells you.",
      lede_html: "A Korean grant notice runs three to five pages, with the eligibility rules, the documents and the dates in three different paragraphs. Paste the notice and NoticeLine puts <strong>the conditions, the document checklist, a D-day plan and the sentence each answer came from</strong> on one screen. A rule engine in the browser makes the calls; an optional AI reads the prose.",
      stat_min: "3 min",
      stat_min_sub: "per notice",
      stat_fields: "6",
      stat_fields_sub: "fields extracted",
      stat_local: "100%",
      stat_local_sub: "in the browser",
      input_title: "Paste the notice",
      input_hint: "The whole text, or the key paragraphs",
      input_placeholder: "e.g. 2026 ○○ Startup Idea Competition\n- 접수기간: 2026. 11. 13. ~ 12. 10. 18:00\n- 참가대상: 예비창업자 또는 업력 7년 이내 창업자\n- 제출서류: 참가신청서, 사업계획서, 개인정보 수집 및 이용동의서, 참가서약서",
      run: "Read the notice",
      privacy: "What you paste is never sent to a server. Unless you switch the AI on yourself, every calculation finishes inside this browser.",
      empty_title: "No notice read yet",
      empty_body: "Paste a notice on the left, or press a sample notice to start.",
      how_title: "How it decides",
      how1_html: "<b>Sentences first.</b> The notice is split into sentences and lines, then the labels are found: application period, who may apply, documents, organiser.",
      how2_html: "<b>The rule engine takes the conditions.</b> Pre-founder status, years in business, region, student status, team size and the business-registration demand are matched with patterns and a dictionary, and <u>the sentence is kept with each one</u>.",
      how3_html: "<b>It compares them with your situation.</b> Your status, region and business registration are checked against the conditions: met, needs checking, or not eligible.",
      how4_html: "<b>What it cannot find stays empty.</b> An amount or deadline it cannot confirm is never guessed; it is shown as <span class=\"tag warn\">needs checking</span>.",
      trust_title: "Evidence and limits",
      trust1_html: "Every verdict card carries <b>the sentence it came from</b>. If no sentence can be found, no verdict is given.",
      trust2_html: "It does not infer requirements the notice does not state. \"Probably fine\" comes out as a question to check, not a conclusion.",
      trust3_html: "Deadlines and amounts are shown as the notice writes them; anything the app calculates is marked as an <b>estimate</b>.",
      trust4_html: "It never applies for you. It drafts documents and builds a calendar file; a person submits.",
      llm_title: "Optional · AI summary",
      llm_body_html: "Off by default. If you add your own key it is used only to summarise the notice and explain the eligibility sentences; neither the key nor the document is stored.",
      llm_placeholder: "sk-... (OpenAI-compatible key, optional)",
      llm_test: "Test connection",
      llm_off: "Off · rule engine only",
      llm_checking: "Checking…",
      llm_on: "On · summary only, nothing stored",
      llm_fail: "Connection failed ({status}) · continuing with the rule engine",
      llm_fail_plain: "Connection failed · continuing with the rule engine",
      corpus_hint: "TF-IDF cosine similarity · computed in the browser",
      footer_entry: "NoticeLine · entry for SLAY HACKS 2026",
      footer_author: "Built by Gaon Park · Pusan National University, Political Science and Diplomacy · has run a one-person business",
      lang_group: "Language",
      lang_ko: "Read in Korean",
      lang_en: "Read in English",

      badge_no_deadline: "no deadline found",
      badge_soon: "closing",
      missing_label: "Not found in the notice:",
      missing_deadline: "deadline",
      missing_amount: "amount",
      missing_docs: "documents",
      missing_target: "who may apply",
      name_unknown: "name not found",
      org_unknown: "organiser not found",
      card1: "Eligibility check",
      card2: "At a glance",
      card3: "Documents",
      card4: "D-day plan",
      card5: "Similar notices",
      my_conditions: "My situation",
      state_ok: "met",
      state_warn: "check",
      state_no: "no",
      deadline_row: "Deadline",
      check_needed: "needs checking",
      days_left: "{n} days left",
      days_passed: "passed",
      amount_row: "Amount",
      how_row: "How to apply",
      eval_row: "Judging",
      docs_empty: "No document paragraph was found. Paste the notice's \u2018documents\u2019 section as it appears and it will be split up.",
      plan_empty: "Find the deadline and the plan is counted back from D-14.",
      ics: "Download the calendar file (.ics)",
      copy_plan: "Copy the tasks",
      copied: "Copied",
      similar_deadline: "due {date}",
      footnote: "This screen is a summary for reading. Before you apply, check the eligibility, the documents and the exact closing time in the notice itself. NoticeLine never applies on your behalf.",

      profile_status: "Status",
      profile_business: "Business",
      profile_region: "Region",
      status_leave: "Student, on leave",
      status_active: "Student, enrolled",
      status_graduate: "Graduate / other",
      status_other: "Other",
      biz_none: "None (pre-founder)",
      biz_open: "Operating",
      region_other: "Other"
    }
  };

  function t(key, vars) {
    var table = S[lang] || S.ko;
    var text = (table[key] !== undefined ? table[key] : S.ko[key]);
    if (text === undefined) return key;
    if (!vars) return text;
    return String(text).replace(/\{(\w+)\}/g, function (m, name) {
      return (vars[name] !== undefined && vars[name] !== null) ? vars[name] : "";
    });
  }

  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = t("title");
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t("description"));
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-html]"), function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-placeholder]"), function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-aria]"), function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-lang]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
  }

  function setLang(next) {
    if (next !== "ko" && next !== "en") return;
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyStatic();
    if (typeof window.NL_ON_LANG === "function") window.NL_ON_LANG();
  }

  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-lang]"), function (b) {
      b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
    });
    applyStatic();
  }

  return { t: t, getLang: function () { return lang; }, setLang: setLang, bind: bind, applyStatic: applyStatic };
})();
