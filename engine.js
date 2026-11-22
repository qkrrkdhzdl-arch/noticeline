/* NoticeLine engine
   A small, auditable rule engine. It does not guess: every field keeps the
   sentence it came from, and anything it cannot find stays empty. */
const Engine = (function () {
  const KO_MONTH = /(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/g;
  const BARE_MONTH = /(?:^|[^\d])(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})\s*(?:일|\.)?/g;

  const DOC_WORDS = [
    ["참가신청서", /참가\s*신청서|(?<!참가\s)신청서/],
    ["사업계획서", /사업\s*계획서/],
    ["제안서", /아이디어\s*제안서|제안서|적용\s*계획서/],
    ["개인정보 동의서", /개인정보[^.\n]{0,16}동의서/],
    ["참가서약서", /서약서/],
    ["청렴서약서", /청렴\s*서약서/],
    ["재학·휴학증명서", /재학\s*증명서|휴학\s*증명서/],
    ["사업자등록증", /사업자\s*등록증/],
    ["사실증명", /사실\s*증명/],
    ["주민등록등본", /주민등록\s*(등본|초본)/],
    ["발표자료(PPT)", /PPT|발표\s*자료/],
    ["증빙서류", /증빙\s*서류|수상\s*실적/],
    ["아이디어 제안서", /아이디어\s*제안서|기술[^.\n]{0,6}적용\s*계획서/]
  ];

  function sentences(text) {
    var out = [];
    String(text || "").split(/\n+/).forEach(function (line) {
      line.split(/(?<=[.!?。])\s+(?![0-9０-９])(?=[가-힣A-Z\u201c'"(])/).forEach(function (s) {
        s = s.trim();
        if (s.length > 1) out.push(s);
      });
    });
    return out;
  }

  function stripLabel(s) {
    return String(s || "")
      .replace(/^(접수\s*기간|신청\s*기간|공모\s*기간|접수\s*마감|마감일?|마감)\s*[:：]?\s*/, "")
      .trim();
  }

  function findSentence(list, re) {
    for (var i = 0; i < list.length; i++) if (re.test(list[i])) return list[i];
    return "";
  }

  function allDates(text) {
    var out = [], m;
    var re = new RegExp(KO_MONTH.source, "g");
    while ((m = re.exec(text)) !== null) {
      var iso = m[1] + "-" + pad(m[2]) + "-" + pad(m[3]);
      out.push({ iso: iso, at: m.index, raw: m[0] });
    }
    return out;
  }

  function pad(n) { n = String(n); return n.length === 1 ? "0" + n : n; }

  function pickDeadline(text, dates, list) {
    if (!dates.length) return null;
    var nearDeadline = dates.filter(function (d) {
      var around = text.slice(Math.max(0, d.at - 26), d.at + 26);
      return /마감|까지|마감일|마감일자/.test(around);
    });
    var pool = nearDeadline.length ? nearDeadline : dates;
    var sorted = pool.slice().sort(function (a, b) { return a.iso < b.iso ? -1 : 1; });
    // the notice's own order is 2026..2027 sometimes; take the last date that
    // sits inside a 접수 sentence when there is one, else the latest date.
    var applied = pool.filter(function (d) {
      var around = text.slice(Math.max(0, d.at - 40), d.at + 40);
      return /접수|신청\s*기간|공모\s*기간/.test(around);
    });
    var chosen = (applied.length ? applied : sorted)[
      applied.length ? applied.length - 1 : sorted.length - 1
    ];
    return chosen;
  }

  function extractAmount(text) {
    var re = /(\d+\s*억(?:\s*\d[\d,]*\s*만)?\s*원|\d[\d,]*\s*만\s*원|\d[\d,]*\s*원)/g, m, out = [];
    while ((m = re.exec(text)) !== null) {
      var v = m[0].replace(/\s+/g, " ").replace(/\s*원$/, "원").trim();
      if (out.indexOf(v) === -1) out.push(v);
    }
    return out.slice(0, 4);
  }

  function parse(text) {
    var list = sentences(text);
    var dates = allDates(text);
    var dl = pickDeadline(text, dates, list);
    var nameLine = list[0] || "";
    var name = (findSentence(list, /(공모전|경진대회|해커톤|아이디어톤|모집\s*공고|공모\s*공고)/) || nameLine).slice(0, 90);
    var orgLine = findSentence(list, /^(주최|주관|주최\s*[·\/]\s*주관)/) ||
      findSentence(list, /주최\s*:|주관\s*:/) || "";
    var target = findSentence(list, /(참가\s*대상|지원\s*자격|참가\s*자격|응모\s*대상|신청\s*대상|참여\s*자격)/);
    var docsLine = findSentence(list, /(제출\s*서류|제출물|구비\s*서류)/);
    var howLine = findSentence(list, /(접수\s*방법|신청\s*방법|접수처)/);
    var prizeLine = findSentence(list, /(시상|상금|상격)/);
    var evalLine = findSentence(list, /(심사\s*기준|평가\s*항목|배점)/);

    var docs = [];
    DOC_WORDS.forEach(function (pair) {
      if (pair[1].test(text)) docs.push(pair[0]);
    });

    return {
      raw: text,
      sentences: list,
      name: name.replace(/^(공고|안내)\s*[-–:]?\s*/, "").trim(),
      org: orgLine.replace(/^(주최\s*[·\/]\s*주관|주최|주관)\s*[:：]?\s*/, "")
        .replace(/\s*주관\s*[:：]\s*/, " · ").trim(),
      deadline: dl ? dl.iso : null,
      deadlineRaw: dl ? stripLabel(findSentence(list, /(접수\s*기간|신청\s*기간|접수\s*마감|마감일|까지)/) || dl.raw) : "",
      amounts: extractAmount(text),
      target: target,
      docs: docs,
      docsLine: docsLine,
      howLine: howLine,
      prizeLine: prizeLine,
      evalLine: evalLine,
      dates: dates
    };
  }

  /* ---- conditions: what the notice actually demands ---- */
  function conditions(p) {
    var t = p.raw, out = [];
    function add(label, re, note) {
      var s = findSentence(p.sentences, re);
      if (s) out.push({ label: label, text: s, note: note || "" });
    }
    add("신분", /(대학생|재학생|휴학생|대학원생|학부생)/);
    add("사업자", /(예비\s*창업자|사업자\s*등록증|창업\s*기업|개인사업자)/);
    add("업력", /업력/);
    add("지역", /(거주|소재지|권역|시·도|충청권|수도권|동남권)/);
    add("인원", /(팀\s*단위|2인\s*이상|1인\s*1|개인\s*1인|팀\s*참가)/);
    add("나이", /만\s*\d{1,2}\s*세/);
    return out;
  }

  var REGIONS = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  var GROUPS = {
    "충청권": ["대전", "세종", "충북", "충남"],
    "수도권": ["서울", "경기", "인천"],
    "동남권": ["부산", "울산", "경남"],
    "호남권": ["광주", "전북", "전남"],
    "대경권": ["대구", "경북"]
  };

  /* ---- verdict: compare the notice with the reader's own situation ---- */
  // Everything the reader sees here exists in both languages. The Korean text is
  // the original; the English is written for the same reading, not translated
  // word for word, because the labels are Korean institutions and notices.
  var M = {
    ko: {
      labelStudent: "학생 신분", labelRegion: "지역", labelBusiness: "사업자",
      labelCareer: "업력", labelTeam: "인원", labelDeadline: "마감",
      leaveExcluded: "이 공고는 재학생만 받고 휴학생은 제외합니다.",
      leaveOk: "휴학생도 지원할 수 있다고 적혀 있습니다.",
      leaveUnclear: "학생 대상 공고로 보입니다. 휴학생 포함 여부가 적혀 있지 않아 확인이 필요합니다.",
      activeOk: "재학생 요건을 충족합니다.",
      studentsOnly: "학생만 참가할 수 있는 공고입니다.",
      noStudentRule: "학생 신분 요건이 없습니다.",
      regionInGroup: function (g) { return g + "에 해당합니다."; },
      regionOutGroup: function (g, members, mine) {
        return "이 공고는 " + g + "(" + members + ") 소재만 받습니다. " + mine + "은 해당하지 않습니다.";
      },
      regionInList: function (mine) { return mine + " 소재 요건을 충족합니다."; },
      regionOutList: function (list) { return "이 공고는 " + list + " 소재만 받습니다."; },
      regionUnclear: "지역 문구가 있으나 범위를 확정하지 못했습니다. 원문을 확인하세요.",
      regionFree: "지역 제한이 없습니다.",
      businessOk: "사업자등록증을 낼 수 있습니다.",
      businessNeeded: "사업자등록증이 필요한 부문입니다. 예비창업자로 낼 수 있는 부문이 따로 있는지 확인하세요.",
      businessNotNeeded: "사업자등록 없이 낼 수 있습니다(예비창업자 허용).",
      careerCheck: "업력 기준을 확인해야 합니다.",
      careerPreOk: "예비창업자도 지원할 수 있다고 적혀 있습니다.",
      careerPreCheck: "예비창업자도 받는지 원문에서 확인해야 합니다.",
      teamOnly: "2인 이상 팀만 받습니다. 함께 낼 팀원이 필요합니다.",
      teamSolo: "개인으로 낼 수 있습니다.",
      deadlinePassed: function (d) { return "마감일이 지났습니다(" + d + ")."; },
      deadlineSoon: function (n) { return "마감까지 " + n + "일 남았습니다. 오늘 서류를 확정해야 합니다."; },
      deadlineLeft: function (n) { return "마감까지 " + n + "일 남았습니다."; },
      deadlineMissing: "원문에서 마감일을 찾지 못했습니다. 접수 페이지에서 직접 확인하세요.",
      summaryHard: "신청 불가에 가까움", summaryWarn: "확인 필요", summaryOk: "조건 충족 가능",
      planSteps: [
        ["자격 문장 확인", "참가대상 문단을 읽고 내 신분·지역·사업자 상태와 맞는지 표시합니다."],
        ["서류 목록 확정", "제출서류를 모두 내려받아 파일명 규칙을 정합니다."],
        ["기관에 문의", "애매한 자격 한 가지만 전화나 메일로 확인하고 답변을 보관합니다."],
        ["초안 완성", "제안서·사업계획서 초안을 끝까지 씁니다. 분량 제한을 먼저 확인합니다."],
        ["PDF 변환·검수", "한글 폰트 깨짐, 서명란, 파일 용량을 확인합니다."],
        ["제출", "마감 전날 제출하고 접수 화면을 캡처합니다."]
      ],
      planDay: "마감", planDayBody: "마감 시각은 원문 표기를 확인하세요(예: 18:00).",
      icsSummary: function (d, name) { return d + " " + name; }
    },
    en: {
      labelStudent: "Student status", labelRegion: "Region", labelBusiness: "Business",
      labelCareer: "Years in business", labelTeam: "Team size", labelDeadline: "Deadline",
      leaveExcluded: "This notice takes enrolled students only; students on leave are excluded.",
      leaveOk: "The notice says students on leave may also apply.",
      leaveUnclear: "This looks like a notice for students. It does not say whether students on leave count, so it needs checking.",
      activeOk: "You meet the enrolled-student requirement.",
      studentsOnly: "Only students may enter this notice.",
      noStudentRule: "There is no student requirement.",
      regionInGroup: function (g) { return "Your region is in " + enGroup(g) + "."; },
      regionOutGroup: function (g, members, mine) {
        return "This notice takes applicants based in " + enGroup(g) + " (" + members + ") only. " + enRegion(mine) + " is not in it.";
      },
      regionInList: function (mine) { return "The " + enRegion(mine) + " requirement is met."; },
      regionOutList: function (list) { return "This notice takes applicants based in " + list + " only."; },
      regionUnclear: "There is a regional sentence, but its scope could not be pinned down. Read the original.",
      regionFree: "There is no regional restriction.",
      businessOk: "You can provide the business registration certificate.",
      businessNeeded: "This track needs a business registration certificate. Check whether another track accepts pre-founders.",
      businessNotNeeded: "No business registration needed (pre-founders are accepted).",
      careerCheck: "The years-in-business threshold needs checking.",
      careerPreOk: "The notice says pre-founders may also apply.",
      careerPreCheck: "Check in the original whether pre-founders are accepted.",
      teamOnly: "Teams of two or more only. You need a teammate to submit with.",
      teamSolo: "You can enter alone.",
      deadlinePassed: function (d) { return "The deadline has passed (" + d + ")."; },
      deadlineSoon: function (n) { return n + " days left. The documents have to be final today."; },
      deadlineLeft: function (n) { return n + " days left."; },
      deadlineMissing: "No deadline was found in the notice. Check it on the application page.",
      summaryHard: "likely not eligible", summaryWarn: "needs checking", summaryOk: "conditions can be met",
      planSteps: [
        ["Read the eligibility sentences", "Read who may apply and mark where your status, region and business registration fit."],
        ["Fix the document list", "Download every required form and decide the file names."],
        ["Ask the office", "Call or email about the one unclear requirement, and keep the answer."],
        ["Finish the draft", "Write the proposal or business plan to the end. Check the page limit first."],
        ["Convert to PDF and check", "Look at broken fonts, signature fields and file size."],
        ["Submit", "Submit the day before the deadline and save a screenshot of the receipt."]
      ],
      planDay: "Deadline", planDayBody: "Check the closing time in the notice itself (for example 18:00).",
      icsSummary: function (d, name) { return d + " " + name; }
    }
  };

  var GROUPS_EN = { "충청권": "Chungcheong", "수도권": "the Seoul area", "동남권": "the southeast", "호남권": "Honam", "대경권": "Daegu-Gyeongbuk" };
  var REGIONS_EN = {
    "서울": "Seoul", "부산": "Busan", "대구": "Daegu", "인천": "Incheon", "광주": "Gwangju", "대전": "Daejeon",
    "울산": "Ulsan", "세종": "Sejong", "경기": "Gyeonggi", "강원": "Gangwon", "충북": "Chungbuk", "충남": "Chungnam",
    "전북": "Jeonbuk", "전남": "Jeonnam", "경북": "Gyeongbuk", "경남": "Gyeongnam", "제주": "Jeju", "기타": "other"
  };
  var GROUPS_MEMBERS_EN = {
    "충청권": "Daejeon, Sejong, Chungbuk, Chungnam",
    "수도권": "Seoul, Gyeonggi, Incheon",
    "동남권": "Busan, Ulsan, Gyeongnam",
    "호남권": "Gwangju, Jeonbuk, Jeonnam",
    "대경권": "Daegu, Gyeongbuk"
  };
  function enGroup(g) { return GROUPS_EN[g] || g; }
  function enRegion(r) { return REGIONS_EN[r] || r; }

  var DOC_EN = {
    "참가신청서": "Application form (참가신청서)",
    "사업계획서": "Business plan (사업계획서)",
    "제안서": "Proposal (제안서)",
    "개인정보 동의서": "Personal-data consent (개인정보 동의서)",
    "참가서약서": "Participation pledge (참가서약서)",
    "청렴서약서": "Integrity pledge (청렴서약서)",
    "재학·휴학증명서": "Enrolment / leave certificate (재학·휴학증명서)",
    "사업자등록증": "Business registration (사업자등록증)",
    "사실증명": "Certificate of facts (사실증명)",
    "주민등록등본": "Resident registration copy (주민등록등본)",
    "발표자료(PPT)": "Presentation (발표자료)",
    "증빙서류": "Supporting documents (증빙서류)",
    "아이디어 제안서": "Idea proposal (아이디어 제안서)"
  };

  function docLabel(name, lang) {
    return lang === "en" ? (DOC_EN[name] || name) : name;
  }

  function verdict(p, profile, lang) {
    var w = M[lang] || M.ko;
    var rows = [];
    function push(label, state, why, src) { rows.push({ label: label, state: state, why: why, src: src || "" }); }

    // 1. student status
    var studentLine = findSentence(p.sentences, /(대학생|재학생|휴학생|대학원생|학부생)/);
    if (studentLine) {
      var leaveExcluded = /휴학생[^.\n]{0,8}제외|재학생\(휴학생/.test(studentLine) || /휴학생\s*제외/.test(p.raw);
      var leaveOk = /휴학/.test(studentLine) && !leaveExcluded;
      if (profile.status === "student_leave") {
        if (leaveExcluded) push(w.labelStudent, "no", w.leaveExcluded, studentLine);
        else if (leaveOk) push(w.labelStudent, "ok", w.leaveOk, studentLine);
        else push(w.labelStudent, "warn", w.leaveUnclear, studentLine);
      } else if (profile.status === "student_active") {
        push(w.labelStudent, "ok", w.activeOk, studentLine);
      } else {
        push(w.labelStudent, "no", w.studentsOnly, studentLine);
      }
    } else {
      push(w.labelStudent, "ok", w.noStudentRule, "");
    }

    // 2. region
    var regionSentence = "";
    p.sentences.forEach(function (s) {
      var hit = /(권역|거주|소재지|소재|지역\s*제한|한정)/.test(s) &&
        (/(충청권|수도권|동남권|호남권|대경권)/.test(s) || REGIONS.some(function (r) { return s.indexOf(r) !== -1; }));
      if (hit) regionSentence += " " + s;
    });
    var regionLine = regionSentence.trim();
    if (regionLine) {
      var allowed = null, group = null;
      Object.keys(GROUPS).forEach(function (g) {
        if (regionLine.indexOf(g) !== -1) { group = g; }
      });
      REGIONS.forEach(function (r) { if (regionLine.indexOf(r) !== -1) { allowed = allowed || []; allowed.push(r); } });
      var mine = profile.region || "부산";
      if (group) {
        var inGroup = GROUPS[group].indexOf(mine) !== -1;
        push(w.labelRegion, inGroup ? "ok" : "no",
          inGroup
            ? w.regionInGroup(group)
            : w.regionOutGroup(group, lang === "en" ? GROUPS_MEMBERS_EN[group] : GROUPS[group].join("·"), mine),
          regionLine);
      } else if (allowed) {
        push(w.labelRegion, allowed.indexOf(mine) !== -1 ? "ok" : "no",
          allowed.indexOf(mine) !== -1
            ? w.regionInList(mine)
            : w.regionOutList(lang === "en" ? allowed.map(enRegion).join("·") : allowed.join("·")),
          regionLine);
      } else {
        push(w.labelRegion, "warn", w.regionUnclear, regionLine);
      }
    } else if (/전\s*국\s*민|누구나|전국/.test(p.raw)) {
      push(w.labelRegion, "ok", w.regionFree, findSentence(p.sentences, /전\s*국\s*민|누구나|전국/));
    }

    // 3. business registration
    var bizLine = findSentence(p.sentences, /(사업자\s*등록증|사업자등록|개인사업자|법인)/);
    if (bizLine) {
      var needed = /사업자\s*등록증[^.\n]{0,10}(제출|필수|첨부)/.test(p.raw) || /사업자등록증 또는 고유번호증/.test(p.raw);
      if (needed) {
        push(w.labelBusiness, profile.business === "open" ? "ok" : "warn",
          profile.business === "open" ? w.businessOk : w.businessNeeded,
          bizLine);
      } else {
        push(w.labelBusiness, "ok", w.businessNotNeeded, bizLine);
      }
    }

    // 4. career
    var careerLine = findSentence(p.sentences, /업력/);
    if (careerLine) {
      var allowsPre = /예비\s*창업자|예비창업/.test(careerLine) || /예비\s*창업자|예비창업/.test(p.target || "");
      push(w.labelCareer, profile.business === "open" ? "warn" : (allowsPre ? "ok" : "warn"),
        profile.business === "open" ? w.careerCheck
          : (allowsPre ? w.careerPreOk : w.careerPreCheck),
        careerLine);
    }

    // 5. people
    var teamLine = findSentence(p.sentences, /(2인\s*이상|팀\s*단위|팀\s*참가|1인\s*1)/);
    if (teamLine) {
      var teamOnly = /2인\s*이상/.test(teamLine) && !/개인/.test(teamLine);
      push(w.labelTeam, teamOnly ? "warn" : "ok",
        teamOnly ? w.teamOnly : w.teamSolo,
        teamLine);
    }

    // 6. deadline pressure
    if (p.deadline) {
      var days = daysLeft(p.deadline);
      if (days < 0) push(w.labelDeadline, "no", w.deadlinePassed(p.deadline), p.deadlineRaw);
      else if (days <= 3) push(w.labelDeadline, "warn", w.deadlineSoon(days), p.deadlineRaw);
      else push(w.labelDeadline, "ok", w.deadlineLeft(days), p.deadlineRaw);
    } else {
      push(w.labelDeadline, "warn", w.deadlineMissing, "");
    }

    var hard = rows.filter(function (r) { return r.state === "no"; }).length;
    var warn = rows.filter(function (r) { return r.state === "warn"; }).length;
    var summary = hard ? w.summaryHard : (warn ? w.summaryWarn : w.summaryOk);
    return { rows: rows, summary: summary, hard: hard, warn: warn };
  }

  function daysLeft(iso) {
    var today = new Date();
    var t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    var parts = iso.split("-");
    var t1 = Date.UTC(+parts[0], +parts[1] - 1, +parts[2]);
    return Math.round((t1 - t0) / 86400000);
  }

  /* ---- plan ---- */
  function plan(iso, lang) {
    if (!iso) return [];
    var w = M[lang] || M.ko;
    var parts = iso.split("-");
    var end = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
    var offsets = [14, 10, 7, 4, 2, 1];
    var out = [];
    w.planSteps.forEach(function (s, i) {
      var d = new Date(end.getTime() - offsets[i] * 86400000);
      if (d.getTime() < Date.now() - 86400000) return;
      out.push({ d: "D-" + offsets[i], date: fmt(d), title: s[0], body: s[1] });
    });
    out.push({ d: "D-DAY", date: fmt(end), title: w.planDay, body: w.planDayBody });
    return out;
  }

  function fmt(d) {
    return d.getUTCFullYear() + "." + pad(d.getUTCMonth() + 1) + "." + pad(d.getUTCDate());
  }

  function icsDate(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  }

  function ics(p, out) {
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NoticeLine//KO", "CALSCALE:GREGORIAN"];
    (out || []).forEach(function (s, i) {
      var parts = s.date.split(".");
      var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
      var end = new Date(d.getTime() + 86400000);
      lines.push("BEGIN:VEVENT");
      lines.push("UID:noticeline-" + Date.now() + "-" + i + "@noticeline");
      lines.push("DTSTAMP:" + icsDate(new Date()) + "T000000Z");
      lines.push("DTSTART;VALUE=DATE:" + icsDate(d));
      lines.push("DTEND;VALUE=DATE:" + icsDate(end));
      lines.push("SUMMARY:" + esc(s.d + " " + p.name.slice(0, 40)));
      lines.push("DESCRIPTION:" + esc(s.title + " — " + s.body));
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }
  function esc(s) { return String(s).replace(/[,;]/g, " ").replace(/\n/g, " "); }

  /* ---- similarity (TF-IDF cosine, no network) ---- */
  function tokens(text) {
    return String(text).toLowerCase()
      .replace(/[^0-9a-z가-힣\s]/g, " ")
      .split(/\s+/)
      .filter(function (w) { return w.length >= 2; });
  }

  function similar(text, corpus, n) {
    var docs = corpus.map(function (c) { return tokens(c.name + " " + c.text); });
    var q = tokens(text);
    if (!q.length) return [];
    var df = {};
    docs.concat([q]).forEach(function (tk) {
      var seen = {};
      tk.forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } });
    });
    var N = docs.length + 1;
    function vec(tk) {
      var tf = {};
      tk.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      var v = {}, norm = 0;
      Object.keys(tf).forEach(function (w) {
        var idf = Math.log(N / (1 + (df[w] || 1))) + 1;
        v[w] = tf[w] * idf;
        norm += v[w] * v[w];
      });
      norm = Math.sqrt(norm) || 1;
      Object.keys(v).forEach(function (w) { v[w] /= norm; });
      return v;
    }
    var qv = vec(q);
    var scored = docs.map(function (dv, i) {
      var v = vec(dv), s = 0;
      Object.keys(qv).forEach(function (w) { if (v[w]) s += qv[w] * v[w]; });
      return { item: corpus[i], score: s };
    });
    return scored.sort(function (a, b) { return b.score - a.score; }).slice(0, n || 3)
      .filter(function (r) { return r.score > 0.02; });
  }

  return {
    parse: parse, conditions: conditions, verdict: verdict,
    plan: plan, ics: ics, similar: similar, daysLeft: daysLeft, fmt: fmt, docLabel: docLabel
  };
})();
