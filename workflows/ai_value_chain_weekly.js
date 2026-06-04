export const meta = {
  name: 'ai-value-chain-weekly',
  description: 'Weekly incremental diff scan: discover new AI value-chain names + material updates over the trailing window, score with the baseline rubric',
  whenToUse: 'Recurring weekly follow-up to the AI value-chain baseline; finds new/changed names to diff',
  phases: [
    { title: 'Discover', detail: 'one agent per layer scans the trailing window for new names + material updates' },
    { title: 'Score', detail: 'deep-dive + score new names; refresh materially-changed existing names' },
  ],
}

// ---- args (the `args` global is not reliably populated in this env, so embed a fallback;
//      a routine that CAN pass args will override this automatically) ----
const EMBEDDED = {"asOfDate":"2026-01-08","windowStart":"2026-01-01","lookbackDays":7,"maxNewNamesPerLayer":3,"scoreMoveThreshold":3,"weights":{"aiExposure":22,"growth":24,"moat":10,"valuation":8,"catalyst":12,"momentum":18,"riskAdj":6},"layers":[{"n":1,"name":"Energy & Power","existingTickers":["EXMPL1","EXMPL2"]},{"n":4,"name":"Compute Silicon","existingTickers":["EXMPL3"]}],"priorScores":{"EXMPL1":{"scores":{"aiExposure":7,"growth":7,"moat":6,"valuation":5,"catalyst":6,"momentum":6,"riskAdj":5},"compositeScore":62,"verdict":"fairly valued","returnPotential":"medium"}}} // <-- EXAMPLE STUB ONLY. Production passes real state via `args`, or the routine reads the latest baseline from Google Drive. See README.
const A = (typeof args !== 'undefined' && args && Array.isArray(args.layers) && args.layers.length) ? args : EMBEDDED
const asOf = A.asOfDate || 'today'
const lookbackDays = A.lookbackDays || 7
const windowStart = A.windowStart || `${lookbackDays} days ago`
const maxNew = A.maxNewNamesPerLayer || 3
const WEIGHTS = A.weights || { aiExposure:22, growth:24, moat:10, valuation:8, catalyst:12, momentum:18, riskAdj:6 }
const LAYERS = A.layers || []
const norm = t => String(t || '').split('.')[0].toUpperCase()
const PRIOR_SCORES = A.priorScores || {}
const priorByNorm = {}; for (const k in PRIOR_SCORES) priorByNorm[norm(k)] = PRIOR_SCORES[k]

const composite = (s) => {
  if (!s) return 0
  let t = 0
  for (const k in WEIGHTS) { const v = Math.max(0, Math.min(10, Number(s[k]) || 0)); t += v / 10 * WEIGHTS[k] }
  return Math.round(t * 10) / 10
}

// ---- schemas ----
const DISCOVERY_SCHEMA = { type:'object', properties:{
  layerNumber:{type:'number'}, layer:{type:'string'}, dry:{type:'boolean'},
  newNames:{type:'array', items:{type:'object', properties:{
    ticker:{type:'string'}, exchange:{type:'string'}, name:{type:'string'}, whatTheyDo:{type:'string'}, aiLinkage:{type:'string'},
    recentAnnouncement:{type:'object', properties:{ description:{type:'string'}, date:{type:'string'}, url:{type:'string'} }},
    aiRevShareRead:{type:'string'} }, required:['ticker','aiLinkage'] }},
  existingUpdates:{type:'array', items:{type:'object', properties:{
    ticker:{type:'string'}, change:{type:'string'}, date:{type:'string'}, url:{type:'string'},
    materiality:{type:'string', enum:['high','med','low']} }, required:['ticker','change'] }}
}, required:['layerNumber'] }

const DATA_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'}, revenueGrowthTTM:{type:'string'}, margins:{type:'string'}, aiInfraRevMix:{type:'string'},
  valuation:{type:'string'}, valuationVsHistory:{type:'string'}, valuationVsPeers:{type:'string'}, consensus:{type:'string'}, priceAction:{type:'string'},
  figureSourcing:{type:'array', items:{type:'object', properties:{ figure:{type:'string'}, source:{type:'string', enum:['primary','estimated']}, ref:{type:'string'} }}}
}, required:['ticker'] }

