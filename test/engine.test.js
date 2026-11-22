/* Engine tests — no dependencies, no build step.

   node test/engine.test.js

   Two blocks: the nine sample notices in data/notices.js (each with the deadline
   the notice actually has), and regression cases for the date parsing, above all
   a range whose closing date is written without a year. */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");

function loadEngine() {
  const src = fs.readFileSync(path.join(root, "engine.js"), "utf8");
  return new Function(src + "\nreturn Engine;")();
}

function loadNotices() {
  const src = fs.readFileSync(path.join(root, "data", "notices.js"), "utf8");
  const window = {};
  new Function("window", src)(window);
  return window.NOTICES || [];
}

const Engine = loadEngine();
const NOTICES = loadNotices();
const PROFILE = { status: "student_leave", business: "none", region: "부산" };
const THIS_YEAR = new Date().getFullYear();

let passed = 0, failed = 0;

function group(title) { console.log("\n" + title); }

function test(title, fn) {
  try {
    fn();
    passed++;
    console.log("  ok    " + title);
  } catch (e) {
    failed++;
    console.log("  FAIL  " + title + "\n        " + (e.message || e).split("\n").join("\n        "));
  }
}

const deadlineOf = (text) => Engine.parse(text).deadline;

/* ------------------------------------------------------------------ *
 * 1. The built-in notices
 * ------------------------------------------------------------------ */

group("data/notices.js — the deadline each sample notice really has");

/* The sample texts are condensed, so a notice only has to give up a deadline its
   own text states. 서울관광 프롬프톤 is the one sample whose condensed text drops
   the closing date (its deadlineRaw and metadata keep "접수 마감 11. 16."), so the
   engine must leave the field empty rather than borrow the 12. 11. ~ 12. 12. 본선
   dates: a schedule date is not a deadline. */
const EXPECTED = {
  "rural-2027": "2026-12-10",
  "smartcity-ai": "2026-12-14",
  "chungnam-night": "2026-12-04",
  "social-security-ai": "2026-11-20",
  "hannam-region": "2026-11-20",
  "svc-seoul-ai": "2026-11-29",
  "postech-ime": "2026-11-30",
  "nextgen-telecom": THIS_YEAR + "-11-18",
  "seoul-tourism-prompt": null
};

test("every sample has an expected deadline in this test", () => {
  NOTICES.forEach((n) => {
    assert.ok(n.id in EXPECTED, "new sample " + n.id + " needs an expected deadline here");
  });
  assert.strictEqual(Object.keys(EXPECTED).length, NOTICES.length);
});

NOTICES.forEach((n) => {
  test(n.id + " → " + String(EXPECTED[n.id]), () => {
    const p = Engine.parse(n.text);
    assert.strictEqual(p.deadline, EXPECTED[n.id]);
    // where the notice states the deadline, the metadata says the same thing
    if (EXPECTED[n.id] !== null) {
      assert.strictEqual(p.deadline, n.deadline);
      assert.ok(p.deadlineRaw.length > 0, "deadlineRaw is empty");
    }
  });
});

test("sample deadlines are not shifted into another year", () => {
  NOTICES.forEach((n) => {
    const p = Engine.parse(n.text);
    if (!p.deadline) return;
    const y = +p.deadline.slice(0, 4);
    assert.ok(y >= 2026 && y <= 2027, n.id + " parsed " + p.deadline);
  });
});

/* ------------------------------------------------------------------ *
 * 2. Date parsing, one rule at a time
 * ------------------------------------------------------------------ */

group("a range whose closing date has no year");

test("2026. 11. 13. ~ 12. 10. closes on 2026-12-10", () => {
  assert.strictEqual(deadlineOf("2026. 11. 13. ~ 12. 10."), "2026-12-10");
});

test("신청기간: 2026. 11. 13. ~ 12. 10. closes on 2026-12-10", () => {
  assert.strictEqual(deadlineOf("신청기간: 2026. 11. 13. ~ 12. 10."), "2026-12-10");
});

