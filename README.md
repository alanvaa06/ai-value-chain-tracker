# AI Value Chain Tracker

A multi-agent research system that maps the end-to-end AI-infrastructure value chain, scores publicly listed equities on a transparent, return-oriented composite, and runs a weekly diff to surface newly investable names. Built as [Claude Code](https://claude.com/claude-code) workflows.

![License](https://img.shields.io/badge/license-MIT-green) ![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-d97757) ![Runtime](https://img.shields.io/badge/runtime-Node.js-339933) ![Pipeline](https://img.shields.io/badge/pipeline-baseline%20%2B%20weekly-2b6cb0)

---

## Overview

The AI buildout is, underneath the models, a physical supply chain: power, datacenters, silicon, memory, networking, systems, cloud, and the applications on top. This project turns that chain into an investable, continuously updated map:

1. Maps the chain into 11 layers and their sub-components.
2. Builds a universe of public companies with specific AI-infrastructure exposure (a concrete mechanism, not sector beta), each with a sourced, dated catalyst.
3. Adversarially stress-tests a shortlist (a bull and a bear agent per name) and scores each name 0-100 on a weighted rubric.
4. Runs weekly to discover new names and material changes, diffing against the prior baseline and delivering the delta.

> Disclaimer: Not investment advice. Every figure is AI-generated and labelled primary (filing/official) versus estimated. Scores are opinion, directional only. Do your own research.

## The value chain (11 layers)

| # | Layer | What it covers |
|--:|--|--|
| 1 | Energy and Power | generation (nuclear / SMR / gas), grid, utilities serving datacenter load |
| 2 | Datacenter Buildout | construction, datacenter REITs, cooling, electrical infrastructure |
| 3 | Semiconductor Manufacturing Enablers | foundry, advanced packaging, semicap equipment, materials |
| 4 | Compute Silicon | GPUs / accelerators, custom ASICs, host CPUs |
| 5 | Memory and Storage | HBM, DRAM, NAND / SSD |
| 6 | Networking and Interconnect | optical, switches / NICs, co-packaged optics, cabling |
| 7 | Systems and Integration | server OEM / ODM, rack-scale integrators |
| 8 | Cloud and Compute Capacity | hyperscalers, neoclouds |
| 9 | Foundation Models | mostly private; public exposure routes only |
| 10 | Inference, Orchestration and Data Tooling | serving, orchestration, data / observability |
| 11 | Applications and Distribution | AI-monetizing applications and channels |

## How it works

### 1. Baseline (one-time)

```mermaid
flowchart LR
  A["11 layer mappers<br/>(parallel)"] --> B["Universe<br/>~100 names"]
  B --> C["Shortlist per layer"]
  C --> D{"Per-name pipeline"}
  D --> E["Data agent"]
  D --> F["News agent"]
  E --> G["Bull"]
  F --> G
  E --> H["Bear"]
  F --> H
  G --> I["Synthesizer<br/>verdict + 0-100 score"]
  H --> I
  I --> J["Ranked baseline<br/>JSON + report"]
```

Map every layer in parallel, shortlist, then run each shortlisted name through an adversarial pipeline: Data, News, Bull, Bear, Synthesizer.

### 2. Scoring rubric (0-100 composite)

Each name is scored 0-10 on seven dimensions, weighted to a composite. The default weights tilt toward demand, growth and earnings momentum, with valuation kept light (not removed):

| Dimension | Weight | Measures |
|--|--:|--|
| AI-exposure (demand size) | 22 | how direct and material the AI-infrastructure linkage is |
| Earnings growth | 24 | revenue / EPS trajectory and backlog momentum |
| Moat / value capture | 10 | margin defensibility and competitive position |
| Valuation / risk-reward | 8 | multiple versus growth, own history and peers |
| Catalyst | 12 | durability and visibility of the driver |
| Earnings momentum | 18 | estimate revisions and sentiment tailwind |
| Risk-adjusted | 6 | inverse of execution / cyclicality risk |

Three independent read-outs, not to be conflated:

- Composite score (0-100): forward return potential on the merits.
- Verdict: underappreciated / fairly valued / priced-in (a mispricing call).
- Return potential: high / medium / low.

A name judged "fairly valued" can still score high. The verdict measures mispricing; the score measures return potential.

### 3. Weekly diff (recurring)

```mermaid
flowchart LR
  P["Prior baseline<br/>(Google Drive)"] --> D["Discover<br/>11 layers, last 7d"]
  D --> N["New names"]
  D --> U["Material updates"]
  N --> S["Score new<br/>(full pipeline)"]
  U --> R["Refresh changed<br/>(anchored +/-1-2)"]
  S --> M["Merge + re-rank"]
  R --> M
  P --> M
  M --> O["Updated baseline +<br/>weekly diff report + payload"]
```

The refresh is anchored: it receives each name's prior sub-scores and adjusts deltas only (typically +/-1-2). Blind weekly re-scoring drifts the composite by 10-15 points per week (agent-to-agent recalibration, not real moves); anchoring keeps week-over-week scores comparable.

## Getting started

Prerequisites:

- [Claude Code](https://claude.com/claude-code) — the workflows use its multi-agent `Workflow` tool and web search.
- [Node.js](https://nodejs.org) — the builders are plain Node, no dependencies.
- Optional, for automation: Google Drive and n8n connectors.

```bash
git clone https://github.com/alanvaa06/ai-value-chain-tracker
cd ai-value-chain-tracker
```

### Step 1. Build the baseline (one-time)

Pick one:

- Easiest, paste the prompt. Open Claude Code in this repo and paste the contents of [`prompts/baseline_prompt.md`](prompts/baseline_prompt.md). The `ultracode` keyword makes Claude orchestrate the workflow: it maps all 11 layers in parallel, builds the universe, runs the adversarial deep-dive (Data, News, Bull, Bear), and scores every shortlisted name.
- Direct, run the committed script. Invoke the `Workflow` tool on [`workflows/ai_value_chain_baseline.js`](workflows/ai_value_chain_baseline.js), then save its returned result to `baseline_output.json`.

Render the ranked report and machine-readable baseline:

```bash
node builders/build_baseline_report.js  baseline_output.json  ./out  2026-06-03
# -> ./out/ai_value_chain_baseline.json   (the universe + scores)
# -> ./out/AI_Value_Chain_Report.md       (the human report)
```

To tune the rubric, edit the `WEIGHTS` object in `builders/build_baseline_report.js` and re-run the builder. Re-ranking is instant and needs no new workflow run, because the seven sub-scores are stored per name.

### Step 2. Seed your store

The weekly diff reads the latest baseline, so date the file. If automating via Google Drive, upload to your folder renamed with the run date:

```
ai_value_chain_baseline_2026-06-03.json
ai_value_chain_report_2026-06-03.md
```

## Weekly diff (recurring)

Each run reads the latest dated baseline, discovers only what changed in the trailing window, scores it, and writes a new dated baseline so the next run diffs against it. Manual run:

```bash
# 1. inject the prior baseline into the workflow and set the 7-day window
node builders/prepare_weekly.js  prior_baseline.json  2026-06-10

# 2. run workflows/ai_value_chain_weekly.js via Claude Code's Workflow tool,
#    then save its returned result to wf_output.json

# 3. merge, diff, render
node builders/build_weekly_report.js  prior_baseline.json  wf_output.json  ./out  2026-06-10  3
# -> ./out/ai_value_chain_baseline_2026-06-10.json
# -> ./out/weekly_report_2026-06-10.md
# -> ./out/ai_weekly_payload_2026-06-10.json   (the n8n body)
```

For a hands-off weekly, deploy it as a scheduled Claude Code routine. See [Deploy as a weekly routine](#deploy-as-a-weekly-routine) and [`prompts/weekly_prompt.md`](prompts/weekly_prompt.md).

The weekly script ships with a small example stub in its `EMBEDDED` constant (placeholder tickers). `prepare_weekly.js` overwrites it with the real prior state at run time; the stub is never used live.

## Deploy as a weekly routine

```mermaid
flowchart LR
  Cron(["Weekly cron"]) --> CC["Claude Code routine"]
  GD[("Google Drive<br/>Market_Strategies/AI_Infra")] -->|"1. read latest baseline"| CC
  CC -->|"2. run workflow + 3. build diff"| CC
  CC -->|"4. write dated baseline + report"| GD
  CC -->|"5. POST payload"| N8N["n8n webhook"]
  N8N --> Mail["Email"]
  N8N --> TG["Telegram"]
```

1. Read the latest `ai_value_chain_baseline_<date>.json` (and the last report for context) from Drive.
2. Run `workflows/ai_value_chain_weekly.js`.
3. Merge, diff and render with `builders/build_weekly_report.js`.
4. Write the dated updated baseline and weekly report back to Drive.
5. POST the payload to the n8n production webhook, which delivers email and Telegram.

Use the production n8n webhook (`https://.../webhook/...`), not `/webhook-test/...`. The test URL only fires while you are actively listening in the n8n editor.

## Repository structure

```
workflows/
  ai_value_chain_baseline.js    # one-time baseline (map -> adversarial deep-dive -> score)
  ai_value_chain_weekly.js      # weekly discovery + anchored scoring (EMBEDDED = example stub)
builders/
  prepare_weekly.js             # prior baseline -> run args + injects state into the weekly workflow
  build_baseline_report.js      # baseline workflow output -> ranked JSON + markdown report
  build_weekly_report.js        # weekly workflow output -> diff report + updated baseline + n8n payload
prompts/
  baseline_prompt.md            # the ultracode prompt that builds the baseline
  weekly_prompt.md              # the ultracode prompt for the weekly routine
```

## Outputs

| File | Purpose |
|--|--|
| `ai_value_chain_baseline_<date>.json` | ranked universe; the next run's input (state) |
| `weekly_report_<date>.md` | human report: additions, changes, follow-ups |
| `ai_weekly_payload_<date>.json` | n8n body for email and Telegram delivery |

## License

MIT (c) 2026 Alan Vazquez. See [LICENSE](LICENSE).

---

Built with [Claude Code](https://claude.com/claude-code) multi-agent workflows. Not affiliated with, or endorsed by, any company mentioned. Not investment advice.
