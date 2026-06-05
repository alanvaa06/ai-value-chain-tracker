// Transforms workflow output JSON into (1) baseline universe JSON and (2) a finished, ranked markdown report.
const fs = require('fs');

const SRC = process.argv[2];
const OUT_DIR = process.argv[3];
const STAMP = process.argv[4] || null;
const raw = fs.readFileSync(SRC, 'utf8');
const top = JSON.parse(raw);
const R = top.result || top;
const cfg = R.config || {};

// Re-weighted: tilt to demand size / earnings growth / earnings momentum; valuation reduced (not removed).
const WEIGHTS = { aiExposure:22, growth:24, moat:10, valuation:8, catalyst:12, momentum:18, riskAdj:6 };
const WLABEL = {
  aiExposure: 'AI-exposure (demand size)', growth: 'Earnings growth', moat: 'Moat / value capture',
  valuation: 'Valuation / risk-reward', catalyst: 'Catalyst (demand durability)',
  momentum: 'Earnings momentum (revisions)', riskAdj: 'Risk-adjusted (10=low risk)',
};
const WDESC = {
  aiExposure: 'How direct and material is the AI-infrastructure revenue/linkage (10 = pure-play core driver)',
  growth: 'Revenue/EPS growth trajectory + backlog/order momentum',
  moat: 'Competitive position, value capture, margin defensibility',
  valuation: 'Risk-reward of the current multiple vs growth, own history and peers (10 = cheap for the growth)',
  catalyst: 'Strength, durability and visibility of the demand catalyst (structural vs one-off)',
  momentum: 'Estimate-revision and sentiment tailwind (10 = estimates revised up, room to run)',
  riskAdj: 'Inverse of execution/concentration/cyclicality/balance-sheet risk (10 = low risk)',
};

const layers = (R.layers || []).slice().sort((a, b) => (a.layerNumber || 0) - (b.layerNumber || 0));
const theses = (R.theses || []).slice();

