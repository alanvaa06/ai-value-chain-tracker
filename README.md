# 🤖 AI Value Chain Tracker

> A multi-agent research system that maps the **end-to-end AI-infrastructure value chain**, scores publicly-listed equities on a transparent, return-oriented composite, and runs a **weekly diff** to surface newly-investable names — built as [Claude Code](https://claude.com/claude-code) workflows.

![License](https://img.shields.io/badge/license-MIT-green) ![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-d97757) ![Runtime](https://img.shields.io/badge/runtime-Node.js-339933) ![Pipeline](https://img.shields.io/badge/pipeline-baseline%20%2B%20weekly-2b6cb0)

---

## ✨ What it is

The AI boom is, underneath the models, a **physical supply chain** — power, datacenters, silicon, memory, networking, systems, cloud, and the apps on top. This project turns that chain into an investable, continuously-updated map:

1. 🗺️ **Maps** the chain into 11 layers and their sub-components.
2. 🏗️ **Builds a universe** of public companies with *specific* AI-infrastructure exposure (a concrete mechanism — **not** sector beta), each with a sourced, dated catalyst.
3. ⚔️ **Adversarially stress-tests** a shortlist (a bull *and* a bear agent per name) and **scores** each 0–100 on a weighted rubric.
4. 🔁 **Runs weekly** to discover *new* names and material changes, diffing against the prior baseline and emailing the delta.

> ⚠️ **Not investment advice.** Every figure is AI-generated and labelled *primary* (filing/official) vs *estimated*. Scores are opinion, directional only. Do your own research.

## 🧱 The value chain (11 layers)

| # | Layer | What it covers |
|--:|--|--|
| 1 | **Energy & Power** | generation (nuclear / SMR / gas), grid, utilities serving datacenter load |
| 2 | **Datacenter Buildout** | construction, DC REITs, cooling, electrical infrastructure |
| 3 | **Semiconductor Mfg Enablers** | foundry, advanced packaging, semicap equipment, materials |
| 4 | **Compute Silicon** | GPUs / accelerators, custom ASICs, host CPUs |
| 5 | **Memory & Storage** | HBM, DRAM, NAND / SSD |
| 6 | **Networking & Interconnect** | optical, switches / NICs, co-packaged optics, cabling |
| 7 | **Systems & Integration** | server OEM / ODM, rack-scale integrators |
| 8 | **Cloud & Compute Capacity** | hyperscalers, neoclouds |
| 9 | **Foundation Models** | mostly private — public exposure routes only |
| 10 | **Inference, Orchestration & Data Tooling** | serving, orchestration, data / observability |
| 11 | **Applications & Distribution** | AI-monetizing apps & channels |

## ⚙️ How it works

### 1 · Baseline (one-time)

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
  G --> I["Synthesizer<br/>verdict + 0–100 score"]
  H --> I
  I --> J["Ranked baseline<br/>JSON + report"]
```

Map every layer in parallel → shortlist → run each shortlisted name through an adversarial pipeline (**Data → News → Bull → Bear → Synthesizer**).

### 2 · Scoring rubric (0–100 composite)

Each name is scored 0–10 on seven dimensions, weighted to a composite. The default weights **tilt toward demand, growth and earnings momentum**, with valuation kept light (not removed):

| Dimension | Weight | Measures |
|--|--:|--|
| AI-exposure (demand size) | **22** | how direct & material the AI-infra linkage is |
| Earnings growth | **24** | revenue / EPS trajectory + backlog momentum |
| Moat / value capture | **10** | margin defensibility & competitive position |
| Valuation / risk-reward | **8** | multiple vs growth, own history & peers |
| Catalyst | **12** | durability & visibility of the driver |
| Earnings momentum | **18** | estimate revisions + sentiment tailwind |
| Risk-adjusted | **6** | inverse of execution / cyclicality risk |

**Three independent read-outs — don't conflate them:**
- 🔢 **Composite score (0–100)** — forward return potential *on the merits*.
- 🎯 **Verdict** — `underappreciated` / `fairly valued` / `priced-in` (a *mispricing* call).
- 📈 **Return potential** — high / med / low.

> A "fairly valued" name can still score high — the verdict measures *mispricing*, the score measures *return potential*.

### 3 · Weekly diff (recurring)

```mermaid
flowchart LR
  P["Prior baseline<br/>(Google Drive)"] --> D["Discover<br/>11 layers · last 7d"]
  D --> N["New names"]
  D --> U["Material updates"]
  N --> S["Score new<br/>(full pipeline)"]
  U --> R["Refresh changed<br/>(anchored ±1–2)"]
  S --> M["Merge + re-rank"]
  R --> M
  P --> M
  M --> O["Updated baseline +<br/>weekly diff report + payload"]
```

> 🔑 **The refresh is *anchored*** — it receives each name's prior sub-scores and adjusts deltas only (±1–2). Blind weekly re-scoring drifts +10–15 points/week (recalibration, not real moves); anchoring keeps week-over-week scores comparable.

## 🚀 Deploy as a weekly routine

```mermaid
flowchart LR
  Cron(["Weekly cron"]) --> CC["Claude Code routine"]
  GD[("Google Drive<br/>Market_Strategies/AI_Infra")] -->|"① read latest baseline"| CC
  CC -->|"② run workflow + ③ build diff"| CC
  CC -->|"④ write dated baseline + report"| GD
  CC -->|"⑤ POST payload"| N8N["n8n webhook"]
  N8N --> Mail["📧 Email"]
  N8N --> TG["📲 Telegram"]
```

1. **Read** latest `ai_value_chain_baseline_<date>.json` (+ last report for context) from Drive.
2. **Run** `workflows/ai_value_chain_weekly.js`.
3. **Merge/diff/render** with `builders/build_weekly_report.js`.
4. **Write** the dated updated baseline + weekly report back to Drive.
5. **POST** the payload to your n8n **production** webhook → email + Telegram.

> ⚠️ Use the **production** n8n webhook (`https://…/webhook/…`), **not** `/webhook-test/…` — the test URL only fires while you're actively listening in the n8n editor.

## 📂 Repository structure

```
workflows/
  ai_value_chain_baseline.js    # one-time baseline (map → adversarial deep-dive → score)
  ai_value_chain_weekly.js      # weekly discovery + anchored scoring (EMBEDDED = example stub)
builders/
  build_baseline_report.js      # baseline workflow output → ranked JSON + markdown report
  build_weekly_report.js        # weekly workflow output → diff report + updated baseline + n8n payload
prompts/
  baseline_prompt.md            # the ultracode prompt that builds the baseline
  weekly_prompt.md              # the ultracode prompt for the weekly routine
```

## ▶️ Running

Workflows run inside **Claude Code** via the `Workflow` tool (multi-agent orchestration). The builders are plain **Node.js**:

```bash
# weekly: merge a workflow run into the prior baseline and render the diff
node builders/build_weekly_report.js \
  prior_baseline.json  workflow_output.json  ./out  2026-06-03  3
```

The weekly script ships with a small **example stub** in `EMBEDDED` (placeholder tickers). In production the routine passes real state via `args` or reads the latest baseline from Google Drive — the stub is never used live.

## 📤 Outputs

| File | Purpose |
|--|--|
| `ai_value_chain_baseline_<date>.json` | ranked universe — the next run's input (state) |
| `weekly_report_<date>.md` | human report: additions / changes / follow-ups |
| `ai_weekly_payload_<date>.json` | n8n body for email + Telegram delivery |

## 📜 License

MIT © 2026 Alan Vazquez. See [LICENSE](LICENSE).

---

<sub>Built with [Claude Code](https://claude.com/claude-code) multi-agent workflows. Not affiliated with, or endorsed by, any company mentioned. **Not investment advice.**</sub>