const NEWS_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'},
  newsFlow:{type:'array', items:{type:'object', properties:{ headline:{type:'string'}, date:{type:'string'}, url:{type:'string'} }}},
  estimateRevisions:{type:'string'}, positioning:{type:'string'}, sentiment:{type:'string'}
}, required:['ticker'] }

const BULL_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'}, thesis:{type:'string'}, whyMaterial:{type:'string'}, whyUnderappreciated:{type:'string'}, evidence:{type:'string'}
}, required:['ticker','thesis'] }

const BEAR_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'}, refutation:{type:'string'}, immaterialOrIndirect:{type:'string'}, alreadyConsensus:{type:'string'}, catalystOneOff:{type:'string'}, executionRisk:{type:'string'}
}, required:['ticker','refutation'] }

const SCORES_PROPS = { aiExposure:{type:'number'}, growth:{type:'number'}, moat:{type:'number'}, valuation:{type:'number'}, catalyst:{type:'number'}, momentum:{type:'number'}, riskAdj:{type:'number'} }

const SYNTH_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'}, netThesis:{type:'string'}, conviction:{type:'string', enum:['high','medium','low']},
  alreadyInPrice:{type:'string'}, notInPrice:{type:'string'}, valuationEvidence:{type:'string'}, keyRisk:{type:'string'},
  verdict:{type:'string', enum:['underappreciated','fairly valued','priced-in']},
  survives:{type:'boolean'}, dropReason:{type:'string'},
  returnPotential:{type:'string', enum:['high','medium','low']},
  scores:{type:'object', properties:SCORES_PROPS, required:['aiExposure','growth','moat','valuation','catalyst','momentum','riskAdj']},
  scoreRationale:{type:'string'}
}, required:['ticker','netThesis','conviction','verdict','survives','scores','returnPotential'] }

const REFRESH_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'}, netThesis:{type:'string'},
  scores:{type:'object', properties:SCORES_PROPS, required:['aiExposure','growth','moat','valuation','catalyst','momentum','riskAdj']},
  verdict:{type:'string', enum:['underappreciated','fairly valued','priced-in']},
  conviction:{type:'string', enum:['high','medium','low']},
  returnPotential:{type:'string', enum:['high','medium','low']},
  followup:{type:'string'}, scoreRationale:{type:'string'}
}, required:['ticker','scores','verdict','returnPotential','followup'] }

// ---- prompts ----
const discoveryPrompt = (L) => `You are an equity analyst running a WEEKLY incremental scan of the AI-infrastructure value chain.
LAYER ${L.n}: ${L.name}.
Window: ${windowStart} to ${asOf} (trailing ${lookbackDays} days). As-of ${asOf}.
Already-covered tickers in this layer (EXCLUDE from newNames): ${(L.existingTickers || []).join(', ') || 'none'}.
Use WebSearch/WebFetch; every item needs a REAL source URL dated WITHIN the window.
Return:
(a) newNames: publicly listed companies with a MATERIAL AI-infrastructure announcement/development IN THE WINDOW that are NOT in the excluded list — ticker+exchange, name, what they do, the SPECIFIC AI-infra linkage (mechanism, not generic sector beta), the announcement (description, date YYYY-MM-DD within the window, source URL), first-read AI-infra revenue share. Quality over quantity; at most ${maxNew}.
(b) existingUpdates: companies FROM the excluded/already-covered list that had a MATERIAL development IN THE WINDOW (earnings print, new deal/contract, guidance change, large analyst estimate revision, regulatory event) — ticker, one-line change, date, source URL, materiality (high/med/low).
If nothing material happened in this layer in the window, set dry=true and return empty arrays. Do NOT pad and do NOT relist news from before the window.`

