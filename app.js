(function () {
  var $ = function (id) { return document.getElementById(id); };
  var T = function (key, vars) { return NLI18N.t(key, vars); };
  var notices = window.NOTICES || [];
  var state = { parsed: null, verdict: null, plan: [], done: {} };
  var profile = { status: "student_leave", business: "none", region: "부산" };
  var llmState = { kind: "off", status: 0 };

  /* ---------- samples ---------- */
  function renderSamples() {
    var box = $("samples");
    box.innerHTML = "";
    var picks = ["rural-2027", "smartcity-ai", "hannam-region", "nextgen-telecom"];
    picks.forEach(function (id) {
      var n = notices.filter(function (x) { return x.id === id; })[0];
      if (!n) return;
      var b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.textContent = n.name.replace(/^20\d\d\s*년?\s*/, "").slice(0, 22);
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
    state.parsed = Engine.parse(text);
    state.done = {};
    $("empty").hidden = true;
    $("result").hidden = false;
    recompute();
    render();
  }

  function recompute() {
    state.verdict = Engine.verdict(state.parsed, profile, NLI18N.getLang());
    state.plan = Engine.plan(state.parsed.deadline, NLI18N.getLang());
  }

  function render() {
    var p = state.parsed, v = state.verdict;
    var lang = NLI18N.getLang();
    var dday = p.deadline ? Engine.daysLeft(p.deadline) : null;
    var badge = dday === null ? "—" : (dday === 0 ? "D-DAY" : (dday > 0 ? "D-" + dday : (lang === "en" ? "passed" : "마감")));
    var badgeSub = p.deadline ? p.deadline : T("badge_no_deadline");

    var missing = [];
    if (!p.deadline) missing.push(T("missing_deadline"));
    if (!p.amounts.length) missing.push(T("missing_amount"));
    if (!p.docs.length) missing.push(T("missing_docs"));
    if (!p.target) missing.push(T("missing_target"));

    var checkTag = '<span class="tag warn">' + T("check_needed") + "</span>";

    var html = "";
    html += '<div class="res">';
    html += '<div class="res-head"><div><h2>' + esc(p.name || T("name_unknown")) + "</h2>" +
      '<div class="org">' + esc(p.org || T("org_unknown")) + "</div></div>" +
      '<div class="dday"><b>' + badge + "</b><small>" + esc(badgeSub) + "</small></div></div>";

    /* verdict */
    var cls = v.hard ? "no" : (v.warn ? "warn" : "ok");
    html += '<div class="card"><h3><span class="n">1</span>' + T("card1") + ' <span class="tag ' + cls + '">' + v.summary + "</span></h3>";
    html += '<div class="kv" style="margin-bottom:10px">' +
      "<dt>" + T("my_conditions") + "</dt><dd>" + profileChips() + "</dd></div>";
    v.rows.forEach(function (r) {
      html += '<div class="cond"><div class="label">' + esc(r.label) + '</div><div class="body">' +
        '<span class="tag ' + r.state + '">' + (r.state === "ok" ? T("state_ok") : r.state === "warn" ? T("state_warn") : T("state_no")) + "</span> " +
        esc(r.why) +
        (r.src ? '<span class="src">' + esc(r.src.slice(0, 160)) + "</span>" : "") +
        "</div></div>";
    });
    html += "</div>";

    /* at a glance */
    html += '<div class="card"><h3><span class="n">2</span>' + T("card2") + '</h3><dl class="kv">';
    html += "<dt>" + T("deadline_row") + "</dt><dd>" + esc(p.deadlineRaw || p.deadline || T("check_needed")) +
      (p.deadline ? '<span class="src">' + esc(p.deadline) + " · " + (dday >= 0 ? T("days_left", { n: dday }) : T("days_passed")) + "</span>" : "") + "</dd>";
    html += "<dt>" + T("amount_row") + "</dt><dd>" + (p.amounts.length ? esc(p.amounts.join(" · ")) : checkTag) + "</dd>";
    if (p.prizeLine && p.amounts.length) html += '<dd style="grid-column:1/-1"><span class="src">' + esc(p.prizeLine.slice(0, 200)) + "</span></dd>";
    html += "<dt>" + T("how_row") + "</dt><dd>" + (p.howLine ? esc(p.howLine.slice(0, 180)) : T("check_needed")) + "</dd>";
    if (p.evalLine) html += "<dt>" + T("eval_row") + "</dt><dd>" + esc(p.evalLine.slice(0, 180)) + "</dd>";
    html += "</dl>";
    if (missing.length) html += '<p class="micro">' + T("missing_label") + " " + missing.map(function (m) { return '<span class="tag warn">' + m + "</span>"; }).join(" ") + "</p>";
    html += "</div>";

    /* documents */
    html += '<div class="card"><h3><span class="n">3</span>' + T("card3") + "</h3>";
    if (p.docs.length) {
      html += '<div class="progress"><i id="bar"></i></div><ul class="docs">';
      p.docs.forEach(function (d, i) {
        html += '<li data-doc="' + i + '"><input type="checkbox" id="doc' + i + '"><span>' + esc(Engine.docLabel(d, lang)) + "</span></li>";
      });
      html += "</ul>";
    } else {
      html += '<p class="micro">' + checkTag + " " + T("docs_empty") + "</p>";
    }
    html += "</div>";

    /* plan */
    html += '<div class="card"><h3><span class="n">4</span>' + T("card4") + "</h3>";
    if (state.plan.length) {
      html += '<ul class="plan">';
      state.plan.forEach(function (s) {
        html += "<li><span class=\"d\">" + s.d + '</span><span><b>' + esc(s.title) + "</b> · " + esc(s.date) +
          '<span class="src" style="border:0;padding:0;margin-top:2px">' + esc(s.body) + "</span></span></li>";
      });
      html += '</ul><div class="actions"><button class="ghost" id="ics">' + T("ics") + "</button>" +
        '<button class="ghost" id="copy">' + T("copy_plan") + "</button></div>";
    } else {
      html += '<p class="micro"><span class="tag warn">' + T("badge_no_deadline") + "</span> " + T("plan_empty") + "</p>";
    }
    html += "</div>";

    /* similar */
    var sim = Engine.similar(state.parsed.raw, notices, 3);
    if (sim.length) {
      html += '<div class="card"><h3><span class="n">5</span>' + T("card5") + '</h3><div class="similar">';
      sim.forEach(function (s) {
        html += '<div class="sim"><div><b>' + esc(s.item.name) + "</b><small>" + esc(s.item.org) +
          " · " + T("similar_deadline", { date: esc(s.item.deadline) }) + '</small></div><div class="score">' +
          (s.score * 100).toFixed(0) + "%</div></div>";
      });
      html += "</div></div>";
    }

    html += '<p class="micro">' + T("footnote") + "</p>";
    html += "</div>";

    $("result").innerHTML = html;
    bindResult();
  }

  function profileChips() {
    var sel = function (key) {
      var out = '<select data-p="' + key + '" style="border:1px solid var(--line);border-radius:8px;padding:4px 6px;font-size:12px;margin:0 4px 4px 0;background:#fff" aria-label="' + esc(T("profile_" + key)) + '">';
      optsFor(key).forEach(function (o) {
        out += '<option value="' + o[0] + '"' + (profile[key] === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      });
      return out + "</select>";
    };
    return sel("status") + sel("business") + sel("region");
  }

  function optsFor(key) {
    if (key === "status") return [
      ["student_leave", T("status_leave")],
      ["student_active", T("status_active")],
      ["graduate", T("status_graduate")],
      ["other", T("status_other")]
    ];
    if (key === "business") return [
      ["none", T("biz_none")],
      ["open", T("biz_open")]
    ];
    var regions = [["부산", "부산"], ["서울", "서울"], ["대전", "대전"]];
    if (NLI18N.getLang() === "en") {
      regions = [["부산", "Busan"], ["서울", "Seoul"], ["대전", "Daejeon"]];
    }
    return regions.concat([["기타", T("region_other")]]);
  }

  /* ---------- bindings ---------- */
  function bindResult() {
    var selects = $("result").querySelectorAll("select[data-p]");
    Array.prototype.forEach.call(selects, function (s) {
      s.addEventListener("change", function () {
        profile[s.getAttribute("data-p")] = s.value;
        recompute();
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
        copyBtn.textContent = T("copied");
        setTimeout(function () { copyBtn.textContent = T("copy_plan"); }, 1500);
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
  function renderLLMState() {
    var st = $("llmstate");
    if (llmState.kind === "off") st.textContent = T("llm_off");
    else if (llmState.kind === "checking") st.textContent = T("llm_checking");
    else if (llmState.kind === "on") st.textContent = T("llm_on");
    else if (llmState.kind === "fail") st.textContent = T("llm_fail", { status: llmState.status });
    else st.textContent = T("llm_fail_plain");
  }

  function bindLLM() {
    var btn = $("llmtest"), key = $("llmkey");
    btn.addEventListener("click", function () {
      var v = key.value.trim();
      if (!v) {
        llmState = { kind: "off", status: 0 };
        renderLLMState();
        return;
      }
      llmState = { kind: "checking", status: 0 };
      renderLLMState();
      fetch("https://api.openai.com/v1/models", { headers: { Authorization: "Bearer " + v } })
        .then(function (r) {
          llmState = r.ok ? { kind: "on", status: 0 } : { kind: "fail", status: r.status };
          renderLLMState();
        })
        .catch(function () {
          llmState = { kind: "error", status: 0 };
          renderLLMState();
        });
    });
  }

  /* ---------- language ---------- */
  window.NL_ON_LANG = function () {
    renderLLMState();
    if (state.parsed) {
      recompute();
      render();
    }
  };

  /* ---------- init ---------- */
  NLI18N.bind();
  renderSamples();
  renderCorpus();
  bindLLM();
  $("run").addEventListener("click", run);
  $("notice").addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
  });
})();
