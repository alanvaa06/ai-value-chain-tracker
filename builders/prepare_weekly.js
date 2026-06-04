// Prepares a weekly run: reads the prior baseline JSON, derives the run args, writes weekly_args.json,
// and injects the real state into the workflow's EMBEDDED constant (the repo ships an example stub).
// usage: node builders/prepare_weekly.js <prior_baseline.json> <asOf YYYY-MM-DD> [workflowPath] [lookbackDays]
const fs = require('fs');
const BASE = process.argv[2];
const ASOF = process.argv[3];
const WF = process.argv[4] || 'workflows/ai_value_chain_weekly.js';
const LOOKBACK = Number(process.argv[5] || 7);

if (!BASE || !ASOF) { console.error('usage: node builders/prepare_weekly.js <prior_baseline.json> <asOf YYYY-MM-DD> [workflowPath] [lookbackDays]'); process.exit(1); }

const b = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const d = new Date(ASOF); d.setDate(d.getDate() - LOOKBACK); const ws = d.toISOString().slice(0, 10);

const layers = (b.layers || []).map(L => ({ n: L.layerNumber, name: L.layer, existingTickers: (L.companies || []).map(c => c.ticker) }));
const priorScores = {};
for (const r of (b.ranking || [])) if (r.scores) priorScores[r.ticker] = { scores: r.scores, compositeScore: r.compositeScore, verdict: r.verdict, returnPotential: r.returnPotential };

const runArgs = {
  asOfDate: ASOF, windowStart: ws, lookbackDays: LOOKBACK,
  maxNewNamesPerLayer: 3, scoreMoveThreshold: 3,
  weights: (b.meta && b.meta.scoringWeights) || { aiExposure: 22, growth: 24, moat: 10, valuation: 8, catalyst: 12, momentum: 18, riskAdj: 6 },
  layers, priorScores,
};
fs.writeFileSync('weekly_args.json', JSON.stringify(runArgs, null, 2), 'utf8');

// inject real state into the workflow's EMBEDDED constant (replaces the shipped example stub)
let s = fs.readFileSync(WF, 'utf8');
const start = s.indexOf('const EMBEDDED = ');
const aIdx = s.indexOf('\nconst A = ', start);
if (start < 0 || aIdx < 0) throw new Error('EMBEDDED / `const A =` markers not found in ' + WF);
s = s.slice(0, start) + 'const EMBEDDED = ' + JSON.stringify(runArgs) + s.slice(aIdx);
fs.writeFileSync(WF, s);

console.log(`prepared: ${layers.length} layers, ${Object.keys(priorScores).length} prior-scored names, window ${ws} -> ${ASOF}`);
console.log(`wrote weekly_args.json and injected state into ${WF}`);