const dataPrompt = (co) => `Role: DATA agent. Company ${co.ticker} (${co.exchange||'?'}) — ${co.name||co.ticker}. Value-chain layer: ${co.layer}.
As-of ${asOf}. Use WebSearch/WebFetch for current figures; cite sources.
Pull: revenue growth (TTM), gross/operating margins, estimated AI-infrastructure revenue mix, current valuation (key multiples), valuation vs own history, valuation vs peers, consensus estimates, recent price action.
In figureSourcing, label EVERY material figure "primary" (filing/official — give ref) or "estimated".`

const newsPrompt = (co) => `Role: NEWS & SENTIMENT agent. Company ${co.ticker} — ${co.name||co.ticker}. Layer ${co.layer}. As-of ${asOf}.
Use WebSearch/WebFetch. Summarize recent news flow (headline, date, url), analyst estimate revisions, positioning, sentiment. Flag rumor vs confirmed.`

const bullPrompt = (r) => `Role: BULL analyst. Company ${r.co.ticker} — ${r.co.name||r.co.ticker}. Layer ${r.co.layer}.
AI-infra linkage on record: ${r.co.aiLinkage||'n/a'}.
DATA: ${JSON.stringify(r.data)}
NEWS: ${JSON.stringify(r.news)}
Construct the bull thesis: (1) why the AI-infra exposure is REAL and MATERIAL (mechanism + magnitude); (2) the SPECIFIC reason it looks UNDERAPPRECIATED vs the current price. Cite evidence.`

const bearPrompt = (r) => `Role: BEAR analyst (adversarial). Company ${r.co.ticker} — ${r.co.name||r.co.ticker}. Layer ${r.co.layer}.
DATA: ${JSON.stringify(r.data)}
NEWS: ${JSON.stringify(r.news)}
Refute the AI-infra bull case: exposure immaterial/indirect; already consensus and priced; catalyst one-off/cyclical; execution/competition/supply risk. Default to skepticism.`

const synthPrompt = (r) => `Role: SYNTHESIZER (PM). Company ${r.co.ticker} — ${r.co.name||r.co.ticker}. Layer ${r.co.layer}.
DATA: ${JSON.stringify(r.data)}
NEWS: ${JSON.stringify(r.news)}
BULL: ${JSON.stringify(r.bull)}
BEAR: ${JSON.stringify(r.bear)}
PART A: netThesis (2-4 sentences); conviction; alreadyInPrice; notInPrice; valuationEvidence (multiples vs own history + peers); keyRisk; verdict (underappreciated|fairly valued|priced-in — mispricing only); survives (true if exposure material and bear doesn't dominate, else false + dropReason).
PART B — numeric scoring (return potential ON THE MERITS, independent of the mispricing verdict). Score 0-10 each, company-specific, justified by evidence: aiExposure (demand size/directness), growth (earnings + backlog), moat (value capture/margin defensibility), valuation (risk-reward of current multiple vs growth/history/peers; 10=cheap for the growth), catalyst (durability/visibility), momentum (estimate-revision + sentiment tailwind), riskAdj (10=low risk). Also returnPotential (high|medium|low) and a one-line scoreRationale.`

const refreshPrompt = (u, prior) => `Role: REFRESH SYNTHESIZER. Existing covered company ${u.ticker} (layer ${u.layer}).
${prior && prior.scores ? `PRIOR baseline scores (ANCHOR — adjust FROM these, do NOT re-score from scratch): aiExposure ${prior.scores.aiExposure}, growth ${prior.scores.growth}, moat ${prior.scores.moat}, valuation ${prior.scores.valuation}, catalyst ${prior.scores.catalyst}, momentum ${prior.scores.momentum}, riskAdj ${prior.scores.riskAdj}; prior composite ${prior.compositeScore}, verdict ${prior.verdict}, returnPotential ${prior.returnPotential}.` : 'No prior score on record — score fresh on the merits.'}
A material development occurred in the window (${windowStart} to ${asOf}): "${u.change}" (date ${u.date||'?'}, source ${u.url||'n/a'}).
Use WebSearch/WebFetch to confirm. ${prior && prior.scores ? `Then ADJUST ONLY the sub-scores this development actually moves — typically by ±1, rarely ±2 — and KEEP the others at their prior values. Do NOT recalibrate the whole name. One weekly development should move the composite by at most a few points unless it is a genuine regime change (new anchor customer, guidance cut, accounting/regulatory shock); if it is, say so explicitly in scoreRationale and justify a larger move.` : 'Score the 7 dimensions 0-10 on the merits.'} Output ALL 7 updated scores, verdict (underappreciated|fairly valued|priced-in), conviction ('medium' unless clearly otherwise), returnPotential (high|medium|low), a one-line followup (the change + its read-through), a one-line scoreRationale (note the prior→new deltas you made and why), and a 1-2 sentence netThesis update.`

