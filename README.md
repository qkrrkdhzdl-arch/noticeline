# NoticeLine — 공고문 한 장을 오늘의 할 일로

NoticeLine turns a Korean grant or competition notice (`지원사업 공고문`) into four things on one screen:

1. **자격 대조** — what the notice demands (student status, region, business registration, team size), compared with the reader's own situation.
2. **한눈에** — deadline, amount, how to apply, judging criteria, each with the sentence it came from.
3. **제출서류** — a checklist with progress.
4. **D-day 계획** — a backwards plan from the deadline, exportable as an `.ics` calendar file.

It runs entirely in the browser: a static site, no server, no account, no tracking.

## Why

A one-person business applies to dozens of notices a year. The notice itself is not the problem — the problem is that eligibility, documents and deadlines sit in three different paragraphs, and the person reading it is usually reading at 11pm after closing. The cost of a wrong read is not a bad score; it is a wasted 주민등록등본, a missed 18:00 cut-off, or signing a 서약서 that says the opposite of your situation.

NoticeLine does one narrow thing: it makes the notice give up its conditions, and keeps the evidence visible.

## How it works

```
notice text ──▶ sentence split ──▶ label extraction ──▶ rule engine ──▶ verdict + plan
                                          │
                                          └── source sentence kept for every field
```

* **Extraction** (`engine.js` → `parse`): dates near `마감`/`접수`, amounts with units, organizer lines, target paragraph, document paragraph, judging paragraph.
* **Rule engine** (`verdict`): six checks — student status, region (with 권역 mapping such as 충청권 = 대전·세종·충북·충남), business registration, business age, team size, deadline pressure. Each check returns `ok` / `확인 필요` / `불가` **with the sentence it used**.
* **Backwards plan** (`plan`): D-14 → D-DAY, skipping steps already in the past.
* **Similarity** (`similar`): TF-IDF cosine over a cached notice corpus, computed in the browser.
* **Nothing is invented.** If the notice does not state an amount or a deadline, the card stays empty and the field is listed under `확인 필요`. NoticeLine never submits anything for the user.

## Honest AI

The default build is a deterministic rule engine, not a language model. That is deliberate: eligibility decided by a model that cannot show its sentence is worse than no answer.

A **bring-your-own-key** field is provided for summarisation of the notice. It is off by default; when a key is entered, the key stays in memory for that page and the notice text is sent only to the endpoint the user chose. Nothing is stored.

## Files

| file | role |
|---|---|
| `index.html` | page shell |
| `style.css` | design system (no framework) |
| `engine.js` | extraction, rules, plan, ICS, similarity |
| `app.js` | rendering and interaction |
| `data/notices.js` | 9 real 2026 notices used as samples and as the similarity corpus |

## Run

Open `index.html`, or:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

No build step, no dependencies.

## Data

The sample notices are condensed copies of public 2026 notices from 농림축산식품부·한국농어촌공사, 국토교통부·스마트도시협회, 충청남도, 한국사회보장정보원, 한남대학교, 창업진흥원·현대건설, POSTECH, 국민대 차세대통신사업단, 서울관광재단. Deadline and amount strings are kept as published.

## Limits

* Korean notices only, and only the text the user pastes (PDF/HWP parsing is not built).
* Region mapping covers the five 권역 used by 창업중앙대학 programmes; other regional wording falls back to `확인 필요`.
* The plan assumes a human works backwards from the deadline; it does not know how long an issuing office takes.

## Author

박가온 (Gaon Park) — 부산대학교 정치외교학과, 개인사업자 운영 경험. Built for SLAY HACKS 2026.

MIT.
