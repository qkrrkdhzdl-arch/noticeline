(function () {
  var $ = function (id) { return document.getElementById(id); };
  var notices = window.NOTICES || [];
  var state = { parsed: null, verdict: null, plan: [], done: {} };
  var profile = { status: "student_leave", business: "none", region: "부산" };

  var STATUS_LABEL = {
    student_leave: "대학생 · 휴학 중",
    student_active: "대학생 · 재학 중",
    graduate: "졸업·일반인",
    other: "기타"
  };

  /* ---------- samples ---------- */
  function renderSamples() {
    var box = $("samples");
    var picks = ["rural-2027", "smartcity-ai", "hannam-region", "nextgen-telecom"];
    picks.forEach(function (id) {
      var n = notices.filter(function (x) { return x.id === id; })[0];
      if (!n) return;
      var b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.textContent = n.name.replace(/^20\d\d\s*/, "").slice(0, 22);
      b.addEventListener("click", function () {
        $("notice").value = n.text;
        run();
      });
      box.appendChild(b);
    });
  }

  function renderCorpus() {
    var box = $("corpusList");
    box.innerHTML = "";
    notices.slice(0, 6).forEach(function (n) {
      var d = document.createElement("div");
      d.className = "ncard";
      d.innerHTML = "<b>" + esc(n.name) + "</b><small>" + esc(n.org) + "</small>" +
        '<div class="row"><span>' + esc(n.deadline) + "</span><span>" + esc((n.amount || "").slice(0, 22)) + "</span></div>";
      box.appendChild(d);
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- main ---------- */
  function run() {
    var text = $("notice").value.trim();
    if (text.length < 20) {
      $("notice").focus();
      return;
    }
    var p = Engine.parse(text);
    state.parsed = p;
    state.done = {};
    state.verdict = Engine.verdict(p, profile);
    state.plan = Engine.plan(p.deadline);
    $("empty").hidden = true;
    $("result").hidden = false;
    render();
  }

  function render() {
    var p = state.parsed, v = state.verdict;
    var dday = p.deadline ? Engine.daysLeft(p.deadline) : null;
    var badge = dday === null ? "—" : (dday === 0 ? "D-DAY" : (dday > 0 ? "D-" + dday : "마감"));
    var badgeSub = p.deadline ? p.deadline : "마감 미확인";

    var missing = [];
    if (!p.deadline) missing.push("마감일");
    if (!p.amounts.length) missing.push("지원 규모");
    if (!p.docs.length) missing.push("제출서류");
    if (!p.target) missing.push("참가대상");

    var html = "";
    html += '<div class="res">';
    html += '<div class="res-head"><div><h2>' + esc(p.name || "이름 미확인") + "</h2>" +
      '<div class="org">' + esc(p.org || "주최·주관 미확인") + "</div></div>" +
      '<div class="dday"><b>' + badge + "</b><small>" + esc(badgeSub) + "</small></div></div>";

    /* verdict */
    var cls = v.hard ? "no" : (v.warn ? "warn" : "ok");
    html += '<div class="card"><h3><span class="n">1</span>자격 대조 <span class="tag ' + cls + '">' + v.summary + "</span></h3>";
    html += '<div class="kv" style="margin-bottom:10px">' +
      '<dt>내 조건</dt><dd>' + profileChips() + "</dd></div>";
    v.rows.forEach(function (r) {
      html += '<div class="cond"><div class="label">' + esc(r.label) + "</div><div class=\"body\">" +
        '<span class="tag ' + r.state + '">' + (r.state === "ok" ? "충족" : r.state === "warn" ? "확인 필요" : "불가") + "</span> " +
        esc(r.why) +
        (r.src ? '<span class="src">' + esc(r.src.slice(0, 160)) + "</span>" : "") +
        "</div></div>";
    });
    html += "</div>";

    /* at a glance */
    html += '<div class="card"><h3><span class="n">2</span>한눈에</h3><dl class="kv">';
    html += "<dt>접수 마감</dt><dd>" + esc(p.deadlineRaw || p.deadline || "확인 필요") +
      (p.deadline ? '<span class="src">' + esc(p.deadline) + " · " + (dday >= 0 ? dday + "일 남음" : "지남") + "</span>" : "") + "</dd>";
    html += "<dt>지원 규모</dt><dd>" + (p.amounts.length ? esc(p.amounts.join(" · ")) : '<span class="tag warn">확인 필요</span>') + "</dd>";
    if (p.prizeLine && p.amounts.length) html += '<dd style="grid-column:1/-1"><span class="src">' + esc(p.prizeLine.slice(0, 200)) + "</span></dd>";
    html += "<dt>접수 방법</dt><dd>" + (p.howLine ? esc(p.howLine.slice(0, 180)) : '<span class="tag warn">확인 필요</span>') + "</dd>";
    if (p.evalLine) html += "<dt>심사 기준</dt><dd>" + esc(p.evalLine.slice(0, 180)) + "</dd>";
    html += "</dl>";
    if (missing.length) html += '<p class="micro">원문에서 찾지 못한 항목: ' + missing.map(function (m) { return '<span class="tag warn">' + m + "</span>"; }).join(" ") + "</p>";
    html += "</div>";

    /* documents */
    html += '<div class="card"><h3><span class="n">3</span>제출서류</h3>';
    if (p.docs.length) {
      html += '<div class="progress"><i id="bar"></i></div><ul class="docs">';
      p.docs.forEach(function (d, i) {
        html += '<li data-doc="' + i + '"><input type="checkbox" id="doc' + i + '"><span>' + esc(d) + "</span></li>";
      });
      html += "</ul>";
    } else {
      html += '<p class="micro"><span class="tag warn">확인 필요</span> 제출서류 문단을 찾지 못했습니다. 공고문의 ‘제출서류’ 항목을 그대로 붙여넣으면 자동으로 나뉩니다.</p>';
    }
    html += "</div>";

    /* plan */
    html += '<div class="card"><h3><span class="n">4</span>D-day 계획</h3>';
    if (state.plan.length) {
      html += '<ul class="plan">';
      state.plan.forEach(function (s) {
        html += "<li><span class=\"d\">" + s.d + "</span><span><b>" + esc(s.title) + "</b> · " + esc(s.date) +
          '<span class="src" style="border:0;padding:0;margin-top:2px">' + esc(s.body) + "</span></span></li>";
      });
      html += '</ul><div class="actions"><button class="ghost" id="ics">캘린더 파일(.ics) 내려받기</button>' +
        '<button class="ghost" id="copy">할 일 복사</button></div>';
    } else {
      html += '<p class="micro"><span class="tag warn">마감일 미확인</span> 마감일을 찾으면 D-14부터 역산한 계획을 만듭니다.</p>';
    }
    html += "</div>";

    /* similar */
    var sim = Engine.similar(state.parsed.raw, notices, 3);
    if (sim.length) {
      html += '<div class="card"><h3><span class="n">5</span>비슷한 공고</h3><div class="similar">';
      sim.forEach(function (s) {
        html += '<div class="sim"><div><b>' + esc(s.item.name) + "</b><small>" + esc(s.item.org) +
          " · 마감 " + esc(s.item.deadline) + "</small></div><div class=\"score\">" +
          (s.score * 100).toFixed(0) + "%</div></div>";
      });
      html += "</div></div>";
    }

    html += '<p class="micro">이 화면은 참고용 요약입니다. 접수 전 반드시 원문 공고문의 자격·서류·마감 시각을 확인하세요. NoticeLine은 대신 신청하지 않습니다.</p>';
    html += "</div>";

    $("result").innerHTML = html;
    bindResult();
  }

  function profileChips() {
    var sel = function (key, label, opts) {
      var out = '<select data-p="' + key + '" style="border:1px solid var(--line);border-radius:8px;padding:4px 6px;font-size:12px;margin:0 4px 4px 0;background:#fff">';
      opts.forEach(function (o) {
        out += '<option value="' + o[0] + '"' + (profile[key] === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      });
      return out + "</select>";
    };
    return sel("status", "신분", [
      ["student_leave", "대학생 휴학"],
      ["student_active", "대학생 재학"],
      ["graduate", "졸업·일반인"],
      ["other", "기타"]
    ]) + sel("business", "사업자", [
      ["none", "없음(예비창업)"],
      ["open", "운영 중"]
    ]) + sel("region", "지역", [
      ["부산", "부산"],
      ["서울", "서울"],
      ["대전", "대전"],
      ["기타", "기타"]
    ]);
  }

  /* ---------- bindings ---------- */
  function bindResult() {
    var selects = $("result").querySelectorAll("select[data-p]");
    Array.prototype.forEach.call(selects, function (s) {
      s.addEventListener("change", function () {
        profile[s.getAttribute("data-p")] = s.value;
        state.verdict = Engine.verdict(state.parsed, profile);
        render();
      });
    });

    var boxes = $("result").querySelectorAll(".docs input");
    Array.prototype.forEach.call(boxes, function (b) {
      b.addEventListener("change", function () {
        var li = b.closest("li");
        if (b.checked) li.classList.add("done"); else li.classList.remove("done");
        updateBar();
      });
    });
    updateBar();

    var icsBtn = $("ics");
    if (icsBtn) icsBtn.addEventListener("click", function () {
      var blob = new Blob([Engine.ics(state.parsed, state.plan)], { type: "text/calendar;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "noticeline-" + (state.parsed.deadline || "plan") + ".ics";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });

    var copyBtn = $("copy");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var lines = state.plan.map(function (s) { return s.d + " " + s.date + " · " + s.title; });
      var txt = state.parsed.name + "\n" + lines.join("\n");
      navigator.clipboard.writeText(txt).then(function () {
        copyBtn.textContent = "복사됨";
        setTimeout(function () { copyBtn.textContent = "할 일 복사"; }, 1500);
      });
    });
  }

  function updateBar() {
    var bar = $("bar");
    if (!bar) return;
    var all = $("result").querySelectorAll(".docs input");
    var done = $("result").querySelectorAll(".docs input:checked");
    bar.style.width = (all.length ? (done.length / all.length) * 100 : 0) + "%";
  }

  /* ---------- optional LLM ---------- */
  function bindLLM() {
    var btn = $("llmtest"), key = $("llmkey"), st = $("llmstate");
    btn.addEventListener("click", function () {
      var v = key.value.trim();
      if (!v) {
        st.textContent = "꺼짐 · 규칙 엔진만 사용";
        return;
      }
      st.textContent = "확인 중…";
      fetch("https://api.openai.com/v1/models", { headers: { Authorization: "Bearer " + v } })
        .then(function (r) {
          if (r.ok) { st.textContent = "켜짐 · 요약에만 사용, 저장하지 않음"; }
          else { st.textContent = "연결 실패(" + r.status + ") · 규칙 엔진 모드로 계속"; }
        })
        .catch(function () { st.textContent = "연결 실패 · 규칙 엔진 모드로 계속"; });
    });
  }

  /* ---------- init ---------- */
  renderSamples();
  renderCorpus();
  bindLLM();
  $("run").addEventListener("click", run);
  $("notice").addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
  });
})();
