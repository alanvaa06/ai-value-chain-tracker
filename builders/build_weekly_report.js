// Phase 3: merge weekly workflow output into the prior baseline, diff, and render the weekly report.
// usage: node _build_weekly.js <baseline.json> <workflow_output.json> <outDir> <asOf> [threshold]
const fs = require('fs');
const BASELINE = process.argv[2], WF = process.argv[3], OUT = process.argv[4], ASOF = process.argv[5];
const THRESH = Number(process.argv[6] || 3);

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const wfTop = JSON.parse(fs.readFileSync(WF, 'utf8'));
const R = wfTop.result || wfTop;
const newScoredRaw = R.newScored || [], refreshedRaw = R.refreshed || [], lowMat = R.lowMaterialityUpdates || [], disc = R.discoveryByLayer || [];
const windowStart = R.windowStart || '?';
const priorDate = (base.meta && base.meta.asOfDate) || '?';

function dec(s) { if (s == null) return ''; if (typeof s !== 'string') return String(s);
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'"); }
const clip = (s, n) => { s = dec(s).replace(/\s+/g,' ').trim(); return s.length > n ? s.slice(0,n-1)+'…' : s; };
const cleanThesis = s => { const d = dec(s).trim(); return /^(duplicate-removed|n\/?a|none|null)$/i.test(d) ? '' : d; };
const norm = t => String(t || '').split('.')[0].toUpperCase();   // e.g. BRK.B -> BRK (strip exchange suffix)
const SK = ['aiExposure','growth','moat','valuation','catalyst','momentum','riskAdj'];
const scLine = sc => SK.map(k => (sc && Number.isFinite(Number(sc[k]))) ? sc[k] : '–').join('/');
const retTag = r => r === 'high' ? '🟢 high' : r === 'low' ? '🔴 low' : '🟡 med';
const tierOf = s => s >= 75 ? 'A' : s >= 70 ? 'B' : s >= 64 ? 'C' : 'D';
const numC = v => (typeof v === 'number' && Number.isFinite(v));

// dedupe inputs by normalized ticker (cross-layer signals can repeat a name)
const newMap = {}; for (const n of newScoredRaw) { const k = norm(n.ticker); if (!newMap[k] || (n.compositeScore||0) > (newMap[k].compositeScore||0)) newMap[k] = n; }
const refMap = {}; for (const rf of refreshedRaw) { const k = norm(rf.ticker); if (!refMap[k] || (rf.compositeScore||0) > (refMap[k].compositeScore||0)) refMap[k] = rf; }

// prior + merged maps keyed by normalized ticker
const prior = {}; for (const r of (base.ranking || [])) prior[norm(r.ticker)] = r;
const merged = {}; for (const r of (base.ranking || [])) merged[norm(r.ticker)] = { ...r };

// apply refreshed (skip ones whose norm collides with a brand-new add)
for (const k in refMap) {
  const rf = refMap[k];
  const cur = merged[k] || { ticker: rf.ticker, layerNumber: rf.layerNumber, layer: rf.layer, survives: true };
  merged[k] = { ...cur, ticker: cur.ticker || rf.ticker, compositeScore: rf.compositeScore, scores: rf.scores,
    verdict: rf.verdict, returnPotential: rf.returnPotential, conviction: rf.conviction || cur.conviction || 'medium' };
}
// add brand-new names (norm not already in universe)
const additionsKeys = [];
for (const k in newMap) {
  if (merged[k] && prior[k]) continue; // collision with existing universe name → treat as refresh, skip add
  const n = newMap[k];
  merged[k] = { ticker: n.ticker, layerNumber: n.layerNumber, layer: n.layer, compositeScore: n.compositeScore,
    scores: n.scores, verdict: n.verdict, conviction: n.conviction, returnPotential: n.returnPotential, survives: n.survives !== false };
  additionsKeys.push(k);
}
// re-rank
const rankedArr = Object.values(merged).sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
rankedArr.forEach((e, i) => e.rank = i + 1);
const newRank = {}; for (const e of rankedArr) newRank[norm(e.ticker)] = e.rank;

// buckets
const additions = additionsKeys.map(k => ({ ...newMap[k], rank: newRank[k] })).sort((a, b) => a.rank - b.rank);
const changes = [], followups = [], newlyScored = [];
for (const k in refMap) {
  if (additionsKeys.includes(k)) continue;
  const rf = refMap[k], p = prior[k];
  const after = { composite: rf.compositeScore, verdict: rf.verdict, returnPotential: rf.returnPotential, rank: newRank[k] };
  if (p && numC(p.compositeScore)) {
    const b = { composite: p.compositeScore, verdict: p.verdict, returnPotential: p.returnPotential, rank: p.rank };
    const dC = Math.abs((after.composite||0) - (b.composite||0)), dR = Math.abs((after.rank||0) - (b.rank||0));
    if (dC >= THRESH || after.verdict !== b.verdict || after.returnPotential !== b.returnPotential || dR >= 3) changes.push({ ...rf, before: b, after });
    else followups.push({ ticker: rf.ticker, layer: rf.layer, note: rf.followup || rf.scoreRationale, composite: rf.compositeScore });
  } else {
    newlyScored.push({ ...rf, rank: newRank[k] }); // existing universe name, never previously scored
  }
}
for (const u of lowMat) followups.push({ ticker: u.ticker, layer: u.layer, note: dec(u.change), date: u.date, url: u.url });
const drops = [];

// ---- updated baseline ----
const upLayers = JSON.parse(JSON.stringify(base.layers || []));
const findLayer = n => upLayers.find(L => L.layerNumber === n);
for (const a of additions) {
  const L = findLayer(a.layerNumber); if (!L) continue; const co = a._co || {};
  L.companies.push({ ticker: a.ticker, exchange: dec(co.exchange) || null, name: dec(co.name) || null,
    whatTheyDo: dec(co.whatTheyDo) || null, aiLinkage: dec(co.aiLinkage) || null, aiRevShareRead: dec(co.aiRevShareRead) || null,
    recentAnnouncement: co.recentAnnouncement || null, shortlisted: true, deepDived: true,
    rank: a.rank, compositeScore: a.compositeScore, returnPotential: a.returnPotential, scores: a.scores,
    verdict: a.verdict, conviction: a.conviction, survives: a.survives !== false, addedOn: ASOF });
}
for (const k in refMap) {
  const rf = refMap[k]; if (additionsKeys.includes(k)) continue;
  const L = findLayer(rf.layerNumber); if (!L) continue;
  const c = L.companies.find(x => norm(x.ticker) === k);
  if (c) { c.compositeScore = rf.compositeScore; c.scores = rf.scores; c.verdict = rf.verdict; c.returnPotential = rf.returnPotential; c.deepDived = true; c.updatedOn = ASOF; }
}
for (const L of upLayers) for (const c of L.companies) if (newRank[norm(c.ticker)]) c.rank = newRank[norm(c.ticker)];

const uniCount = upLayers.reduce((n, l) => n + l.companies.length, 0);
const survCount = rankedArr.filter(e => e.survives !== false).length;
const updatedBaseline = {
  meta: { ...(base.meta || {}), asOfDate: ASOF, generatedAt: ASOF, priorBaselineDate: priorDate,
    counts: { layers: upLayers.length, universeCompanies: uniCount, shortlisted: rankedArr.length, survivors: survCount, dropped: rankedArr.length - survCount } },
  ranking: rankedArr.map(e => ({ rank: e.rank, ticker: e.ticker, layerNumber: e.layerNumber, layer: e.layer,
    compositeScore: e.compositeScore ?? null, returnPotential: e.returnPotential || null, verdict: e.verdict, conviction: e.conviction, survives: e.survives !== false, scores: e.scores || null })),
  layers: upLayers, survivors: rankedArr.filter(e => e.survives !== false).map(e => e.ticker), dropped: rankedArr.filter(e => e.survives === false).map(e => e.ticker),
};
fs.writeFileSync(`${OUT}\\ai_value_chain_baseline_${ASOF}.json`, JSON.stringify(updatedBaseline, null, 2), 'utf8');

// ---- weekly report markdown ----
const dryLayers = disc.filter(d => d.dry || ((d.newNames||[]).length===0 && (d.existingUpdates||[]).length===0)).map(d => d.layerNumber);
const biggest = changes.slice().sort((a,b)=>Math.abs((b.after.composite||0)-(b.before.composite||0))-Math.abs((a.after.composite||0)-(a.before.composite||0)))[0];
const md = [];
md.push(`# AI Value Chain — Weekly Diff · week ending ${ASOF}`);
md.push('');
md.push(`*As-of ${ASOF} · window ${windowStart} → ${ASOF} · vs prior baseline ${priorDate}*`);
md.push('');
md.push(`**This week:** ${additions.length} new name${additions.length===1?'':'s'}, ${changes.length} scored change${changes.length===1?'':'s'}, ${newlyScored.length} newly-scored universe name${newlyScored.length===1?'':'s'}, ${followups.length} follow-up${followups.length===1?'':'s'}.${biggest?` Biggest move: ${biggest.ticker} ${biggest.before.composite}→${biggest.after.composite}.`:''}${additions.length?` New: ${additions.map(a=>a.ticker).join(', ')}.`:''}`);
md.push('');

md.push('## Additions — new names entering the universe');
md.push('');
if (!additions.length) md.push('_None — no new publicly-listed names with material in-window AI-infra announcements._');
for (const a of additions) {
  const co = a._co || {};
  md.push(`### #${a.rank} · ${a.ticker}${co.exchange?' · '+dec(co.exchange):''} — ${dec(co.name)||a.ticker} · score ${a.compositeScore}/100 (Tier ${tierOf(a.compositeScore)}) · L${a.layerNumber} ${dec(a.layer)}`);
  md.push(`*${a.verdict} · return ${retTag(a.returnPotential)} · scores ${scLine(a.scores)} (Exp/Grw/Moat/Val/Cat/Mom/Rsk)*`);
  md.push('');
  md.push(`- **AI-infra linkage:** ${dec(co.aiLinkage)||'—'}`);
  { const nt = cleanThesis(a.netThesis); if (nt) md.push(`- **Net thesis:** ${nt}`); }
  const ra = co.recentAnnouncement || {};
  if (ra.description || ra.url) md.push(`- **Catalyst:** ${dec(ra.description)||'—'}${ra.date?' ('+ra.date+')':''}${ra.url?` — [source](${ra.url})`:''}`);
  if (co.aiRevShareRead) md.push(`- **AI-infra rev share (first read):** ${dec(co.aiRevShareRead)}`);
  if (a.keyRisk) md.push(`- **Key risk:** ${dec(a.keyRisk)}`);
  md.push('');
}

md.push('## Changes — already-scored names (old → new)');
md.push('');
if (!changes.length) md.push('_No previously-scored names crossed the change thresholds this week._');
else {
  md.push('| Ticker | Layer | Composite | Verdict | Rank | Driver |');
  md.push('|---|--:|---|---|---|---|');
  for (const c of changes.sort((a,b)=>a.after.rank-b.after.rank)) {
    md.push(`| **${c.ticker}** | ${c.layerNumber} | ${c.before.composite}→**${c.after.composite}** | ${c.before.verdict||'–'}${c.before.verdict!==c.after.verdict?'→'+c.after.verdict:''} | ${c.before.rank}→${c.after.rank} | ${clip(c.followup||c.scoreRationale||(c.update&&c.update.change),200).replace(/\|/g,'/')}${c.update&&c.update.url?` ([src](${c.update.url}))`:''} |`);
  }
}
md.push('');

if (newlyScored.length) {
  md.push('## Newly scored — existing universe names scored for the first time');
  md.push('');
  md.push('_In the universe before but never deep-dived; a material in-window development triggered a first score._');
  md.push('');
  md.push('| # | Ticker | Layer | Score | Return | Verdict | Trigger |');
  md.push('|--:|---|--:|--:|---|---|---|');
  for (const n of newlyScored.sort((a,b)=>a.rank-b.rank)) {
    md.push(`| ${n.rank} | **${n.ticker}** | ${n.layerNumber} | ${n.compositeScore} | ${retTag(n.returnPotential)} | ${n.verdict||'–'} | ${clip(n.followup||n.scoreRationale||(n.update&&n.update.change),160).replace(/\|/g,'/')}${n.update&&n.update.url?` ([src](${n.update.url}))`:''} |`);
  }
  md.push('');
}

md.push('## Follow-ups / watch (no score change yet)');
md.push('');
if (!followups.length) md.push('_None._');
for (const f of followups) md.push(`- **${f.ticker}** (${dec(f.layer)||'?'}) — ${clip(f.note,220)}${f.date?` (${f.date})`:''}${f.url?` — [source](${f.url})`:''}`);
md.push('');

md.push('## Refreshed top-20 (merged universe)');
md.push('');
md.push('| # | Ticker | Layer | Score | Return | Verdict |');
md.push('|--:|---|--:|--:|---|---|');
const addSet = new Set(additions.map(a => norm(a.ticker)));
for (const e of rankedArr.slice(0, 20)) {
  const tag = addSet.has(norm(e.ticker)) ? ' 🆕' : '';
  md.push(`| ${e.rank} | **${e.ticker}**${tag} | ${e.layerNumber} | ${e.compositeScore ?? '–'} | ${retTag(e.returnPotential)} | ${e.verdict || '–'} |`);
}
md.push('');
if (dryLayers.length) { md.push(`*Dry layers (no new names / material updates): ${dryLayers.join(', ')}.*`); md.push(''); }
md.push('---');
md.push(`*Updated baseline written: ai_value_chain_baseline_${ASOF}.json (${uniCount} companies, ${rankedArr.length} ranked).*`);
md.push('');
const reportMarkdown = md.join('\n');
fs.writeFileSync(`${OUT}\\weekly_report_${ASOF}.md`, reportMarkdown, 'utf8');

// ---- n8n payload ----
const topRanking = rankedArr.slice(0, 20).map(e => ({ rank: e.rank, ticker: e.ticker, layerNumber: e.layerNumber, compositeScore: e.compositeScore, returnPotential: e.returnPotential, verdict: e.verdict }));
const payload = {
  weekEnding: ASOF, asOfDate: ASOF, priorBaselineDate: priorDate, scoringWeights: base.meta.scoringWeights,
  subject: `AI Value Chain weekly — ${ASOF}: ${additions.length} new, ${changes.length} changed`,
  summary: `${additions.length} additions${additions.length?' ('+additions.map(a=>a.ticker).join(', ')+')':''}; ${changes.length} changes; ${newlyScored.length} newly-scored; ${followups.length} follow-ups.`,
  additions: additions.map(a => ({ ticker: a.ticker, layerNumber: a.layerNumber, rank: a.rank, compositeScore: a.compositeScore, verdict: a.verdict, returnPotential: a.returnPotential, linkage: dec((a._co||{}).aiLinkage) })),
  changes: changes.map(c => ({ ticker: c.ticker, layerNumber: c.layerNumber, before: c.before, after: c.after, driver: dec(c.followup||c.scoreRationale) })),
  newlyScored: newlyScored.map(n => ({ ticker: n.ticker, layerNumber: n.layerNumber, rank: n.rank, compositeScore: n.compositeScore, verdict: n.verdict, returnPotential: n.returnPotential })),
  followups: followups.map(f => ({ ticker: f.ticker, note: dec(f.note), url: f.url || null })),
  drops, topRanking, reportMarkdown,
  driveFiles: [`ai_value_chain_baseline_${ASOF}.json`, `weekly_report_${ASOF}.md`],
};
fs.writeFileSync(`${OUT}\\ai_weekly_payload_${ASOF}.json`, JSON.stringify(payload, null, 2), 'utf8');

// console
console.log(`Additions: ${additions.length} | Changes: ${changes.length} | Newly-scored: ${newlyScored.length} | Follow-ups: ${followups.length} | Dry layers: ${dryLayers.length}`);
console.log('New names :', additions.map(a => `${a.ticker}(#${a.rank},${a.compositeScore})`).join(', ') || 'none');
console.log('Changes   :', changes.map(c => `${c.ticker}(${c.before.composite}→${c.after.composite})`).join(', ') || 'none');
console.log('NewlyScored:', newlyScored.map(n => `${n.ticker}(${n.compositeScore})`).join(', ') || 'none');
console.log('Wrote:', `ai_value_chain_baseline_${ASOF}.json, weekly_report_${ASOF}.md, ai_weekly_payload_${ASOF}.json`);
