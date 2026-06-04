# Weekly prompt (recurring routine)

Paste as the **Instructions** of a scheduled Claude Code routine with the **Google Drive** and **n8n** connectors attached. Reads the latest baseline from Drive, runs the incremental diff, writes dated outputs back to Drive, and posts a payload to n8n for delivery.

```text
ultracode: Run the weekly diff scan of the AI value chain. This is the recurring follow-up to the
one-time baseline: ingest the most recent baseline and report from Google Drive, discover publicly
listed companies that became relevant in the trailing window — new entrants and material developments
on names already covered — re-score them with the same rubric, and produce a weekly report of
follow-ups, changes and additions. Persist an updated baseline so the next run can diff against it.
Surfacing NEW investable names is the point of this scan; do NOT rebuild the whole universe.

INPUTS — read from Google Drive, folder Market_Strategies/AI_Infra:
  - The most recent ai_value_chain_baseline_<YYYY-MM-DD>.json — the machine-readable universe
    (companies by layer with tickers, the seven 0-10 sub-scores, composite, verdict, conviction,
    return potential, rank) plus meta.scoringWeights and the 7-dimension rubric. This is the prior
    state the diff compares against; use its weights EXACTLY and never change them silently.
  - The most recent report .md — ingest as narrative context to carry forward open follow-ups.

PHASE 1 — Discover what changed. One research agent per layer, scoped to the trailing window and
handed that layer's existing tickers so it excludes them. Each returns: (a) new names — publicly
listed companies with a material AI-infra announcement in the window NOT already in the universe
(ticker+exchange, layer, what they do, the specific AI-infra linkage, the announcement with date and
source URL, first-read AI-infra revenue share); and (b) existing updates — covered names with a
material development in the window (deal, guidance, earnings, large estimate revision, regulatory):
ticker, what changed, date, source URL, materiality. If a layer is dry, say so.

PHASE 2 — Thesis and score the changes.
  - Each NEW shortlisted name: Data → News → Bull → Bear → Synthesizer, producing the same fields +
    the seven 0-10 sub-scores; composite from the baseline weights.
  - Each EXISTING name with a high/medium-materiality update: a lighter REFRESH synthesizer that is
    ANCHORED to the name's prior sub-scores — adjust deltas only (typically ±1, rarely ±2) for what
    the development actually moves; do NOT re-score from scratch. Low-materiality updates become
    follow-up notes only.

PHASE 3 — Diff, report, persist. Compute deterministically: additions (new scored names + merged
rank), changes (existing names whose composite moved past the threshold, or whose verdict/return
changed, or that moved 3+ ranks — old vs new with driver and source), follow-ups, and drops. Then:
  - Build the updated baseline: merge additions + refreshed names, re-rank by composite, keep the
    IDENTICAL JSON schema, update the as-of date and counts.
  - Write the weekly report markdown: header (week-ending, as-of, prior date, 1-paragraph read),
    then Additions, Changes (old→new), Follow-ups/watch, Refreshed top-20, Dropped. Cite real source
    URLs and dates; label every figure primary vs estimated.
  - Persist to Google Drive (Market_Strategies/AI_Infra), versioned by date, never overwriting:
    ai_value_chain_baseline_<as-of>.json and weekly_report_<as-of>.md.
  - Build the n8n payload { weekEnding, asOfDate, priorBaselineDate, subject, summary, additions,
    changes, followups, drops, topRanking, reportMarkdown, driveFiles } and POST it to the n8n
    PRODUCTION webhook (https://.../webhook/...  NOT /webhook-test/...). n8n handles email + Telegram
    delivery only; Drive storage is done above.

Accept args for: layer subset, lookback days (default 7), max new names per layer (default 3), and
score-move threshold (default 3).
```

## The 5-step routine flow

1. **Read** latest `ai_value_chain_baseline_<date>.json` (+ last report for context) from Drive.
2. **Run** the weekly workflow.
3. **Merge/diff/render** with the weekly builder.
4. **Write** the dated updated baseline + weekly report back to Drive (`create_file`).
5. **POST** the payload to the n8n **production** webhook → email + Telegram.

> Use the production webhook (`/webhook/…`), not `/webhook-test/…`. The test URL only catches one event while you are actively listening in the n8n editor.

### Critical design rule

The refresh **must** be anchored to prior sub-scores (delta-only adjustment). Blind weekly re-scoring drifts the composite by +10–15 points/week from agent-to-agent recalibration rather than real moves — anchoring keeps the week-over-week diff trustworthy.