test("weekday and closing time after both dates", () => {
  assert.strictEqual(deadlineOf("접수기간: 2026. 11. 13.(금) ~ 12. 10.(목) 18:00"), "2026-12-10");
});

test("no spaces around the range mark", () => {
  assert.strictEqual(deadlineOf("접수기간: 2026.11.13.~12.10."), "2026-12-10");
});

test("an en dash is a range mark too", () => {
  assert.strictEqual(deadlineOf("접수기간: 2026. 11. 13. – 12. 10."), "2026-12-10");
});

test("년/월/일 wording: 2026년 11월 13일 ~ 12월 10일", () => {
  assert.strictEqual(deadlineOf("접수기간: 2026년 11월 13일 ~ 12월 10일"), "2026-12-10");
});

test("a range that runs into the next year: 2026.12.20~01.05 → 2027-01-05", () => {
  assert.strictEqual(deadlineOf("접수기간: 2026.12.20~01.05 18:00"), "2027-01-05");
});

test("the same, written 2026. 12. 20. ~ 1. 5.", () => {
  assert.strictEqual(deadlineOf("접수기간: 2026. 12. 20. ~ 1. 5."), "2027-01-05");
});

test("a range whose closing year is stated stays as written", () => {
  const p = Engine.parse("접수기간: 2025. 12. 20. ~ 2026. 01. 05.");
  assert.strictEqual(p.deadline, "2026-01-05");
  assert.deepStrictEqual(p.dates.map((d) => d.iso), ["2025-12-20", "2026-01-05"]);
});

group("the closing date is the end of the range, not the start");

test("deadlineRaw keeps the line it came from", () => {
  const p = Engine.parse("2027년 농촌창업 경진대회 참여자 모집 공고\n신청기간: 2026. 11. 13. ~ 12. 10. 18:00\n참가대상: 예비 창업자.");
  assert.strictEqual(p.deadline, "2026-12-10");
  assert.strictEqual(p.deadlineRaw, "2026. 11. 13. ~ 12. 10. 18:00");
});

test("an earlier date in the body (업력 기준일) is not the deadline", () => {
  const p = Engine.parse([
    "2027년 농촌창업 경진대회 참여자 모집 공고",
    "신청기간: 2026. 11. 13. ~ 12. 10. 18:00",
    "참가대상: 업력 7년 이내의 창업자(2019. 11. 13. 이후 창업자)로 한정합니다."
  ].join("\n"));
  assert.strictEqual(p.deadline, "2026-12-10");
});

test("a schedule date below the deadline does not win", () => {
  const p = Engine.parse([
    "접수기간: 2026. 11. 13. ~ 12. 10. 18:00",
    "발표: 2027. 01. 15. 예정"
  ].join("\n"));
  assert.strictEqual(p.deadline, "2026-12-10");
});

test("two rounds: the final round closes the notice", () => {
  const p = Engine.parse([
    "1차 접수: 2026. 11. 13. ~ 11. 20. 마감",
    "2차 접수: 2026. 12. 1. ~ 12. 10. 마감"
  ].join("\n"));
  assert.strictEqual(p.deadline, "2026-12-10");
});

test("a closing word after the date (18:00까지) is enough", () => {
  assert.strictEqual(deadlineOf("접수기간: 공고일로부터 2026. 12. 04.(금) 18:00까지"), "2026-12-04");
});

group("dates the engine must not invent or misread");

test("decimals and percentages are not dates", () => {
  const p = Engine.parse([
    "접수기간: 2026. 11. 13. ~ 12. 10.",
    "가점: 성과 1.5배, 비율 25.5% 반영"
  ].join("\n"));
  assert.strictEqual(p.deadline, "2026-12-10");
  assert.deepStrictEqual(p.dates.map((d) => d.iso), ["2026-11-13", "2026-12-10"]);
});

test("a notice with no date gives no deadline", () => {
  assert.strictEqual(deadlineOf("공고문 본문에 날짜가 없습니다.\n참가대상: 누구나"), null);
});

