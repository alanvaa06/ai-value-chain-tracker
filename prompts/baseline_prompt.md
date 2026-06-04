# Baseline prompt (one-time)

Paste into Claude Code (the `ultracode` keyword opts the turn into multi-agent orchestration). Produces the ranked universe + report that the weekly workflow diffs against.

```text
ultracode: Build a foundational research report mapping the end-to-end AI value chain
and identifying publicly listed equities with underappreciated exposure to it. This is a
one-time baseline; lookback is the trailing 12 months. Save the resulting universe so a
later weekly workflow can diff against it.

PHASE 1 — Map and build the universe. Run one research agent per layer below. Each agent
(a) briefly maps what the layer requires and its key sub-components, then (b) identifies
publicly listed companies that are actively building in that layer or have made a
material announcement in the trailing 12 months. For each company capture: ticker and
exchange, layer, what they do, the specific AI-infrastructure linkage (not generic
sector beta), the most material recent announcement with date and source URL, and a
first read on what share of revenue is tied to AI infrastructure.
  1. Energy and power (generation incl. nuclear/SMR, grid, utilities serving DC load)
  2. Datacenter buildout (construction, DC REITs, cooling, electrical infrastructure)
  3. Semiconductor manufacturing enablers (foundry, advanced packaging, semicap, materials)
  4. Compute silicon (GPUs/accelerators, custom ASICs, host CPUs)
  5. Memory and storage (HBM, DRAM, NAND/SSD)
  6. Networking and interconnect (optical, switches/NICs, co-packaged optics, cabling)
  7. Systems and integration (server OEM/ODM, integrators)
  8. Cloud and compute capacity (hyperscalers, neoclouds)
  9. Foundation models (note: mostly private; identify public exposure routes)
  10. Inference, orchestration and data tooling
  11. Applications and distribution
Shortlist the top 3-5 most relevant publicly listed names per layer for Phase 2.

PHASE 2 — Adversarial thesis per shortlisted name. For each, spawn role-based subagents:
  - Data agent: financials over trailing 12 months (revenue growth, margins, estimated
    AI-infra revenue mix), current valuation (multiples vs. own history and peers),
    consensus estimates, and recent price action. Label every figure as sourced from a
    primary filing/data source vs. estimated.
  - News and sentiment agent: recent news flow, analyst estimate revisions, positioning
    and sentiment signals.
  - Bull agent: construct the thesis — why the AI-infra exposure is real and material,
    and the specific reason it looks underappreciated relative to the current price.
  - Bear agent: refute it — exposure immaterial or indirect, thesis already consensus and
    in the price, catalyst one-off or cyclical, execution/competition/supply risk.
  - Synthesizer: weigh bull against bear and output a net thesis, a conviction level, an
    explicit "what is already in the price vs. what is not" section, the single most
    important risk, a priced-in verdict (underappreciated / fairly valued / priced-in),
    AND a 0-100 composite score from seven 0-10 sub-scores (AI-exposure/demand, earnings
    growth, moat/value-capture, valuation/risk-reward, catalyst, earnings momentum,
    risk-adjusted). Drop names where the bear case dominates or exposure is immaterial.

PHASE 3 — Final report. Open with the value-chain map. Then present surviving names
grouped by layer: ticker, AI-infra linkage, net thesis, valuation and pricing evidence,
catalyst with date and source, conviction, key risk, scores. Include an appendix of
dropped names with the one-line reason each was cut. Persist the full identified universe
(survivors and dropped, by layer, with tickers + scores) to a baseline JSON for the
weekly scan to reference.

Accept args for: layer subset, lookback months (default 12), and max names per layer.
```

Default scoring weights: AI-exposure 22 · growth 24 · moat 10 · valuation 8 · catalyst 12 · momentum 18 · risk-adjusted 6.
