// Reconstructs prior_baseline.json from a baseline markdown report that lacks AIVC_STATE.
// Parses §2 master ranking table + §3 value-chain map.
// usage: node builders/reconstruct_baseline.js <report.md> [out.json]
const fs = require('fs');
const MD = process.argv[2];
const OUT = process.argv[3] || 'prior_baseline.json';
if (!MD) { console.error('usage: node builders/reconstruct_baseline.js <report.md> [out.json]'); process.exit(1); }

const text = fs.readFileSync(MD, 'utf8');
const lines = text.split('\n');

const WEIGHTS = { aiExposure:22, growth:24, moat:10, valuation:8, catalyst:12, momentum:18, riskAdj:6 };

// --- parse §2 master ranking table ---
const retMap = { '🟢 high':'high', '🟡 med':'medium', '🔴 low':'low' };
const ranking = [];
let inRanking = false;
for (const line of lines) {
  if (line.startsWith('## 2 ·')) { inRanking = true; continue; }
  if (inRanking && line.startsWith('## ')) { inRanking = false; continue; }
  if (!inRanking) continue;
  if (!line.startsWith('|')) continue;
  const cols = line.split('|').map(c => c.trim()).filter((_, i) => i > 0 && i < 15);
  // # | Ticker | Layer | Score | Return | Verdict | Surv | Exp | Grw | Moat | Val | Cat | Mom | Rsk
  if (cols[0] === '#' || cols[0].startsWith('-')) continue;
  const rank = parseInt(cols[0]);
  if (!Number.isFinite(rank)) continue;
  const ticker = cols[1].replace(/\*\*/g, '');
  const layerNumber = parseInt(cols[2]);
  const compositeScore = parseFloat(cols[3].replace(/\*\*/g, ''));
  const returnPotential = retMap[cols[4]] || 'medium';
  const verdict = cols[5];
  const survives = cols[6] === '✓';
  const scores = {
    aiExposure: parseInt(cols[7]), growth: parseInt(cols[8]), moat: parseInt(cols[9]),
    valuation: parseInt(cols[10]), catalyst: parseInt(cols[11]), momentum: parseInt(cols[12]), riskAdj: parseInt(cols[13])
  };
  ranking.push({ rank, ticker, layerNumber, compositeScore, returnPotential, verdict, survives, scores });
}

// --- parse §3 value-chain map ---
const layerDefs = {
  1: 'Energy & Power', 2: 'Datacenter Buildout', 3: 'Semiconductor Manufacturing Enablers',
  4: 'Compute Silicon', 5: 'Memory & Storage', 6: 'Networking & Interconnect',
  7: 'Systems & Integration', 8: 'Cloud & Compute Capacity', 9: 'Foundation Models',
  10: 'Inference, Orchestration & Data Tooling', 11: 'Applications & Distribution',
};
const universeMap = {};
let inMap = false, curLayer = null;
for (const line of lines) {
  if (line.startsWith('## 3 ·')) { inMap = true; continue; }
  if (inMap && line.startsWith('## ')) { inMap = false; continue; }
  if (!inMap) continue;
  const lh = line.match(/^### (\d+)\. (.+)/);
  if (lh) { curLayer = parseInt(lh[1]); universeMap[curLayer] = { layer: lh[2].trim(), tickers: [] }; continue; }
  const uh = line.match(/^\*Universe \(\d+\):\*\s*(.+)/);
  if (uh && curLayer) {
    universeMap[curLayer].tickers = uh[1].split(',').map(t => t.trim()).filter(Boolean);
  }
}

// add layer to ranking entries
const layerByNum = {};
for (const n in universeMap) layerByNum[parseInt(n)] = universeMap[n].layer;
for (const r of ranking) r.layer = layerByNum[r.layerNumber] || layerDefs[r.layerNumber] || `Layer ${r.layerNumber}`;

// build layers array
const layers = Object.keys(universeMap).sort((a, b) => a - b).map(n => {
  const ln = parseInt(n);
  const info = universeMap[n];
  const companies = info.tickers.map(t => {
    const scored = ranking.find(r => r.ticker === t);
    return {
      ticker: t, exchange: null, name: null, whatTheyDo: null, aiLinkage: null,
      aiRevShareRead: null, recentAnnouncement: null,
      shortlisted: !!scored, deepDived: !!scored,
      rank: scored ? scored.rank : null, compositeScore: scored ? scored.compositeScore : null,
      returnPotential: scored ? scored.returnPotential : null,
      scores: scored ? scored.scores : null, verdict: scored ? scored.verdict : null,
      conviction: 'medium', survives: scored ? scored.survives : null,
    };
  });
  return { layerNumber: ln, layer: info.layer, requirements: null, companies };
});

const asOfDate = '2026-06-03';
const survivors = ranking.filter(r => r.survives).map(r => r.ticker);
const dropped = ranking.filter(r => !r.survives).map(r => r.ticker);

const baseline = {
  meta: {
    title: 'AI Value Chain — public-equity baseline universe (ranked)',
    asOfDate, generatedAt: asOfDate, priorBaselineDate: null,
    sourceWorkflow: 'ai-value-chain-baseline', scoringWeights: WEIGHTS,
    counts: { layers: layers.length, universeCompanies: layers.reduce((n, l) => n + l.companies.length, 0),
      shortlisted: ranking.length, survivors: survivors.length, dropped: dropped.length },
  },
  ranking: ranking.map(r => ({ rank: r.rank, ticker: r.ticker, layerNumber: r.layerNumber, layer: r.layer,
    compositeScore: r.compositeScore, returnPotential: r.returnPotential, verdict: r.verdict,
    conviction: 'medium', survives: r.survives, scores: r.scores })),
  layers, survivors, dropped,
};

fs.writeFileSync(OUT, JSON.stringify(baseline, null, 2), 'utf8');
console.log(`Reconstructed baseline -> ${OUT} | ${ranking.length} ranked names, ${layers.length} layers, asOf ${asOfDate}`);
