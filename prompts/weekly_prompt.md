# Weekly prompt (recurring routine)

Paste as the Instructions of a scheduled Claude Code routine with the GitHub repo attached (working dir = repo root) and the Google Drive connector enabled.

State design: Google Drive holds only markdown reports. Each report carries its own machine-readable state in a hidden `<!--AIVC_STATE ... -->` HTML comment at the end (invisible when rendered). The routine reads the latest report, extracts that state to diff against, and writes a new report with fresh embedded state. No separate JSON lives in Drive.

```text
ultracode

WEEKLY AI VALUE-CHAIN DIFF SCAN. Recurring follow-up to the AI value-chain baseline: read the latest
report from Google Drive, discover new/changed public AI-infrastructure names over the trailing week,
score them with the same rubric, diff against the prior state, write a new report (with embedded state)
back to Drive, and POST a payload to n8n for email + Telegram delivery. Surfacing NEW investable names
is the point — do NOT rebuild the whole universe.

This routine has the GitHub repo `ai-value-chain-tracker` attached (working dir = repo root) and the
Google Drive connector. Let ASOF = today's date as YYYY-MM-DD.

STEP 1 — Read the latest report from Google Drive.
  Folder: Market_Strategies/AI_Infra
  - Use the Drive connector: list/search the folder for *.md reports (ai_value_chain_report_*.md or
    weekly_report_*.md), pick the MOST RECENT by the date in the filename, read its content, save it
    locally as ./latest_report.md.

STEP 1b — Extract prior state from that report.
  Run: node builders/extract_state.js ./latest_report.md ./prior_baseline.json
  (Pulls the embedded AIVC_STATE block — the universe, prior sub-scores, ranks and scoring weights.)

STEP 2 — Prepare the run.
  Run: node builders/prepare_weekly.js ./prior_baseline.json <ASOF>
  (Injects the real state + scoring weights into the workflow; sets the trailing-7-day window. Use the
  baseline's own meta.scoringWeights — never change them.)

STEP 3 — Run the discovery + scoring workflow.
  Use the Workflow tool with scriptPath "workflows/ai_value_chain_weekly.js". One discovery agent per
  layer over the trailing 7 days (excluding existing tickers); new names scored through the full
  Data→News→Bull→Bear→Synthesizer pipeline; materially-changed existing names refreshed with an ANCHORED
  synthesizer (adjust prior sub-scores by ±1–2 only). Write the returned result object to ./wf_output.json.

STEP 4 — Merge, diff, render.
  Run: node builders/build_weekly_report.js ./prior_baseline.json ./wf_output.json ./out <ASOF> 3
  Produces in ./out/: weekly_report_<ASOF>.md (the report WITH embedded AIVC_STATE) and
  ai_weekly_payload_<ASOF>.json (the n8n body). (A local baseline JSON is also written but is NOT uploaded.)

STEP 5 — Persist to Google Drive (markdown only, versioned by date, never overwrite).
  Use the Drive connector create_file to upload ONLY ./out/weekly_report_<ASOF>.md into
  Market_Strategies/AI_Infra. This becomes next week's "latest report" (and carries the state). Do NOT
  upload any JSON; do NOT delete prior reports.

STEP 6 — Deliver via n8n (notifications only).
  POST the payload to the n8n PRODUCTION webhook:
    curl -s -X POST -H "Content-Type: application/json" \
      --data-binary @./out/ai_weekly_payload_<ASOF>.json \
      "https://n8n.alanvaa.cloud/webhook/e884cbc0-cd05-4993-a3a2-a437464663b4"
  n8n builds the digest and sends email + Telegram. Confirm HTTP 200. Do NOT email/Telegram from here.

STEP 7 — Report back: one-line summary (additions, changes, newly-scored, follow-ups; biggest move),
  confirm the report .md was written to Drive, and the webhook POST returned 200.

RULES
- Incremental only — discovery scoped to the trailing 7 days; never relabel the existing universe as new.
- Same rubric + weights as the prior state (from its meta). No silent weight changes.
- Every new catalyst needs a real source URL + date; label every figure primary vs estimated.
- If a layer (or the whole week) is dry, say so explicitly — still write the report and notify.
```

## The flow

1. Read latest `*.md` from Drive -> `latest_report.md`.
2. `extract_state.js` -> `prior_baseline.json` (from the embedded AIVC_STATE block).
3. `prepare_weekly.js` -> injects state into the workflow.
4. Workflow (discovery + anchored scoring) -> `wf_output.json`.
5. `build_weekly_report.js` -> `weekly_report_<date>.md` (with embedded state) + payload.
6. Upload only the `.md` to Drive.
7. POST payload to the n8n production webhook -> email + Telegram.

Markdown is the only artifact in Drive; the state rides inside it. The original baseline report is read once (on the first run) and then superseded by newer dated reports.