test("a schedule date alone does not become the deadline", () => {
  const p = Engine.parse([
    "제출: 참가신청서를 지정 이메일로 제출합니다.",
    "본선: 12. 11. 16:00 ~ 12. 12. 16:00 서울관광플라자 4층, 24시간."
  ].join("\n"));
  assert.strictEqual(p.deadline, null);
});

test("a notice without a year anywhere is read in the current year", () => {
  const p = Engine.parse("접수 마감 11. 16. 18:00");
  assert.strictEqual(p.deadline, THIS_YEAR + "-11-16");
  assert.strictEqual(p.deadlineStated, false);
});

test("a range with nothing around it still closes on its end", () => {
  assert.strictEqual(deadlineOf("2026. 11. 13. ~ 12. 10."), "2026-12-10");
});

/* ------------------------------------------------------------------ *
 * 3. What the reader sees: the same answer in Korean and English
 * ------------------------------------------------------------------ */

group("the fix reaches the verdict and the plan, in both languages");

function rowOf(rows, label) {
  const row = rows.find((r) => r.label === label);
  assert.ok(row, "no row labelled " + label);
  return row;
}

const NOTICE = [
  "2027년 겨울 창업 아이디어 공모전 참여자 모집 공고",
  "주최: 부산광역시",
  "신청기간: 2026. 11. 13. ~ 12. 10. 18:00",
  "참가대상: 전 국민 개인 1인 1건.",
  "시상: 대상 300만원."
].join("\n");

test("the deadline row counts the closing date, not the opening one", () => {
  const p = Engine.parse(NOTICE);
  assert.strictEqual(p.deadline, "2026-12-10");
  const ko = rowOf(Engine.verdict(p, PROFILE, "ko").rows, "마감");
  const en = rowOf(Engine.verdict(p, PROFILE, "en").rows, "Deadline");
  const days = Engine.daysLeft("2026-12-10");
  assert.ok(!/지났습니다/.test(ko.why), "Korean verdict says the deadline passed: " + ko.why);
  assert.ok(!/has passed/.test(en.why), "English verdict says the deadline passed: " + en.why);
  assert.ok(ko.why.indexOf(String(days)) !== -1, ko.why);
  assert.ok(en.why.indexOf(String(days)) !== -1, en.why);
});

test("a deadline in the past is still called out, in both languages", () => {
  const past = new Date(Date.now() - 5 * 86400000);
  const iso = Engine.fmt(new Date(Date.UTC(past.getFullYear(), past.getMonth(), past.getDate())))
    .replace(/\./g, "-");
  const p = Engine.parse("신청기간: " + iso + ".");
  const ko = rowOf(Engine.verdict(p, PROFILE, "ko").rows, "마감");
  const en = rowOf(Engine.verdict(p, PROFILE, "en").rows, "Deadline");
  assert.strictEqual(ko.state, "no");
  assert.ok(/지났습니다/.test(ko.why), ko.why);
  assert.ok(/has passed/.test(en.why), en.why);
});

test("the backwards plan ends on the parsed closing date in both languages", () => {
  const p = Engine.parse(NOTICE);
  const ko = Engine.plan(p.deadline, "ko");
  const en = Engine.plan(p.deadline, "en");
  assert.strictEqual(ko[ko.length - 1].date, "2026.12.10");
  assert.strictEqual(en[en.length - 1].date, "2026.12.10");
  assert.strictEqual(ko[ko.length - 1].d, "D-DAY");
  assert.strictEqual(en[en.length - 1].d, "D-DAY");
});

test("the calendar file carries the same closing date", () => {
  const p = Engine.parse(NOTICE);
  const ics = Engine.ics(p, Engine.plan(p.deadline, "ko"));
  assert.ok(ics.indexOf("DTSTART;VALUE=DATE:20261210") !== -1, ics);
});

/* ------------------------------------------------------------------ */

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