function dec(s) {
  if (s == null) return '';
  if (typeof s !== 'string') return String(s);
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}
const asOf = (cfg.asOfDate && cfg.asOfDate !== 'today') ? cfg.asOfDate : (STAMP || 'baseline date');
const clip = (s, n) => { s = dec(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// recompute composite from sub-scores using the (re-weighted) WEIGHTS, then rank
const composite = (s) => {
  if (!s) return 0;
  let tot = 0;
  for (const k in WEIGHTS) { const v = Math.max(0, Math.min(10, Number(s[k]) || 0)); tot += v / 10 * WEIGHTS[k]; }
  return Math.round(tot * 10) / 10;
};
for (const t of theses) { t.compositeScore = composite(t.scores); }
const ranked = theses.slice().sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
ranked.forEach((t, i) => { t.rank = i + 1; });
const tByTicker = {};
for (const t of ranked) tByTicker[t.ticker] = t;
const SKEYS = ['aiExposure', 'growth', 'moat', 'valuation', 'catalyst', 'momentum', 'riskAdj'];
const sc = (t) => (t && t.scores) ? SKEYS.map(k => { const v = Number(t.scores[k]); return Number.isFinite(v) ? v : '–'; }) : SKEYS.map(() => '–');

// ---- BASELINE JSON ----
const baseLayers = layers.map(L => {
  const shortSet = new Set(L.shortlist || []);
  const companies = (L.companies || []).map(c => {
    const t = tByTicker[c.ticker];
    return {
      ticker: c.ticker, exchange: dec(c.exchange) || null, name: dec(c.name) || null,
      whatTheyDo: dec(c.whatTheyDo) || null, aiLinkage: dec(c.aiLinkage) || null,
      aiRevShareRead: dec(c.aiRevShareRead) || null,
      recentAnnouncement: c.recentAnnouncement ? {
        description: dec(c.recentAnnouncement.description) || null,
        date: c.recentAnnouncement.date || null, url: c.recentAnnouncement.url || null,
      } : null,
      shortlisted: shortSet.has(c.ticker), deepDived: !!t,
      rank: t ? t.rank : null, compositeScore: t ? (t.compositeScore ?? null) : null,
      returnPotential: t ? (t.returnPotential || null) : null, scores: t ? (t.scores || null) : null,
      verdict: t ? t.verdict : null, conviction: t ? t.conviction : null, survives: t ? !!t.survives : null,
    };
  });
  return { layerNumber: L.layerNumber, layer: dec(L.layer), requirements: dec(L.requirements), companies };
});

const survivorsT = ranked.filter(t => t.survives);
const droppedT = ranked.filter(t => !t.survives);
const survivors = survivorsT.map(t => t.ticker);
const dropped = droppedT.map(t => t.ticker);

const baseline = {
  meta: {
    title: 'AI Value Chain — public-equity baseline universe (ranked)',
    asOfDate: asOf, lookbackMonths: cfg.lookbackMonths || null,
    maxNamesPerLayer: cfg.maxNamesPerLayer || null, layersRun: cfg.layersRun || null,
    generatedAt: STAMP, sourceWorkflow: 'ai-value-chain-baseline', scoringWeights: WEIGHTS,
    counts: {
      layers: layers.length, universeCompanies: baseLayers.reduce((n, l) => n + l.companies.length, 0),
      shortlisted: ranked.length, survivors: survivors.length, dropped: dropped.length,
    },
  },
  ranking: ranked.map(t => ({
    rank: t.rank, ticker: t.ticker, layerNumber: t.layerNumber, layer: dec(t.layer),
    compositeScore: t.compositeScore ?? null, returnPotential: t.returnPotential || null,
    verdict: t.verdict, conviction: t.conviction, survives: !!t.survives, scores: t.scores || null,
  })),
  layers: baseLayers, survivors, dropped,
};
fs.writeFileSync(OUT_DIR + '\\ai_value_chain_baseline.json', JSON.stringify(baseline, null, 2), 'utf8');

// ---- MARKDOWN ----
const md = [];
const verdictTag = v => v === 'underappreciated' ? '🟢 underappreciated' : v === 'priced-in' ? '🔴 priced-in' : '🟡 fairly valued';
const retTag = r => r === 'high' ? '🟢 high' : r === 'low' ? '🔴 low' : '🟡 med';
const uni = baseLayers.reduce((n, l) => n + l.companies.length, 0);
const tierOf = s => s >= 75 ? 'A' : s >= 70 ? 'B' : s >= 64 ? 'C' : 'D';

md.push('# AI Value Chain — Foundational Research Baseline (Ranked)');
md.push('');
md.push(`*As-of ${asOf} · Lookback: trailing ${cfg.lookbackMonths || 12} months · Universe ${uni} names across ${layers.length} layers · ${ranked.length} deep-dived & scored.*`);
md.push('');
md.push('This is a one-time foundational baseline: it maps the end-to-end AI-infrastructure value chain, builds a public-equity universe by layer, stress-tests a shortlist with an adversarial bull/bear process, and ranks names by a return-oriented composite score. The persisted universe (`ai_value_chain_baseline.json`) is the reference a later weekly workflow diffs against.');
md.push('');

// METHODOLOGY
md.push('## Methodology & how to read this');
md.push('');
md.push('**Process (multi-agent workflow `ai-value-chain-baseline`).**');
md.push('1. **Map & build universe** — one research agent per value-chain layer maps the layer\'s requirements/sub-components and identifies publicly listed names with a *specific* AI-infra linkage (not sector beta) plus the most material trailing-12-month announcement. Each layer shortlists its top names.');
md.push('2. **Adversarial deep-dive** — each shortlisted name runs a pipeline of role agents: a **Data** agent (financials, valuation, consensus — every figure labelled primary vs estimated), a **News/sentiment** agent, a **Bull** agent (why exposure is real & underappreciated), a **Bear** agent (refute: immaterial/indirect, already priced, one-off catalyst, execution risk).');
md.push('3. **Synthesis & scoring** — a synthesizer weighs bull vs bear into a net thesis, an adversarial **verdict** (mispricing), and a **0–100 composite score** (return potential).');
md.push('');
md.push('**Scoring rubric.** Each name is scored 0–10 on seven dimensions, weighted to a 0–100 composite. Weights below are tilted toward demand size, earnings growth and earnings momentum, with valuation reduced (not removed):');
md.push('');
md.push('| Dimension | Weight | What it measures |');
md.push('|---|--:|---|');
for (const k of SKEYS) md.push(`| ${WLABEL[k]} | ${WEIGHTS[k]} | ${WDESC[k]} |`);
md.push(`| **Total** | **${Object.values(WEIGHTS).reduce((a, b) => a + b, 0)}** | |`);
md.push('');
md.push('**Three distinct read-outs — do not conflate them:**');
md.push('- **Composite score (0–100):** forward total-return potential *on the merits*. The ranking key.');
md.push('- **Verdict (🟢 underappreciated / 🟡 fairly valued / 🔴 priced-in):** the *mispricing* call from the adversarial process. A high-scoring name can still be "fairly valued" — good business, fair price.');
md.push('- **Return potential (high/med/low):** the synthesizer\'s forward ~12-month view, deliberately decoupled from the mispricing verdict.');
md.push('');
md.push('> **Caveat.** Figures are agent-researched and labelled primary (filing/official) vs estimated in the source JSON — treat as directional, not audited. Scores are judgement, not a price target. "Survives" softened in the scored revision; the **ranking is the primary selector**, the verdict a secondary lens.');
md.push('');

// EXEC SUMMARY
const A = ranked.filter(t => tierOf(t.compositeScore) === 'A');
const B = ranked.filter(t => tierOf(t.compositeScore) === 'B');
const C = ranked.filter(t => tierOf(t.compositeScore) === 'C');
const under = ranked.filter(t => t.verdict === 'underappreciated');
const highRet = ranked.filter(t => t.returnPotential === 'high');
const decoupled = ranked.slice(0, 12).filter(t => t.verdict === 'priced-in');
md.push('## Executive summary');
md.push('');
md.push(`- Universe **${uni}** names → **${ranked.length}** scored → **${survivors.length}** survive adversarial review, **${dropped.length}** cut.`);
md.push(`- **Tier A (score ≥75):** ${A.map(t => `${t.ticker} ${t.compositeScore}`).join(' · ') || '—'}.`);
md.push(`- **Tier B (70–74.9):** ${B.map(t => t.ticker).join(', ') || '—'}.`);
md.push(`- **Tier C (64–69.9):** ${C.map(t => t.ticker).join(', ') || '—'}.`);
md.push(`- **Only names judged genuinely mispriced (underappreciated):** ${under.map(t => `${t.ticker} (#${t.rank})`).join(', ') || '—'} — the theme is otherwise broadly fairly-to-fully priced.`);
md.push(`- **Score ≠ mispricing:** ${decoupled.length ? decoupled.map(t => `${t.ticker} (#${t.rank}, priced-in)`).join(', ') + ' rank in the top 12 on demand/growth/momentum despite a priced-in verdict — an adversarial "priced-in" call does NOT mean "no forward return."' : 'no top-ranked names carry a priced-in verdict.'}`);
md.push(`- **High forward-return reads:** ${highRet.map(t => t.ticker).join(', ') || '—'}.`);
md.push('');

// 1 · FOCUS LIST
const focus = ranked.slice(0, 12);
md.push('## 1 · Recommended focus list');
md.push('');
md.push('Top names by composite score, with the synthesizer\'s one-line scoring rationale. Full thesis, valuation evidence, catalyst and key risk for each are in §4.');
md.push('');
md.push('| # | Ticker | Layer | Score | Tier | Return | Verdict | Why it ranks here |');
md.push('|--:|---|--:|--:|:-:|---|---|---|');
for (const t of focus) {
  const why = clip(t.scoreRationale || t.notInPrice || t.netThesis, 200).replace(/\|/g, '/');
  md.push(`| ${t.rank} | **${t.ticker}** | ${t.layerNumber} | **${t.compositeScore}** | ${tierOf(t.compositeScore)} | ${retTag(t.returnPotential)} | ${t.verdict || '–'} | ${why} |`);
}
md.push('');

// 2 · MASTER RANKING
md.push('## 2 · Master ranking (all scored names)');
md.push('');
md.push('Sub-scores: **Exp** AI-exposure/demand · **Grw** earnings growth · **Moat** · **Val** valuation/risk-reward · **Cat** catalyst · **Mom** earnings momentum · **Rsk** risk-adjusted (10=low risk).');
md.push('');
md.push('| # | Ticker | Layer | Score | Return | Verdict | Surv | Exp | Grw | Moat | Val | Cat | Mom | Rsk |');
md.push('|--:|---|--:|--:|---|---|:-:|--:|--:|--:|--:|--:|--:|--:|');
for (const t of ranked) {
  const s = sc(t);
  md.push(`| ${t.rank} | **${t.ticker}** | ${t.layerNumber} | **${t.compositeScore ?? '–'}** | ${retTag(t.returnPotential)} | ${t.verdict || '–'} | ${t.survives ? '✓' : '✗'} | ${s[0]} | ${s[1]} | ${s[2]} | ${s[3]} | ${s[4]} | ${s[5]} | ${s[6]} |`);
}
md.push('');

// 3 · VALUE CHAIN MAP
md.push('## 3 · Value-chain map');
md.push('');
md.push('Each layer: what it requires + key sub-components, then the full identified universe. Ordered upstream (power) → downstream (apps).');
md.push('');
for (const L of baseLayers) {
  md.push(`### ${L.layerNumber}. ${L.layer}`);
  md.push('');
  md.push(L.requirements || '_(no map returned)_');
  md.push('');
  const tickers = (L.companies || []).map(c => c.ticker).filter(Boolean);
  md.push(`*Universe (${tickers.length}):* ${tickers.join(', ') || '—'}`);
  md.push('');
}

// 4 · SURVIVORS BY LAYER
md.push('## 4 · Surviving names by layer');
md.push('');
md.push('Cleared adversarial review (material AI-infra exposure, bear case does not dominate). Within each layer, ordered by composite score.');
md.push('');
for (const L of baseLayers) {
  const names = ranked.filter(t => t.survives && t.layerNumber === L.layerNumber)
    .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
  if (!names.length) continue;
  md.push(`### ${L.layerNumber}. ${L.layer}`);
  md.push('');
  for (const t of names) {
    const co = t._co || {};
    const exch = dec(co.exchange);
    const nm = dec(co.name) || t.ticker;
    const s = sc(t);
    md.push(`#### #${t.rank} · ${t.ticker}${exch ? ' · ' + exch : ''} — ${nm} · **score ${t.compositeScore ?? '–'}/100** (Tier ${tierOf(t.compositeScore)})`);
    md.push(`*${verdictTag(t.verdict)} · conviction: ${t.conviction || '?'} · return potential: ${retTag(t.returnPotential)}*`);
    md.push('');
    md.push(`- **Scores** — AI-exposure ${s[0]} · growth ${s[1]} · moat ${s[2]} · valuation ${s[3]} · catalyst ${s[4]} · momentum ${s[5]} · risk-adj ${s[6]}${t.scoreRationale ? `. ${dec(t.scoreRationale)}` : ''}`);
    md.push(`- **AI-infra linkage:** ${dec(co.aiLinkage) || '—'}`);
    md.push(`- **Net thesis:** ${dec(t.netThesis) || '—'}`);
    md.push(`- **Valuation & pricing evidence:** ${dec(t.valuationEvidence) || '—'}`);
    if (t.alreadyInPrice) md.push(`  - *Already in price:* ${dec(t.alreadyInPrice)}`);
    if (t.notInPrice) md.push(`  - *Not yet in price:* ${dec(t.notInPrice)}`);
    const ra = co.recentAnnouncement || {};
    if (ra.description || ra.url) {
      const src = ra.url ? ` — [source](${ra.url})` : '';
      md.push(`- **Catalyst:** ${dec(ra.description) || '—'}${ra.date ? ' (' + ra.date + ')' : ''}${src}`);
    }
    if (co.aiRevShareRead) md.push(`- **AI-infra rev share (first read):** ${dec(co.aiRevShareRead)}`);
    md.push(`- **Key risk:** ${dec(t.keyRisk) || '—'}`);
    md.push('');
  }
}

// 5 · DROPPED
md.push('## 5 · Appendix — dropped names');
md.push('');
md.push('Cut on the adversarial mispricing test (exposure immaterial/indirect, or fully priced-in with the bear dominating). Composite score still shown — a cut name can still score on the merits.');
md.push('');
md.push('| # | Ticker | Layer | Score | Return | Verdict | Reason cut |');
md.push('|--:|---|--:|--:|---|---|---|');
for (const t of droppedT) {
  md.push(`| ${t.rank} | ${t.ticker} | ${t.layerNumber}. ${dec(t.layer)} | ${t.compositeScore ?? '–'} | ${retTag(t.returnPotential)} | ${t.verdict || '—'} | ${clip(t.dropReason || t.netThesis, 200).replace(/\|/g, '/')} |`);
}
md.push('');

// CLOSING
md.push('## Using this baseline');
md.push('');
md.push('- **Re-weighting** is free: the seven sub-scores are stored per name, so changing `WEIGHTS` in `_build_report.js` and re-running re-ranks instantly — no workflow re-run.');
md.push('- **Re-grading** (new scoring logic) edits the synthesizer in the workflow script and resumes the run — only the synthesizer agents re-run, upstream research is cached.');
md.push('- **Weekly scan:** diff a fresh universe against `ai_value_chain_baseline.json` by ticker/layer to surface adds, drops, score moves and verdict changes.');
md.push('');
md.push('---');
md.push(`*Persisted: \`ai_value_chain_baseline.json\` (${uni} companies, ${ranked.length} ranked verdicts + scores). Scoring weights: ${SKEYS.map(k => `${k} ${WEIGHTS[k]}`).join(', ')}.*`);
md.push('');

const stateBlock = '\n\n<!--AIVC_STATE\n' + JSON.stringify(baseline) + '\nAIVC_STATE-->\n';
fs.writeFileSync(OUT_DIR + '\\AI_Value_Chain_Report.md', md.join('\n') + stateBlock, 'utf8');

// console
console.log('Universe:', uni, '| Scored:', ranked.length, '| Survivors:', survivors.length, '| Dropped:', dropped.length);
console.log('Tiers: A', A.length, '| B', B.length, '| C', C.length, '| D', ranked.length - A.length - B.length - C.length);
console.log('Report sections: Methodology, Exec summary, 1 Focus list, 2 Master ranking, 3 Value-chain map, 4 Survivors, 5 Dropped, Using this baseline');