// ===== PHASE 1 · DISCOVER =====
phase('Discover')
log(`Weekly scan: ${LAYERS.length} layers, window ${windowStart} -> ${asOf}`)
const disc = (await parallel(LAYERS.map(L => () =>
  agent(discoveryPrompt(L), { label:`disc L${L.n}: ${L.name}`, phase:'Discover', schema: DISCOVERY_SCHEMA })
))).filter(Boolean)

const excluded = new Set(LAYERS.flatMap(L => L.existingTickers || []))
const seen = new Set(excluded)
const newNames = []
for (const d of disc) {
  for (const c of (d.newNames || []).slice(0, maxNew)) {
    if (!c.ticker || seen.has(c.ticker)) continue
    seen.add(c.ticker)
    newNames.push({ ...c, layer: d.layer, layerNumber: d.layerNumber })
  }
}
const updates = []
for (const d of disc) for (const u of (d.existingUpdates || [])) { if (u.ticker) updates.push({ ...u, layer: d.layer, layerNumber: d.layerNumber }) }
const toRefresh = updates.filter(u => (u.materiality || '').toLowerCase() !== 'low')
const lowMat = updates.filter(u => (u.materiality || '').toLowerCase() === 'low')
log(`Discovery: ${newNames.length} new names, ${updates.length} updates (${toRefresh.length} to rescore, ${lowMat.length} low-materiality follow-ups)`)

// ===== PHASE 2 · SCORE =====
phase('Score')
const newScored = (await pipeline(newNames,
  (co) => parallel([
    () => agent(dataPrompt(co), { label:`data:${co.ticker}`, phase:'Score', schema: DATA_SCHEMA }),
    () => agent(newsPrompt(co), { label:`news:${co.ticker}`, phase:'Score', schema: NEWS_SCHEMA }),
  ]).then(([data, news]) => ({ co, data, news })),
  (r) => parallel([
    () => agent(bullPrompt(r), { label:`bull:${r.co.ticker}`, phase:'Score', schema: BULL_SCHEMA }),
    () => agent(bearPrompt(r), { label:`bear:${r.co.ticker}`, phase:'Score', schema: BEAR_SCHEMA }),
  ]).then(([bull, bear]) => ({ ...r, bull, bear })),
  (r) => agent(synthPrompt(r), { label:`synth:${r.co.ticker}`, phase:'Score', schema: SYNTH_SCHEMA })
    .then(s => ({ ...s, ticker: r.co.ticker, layer: r.co.layer, layerNumber: r.co.layerNumber, compositeScore: composite(s.scores), _co: r.co })),
)).filter(Boolean)

const refreshed = (await parallel(toRefresh.map(u => () =>
  agent(refreshPrompt(u, priorByNorm[norm(u.ticker)]), { label:`refresh:${u.ticker}`, phase:'Score', schema: REFRESH_SCHEMA })
    .then(s => ({ ...s, ticker: u.ticker, layer: u.layer, layerNumber: u.layerNumber, compositeScore: composite(s.scores), update: u }))
))).filter(Boolean)

log(`Scored ${newScored.length} new names, refreshed ${refreshed.length} existing names`)

return { asOfDate: asOf, windowStart, lookbackDays, scoringWeights: WEIGHTS, discoveryByLayer: disc, newScored, refreshed, lowMaterialityUpdates: lowMat }
