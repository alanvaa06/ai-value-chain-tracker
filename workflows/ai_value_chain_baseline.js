export const meta = {
  name: 'ai-value-chain-baseline',
  description: 'Map AI infra value chain, build public-equity universe, adversarially thesis-test shortlist',
  whenToUse: 'One-time baseline of AI-infrastructure public equities by value-chain layer',
  phases: [
    { title: 'Map layers', detail: 'one research agent per value-chain layer, build universe + shortlist' },
    { title: 'Research', detail: 'data + news/sentiment agent per shortlisted name' },
    { title: 'Debate', detail: 'bull + bear agent per name' },
    { title: 'Synthesize', detail: 'synthesizer: verdict + 0-100 composite score, returnPotential, rank' },
  ],
}

// ---- args + defaults ----
const A = args || {}
const lookback = A.lookbackMonths || 12
const maxNames = A.maxNamesPerLayer || 4
const asOf = A.asOfDate || 'today'
const lookbackStart = A.lookbackStart || 'trailing 12 months'

const ALL_LAYERS = [
  { n: 1,  name: 'Energy & Power',                      scope: 'power generation incl. nuclear/SMR, grid/transmission, utilities serving datacenter load' },
  { n: 2,  name: 'Datacenter Buildout',                 scope: 'DC construction, datacenter REITs, cooling (liquid/immersion), electrical infrastructure (switchgear, transformers, busway)' },
  { n: 3,  name: 'Semiconductor Manufacturing Enablers',scope: 'foundry, advanced packaging (CoWoS/HBM stacking), semicap equipment (litho/etch/depo/test), specialty materials & gases' },
  { n: 4,  name: 'Compute Silicon',                     scope: 'GPUs/accelerators, custom ASICs/TPUs, host CPUs, IP cores' },
  { n: 5,  name: 'Memory & Storage',                    scope: 'HBM, DRAM, NAND/SSD/enterprise storage' },
  { n: 6,  name: 'Networking & Interconnect',           scope: 'optical transceivers, switches/NICs/DPUs, co-packaged optics, copper/fiber cabling, scale-up fabrics' },
  { n: 7,  name: 'Systems & Integration',               scope: 'server OEM/ODM, rack-scale integrators, system assemblers' },
  { n: 8,  name: 'Cloud & Compute Capacity',            scope: 'hyperscalers, neoclouds / GPU-cloud specialists, colocation capacity' },
  { n: 9,  name: 'Foundation Models',                   scope: 'mostly private labs; identify PUBLIC exposure routes (equity stakes, compute deals, distribution)' },
  { n: 10, name: 'Inference, Orchestration & Data Tooling', scope: 'inference/serving platforms, orchestration, vector/data infra, observability, MLOps' },
  { n: 11, name: 'Applications & Distribution',         scope: 'AI-native or AI-monetizing applications and distribution channels with real infra-driven economics' },
]
const LAYERS = (Array.isArray(A.layers) && A.layers.length)
  ? ALL_LAYERS.filter(L => A.layers.includes(L.n) || A.layers.includes(L.name))
  : ALL_LAYERS

// ---- schemas ----
const LAYER_SCHEMA = { type:'object', properties:{
  layer:{type:'string'}, layerNumber:{type:'number'}, requirements:{type:'string'},
  companies:{type:'array', items:{type:'object', properties:{
    ticker:{type:'string'}, exchange:{type:'string'}, name:{type:'string'},
    whatTheyDo:{type:'string'}, aiLinkage:{type:'string'},
    recentAnnouncement:{type:'object', properties:{ description:{type:'string'}, date:{type:'string'}, url:{type:'string'} }},
    aiRevShareRead:{type:'string'}
  }, required:['ticker','aiLinkage'] }},
  shortlist:{type:'array', items:{type:'string'}}
}, required:['layer','layerNumber','companies','shortlist'] }

const DATA_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'}, revenueGrowthTTM:{type:'string'}, margins:{type:'string'},
  aiInfraRevMix:{type:'string'}, valuation:{type:'string'}, valuationVsHistory:{type:'string'},
  valuationVsPeers:{type:'string'}, consensus:{type:'string'}, priceAction:{type:'string'},
  figureSourcing:{type:'array', items:{type:'object', properties:{
    figure:{type:'string'}, source:{type:'string', enum:['primary','estimated']}, ref:{type:'string'} }}}
}, required:['ticker'] }

const NEWS_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'},
  newsFlow:{type:'array', items:{type:'object', properties:{ headline:{type:'string'}, date:{type:'string'}, url:{type:'string'} }}},
  estimateRevisions:{type:'string'}, positioning:{type:'string'}, sentiment:{type:'string'}
}, required:['ticker'] }

const BULL_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'}, thesis:{type:'string'}, whyMaterial:{type:'string'},
  whyUnderappreciated:{type:'string'}, evidence:{type:'string'}
}, required:['ticker','thesis'] }

const BEAR_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'}, refutation:{type:'string'}, immaterialOrIndirect:{type:'string'},
  alreadyConsensus:{type:'string'}, catalystOneOff:{type:'string'}, executionRisk:{type:'string'}
}, required:['ticker','refutation'] }

const SYNTH_SCHEMA = { type:'object', properties:{
  ticker:{type:'string'}, netThesis:{type:'string'}, conviction:{type:'string', enum:['high','medium','low']},
  alreadyInPrice:{type:'string'}, notInPrice:{type:'string'}, valuationEvidence:{type:'string'},
  keyRisk:{type:'string'}, verdict:{type:'string', enum:['underappreciated','fairly valued','priced-in']},
  survives:{type:'boolean'}, dropReason:{type:'string'},
  returnPotential:{type:'string', enum:['high','medium','low']},
  scores:{type:'object', properties:{
    aiExposure:{type:'number'}, growth:{type:'number'}, moat:{type:'number'},
    valuation:{type:'number'}, catalyst:{type:'number'}, momentum:{type:'number'}, riskAdj:{type:'number'}
  }, required:['aiExposure','growth','moat','valuation','catalyst','momentum','riskAdj'] },
  scoreRationale:{type:'string'}
}, required:['ticker','netThesis','conviction','verdict','survives','scores','returnPotential'] }

// ---- prompts ----
const layerPrompt = (L) => `You are an equity research analyst mapping the AI-infrastructure value chain.
LAYER ${L.n}: ${L.name}. Scope: ${L.scope}.
As-of date: ${asOf}. Lookback: trailing ${lookback} months (since ${lookbackStart}).

Use WebSearch and WebFetch to verify tickers, exchanges, and recent (trailing ${lookback}mo) announcements; cite REAL source URLs with dates. If web tools are unavailable, use best knowledge but flag low confidence.

(a) Briefly map what this layer requires and its key sub-components (3-6 substantive bullets).
(b) Identify PUBLICLY LISTED companies actively building in this layer OR that made a material announcement in the trailing ${lookback} months. For each capture: ticker + exchange, company name, what they do, the SPECIFIC AI-infrastructure linkage (the concrete mechanism — NOT generic sector beta), the single most material recent announcement (description, date YYYY-MM-DD, source URL), and a first read on share of revenue tied to AI infrastructure ("<5%" / "~30%" / ">70%" / "unknown").

Then SHORTLIST the top ${maxNames} most relevant publicly listed names for deep-dive, ranked by materiality of AI-infra exposure and freshness of catalyst. Return shortlist as an array of tickers (subset of the companies above).

Rules: prefer names with traceable, specific AI-infra linkage over generic mega-caps. For layers that are mostly private (e.g. foundation models), identify PUBLIC exposure routes (equity stakes, compute/supply deals, distribution partners) and shortlist those public proxies.`

const dataPrompt = (co) => `Role: DATA agent. Company ${co.ticker} (${co.exchange||'?'}) — ${co.name||co.ticker}. Value-chain layer: ${co.layer}.
As-of ${asOf}; trailing ${lookback} months. Use WebSearch/WebFetch for current figures; cite sources.
Pull: revenue growth (TTM), gross/operating margins, an estimate of AI-infrastructure revenue mix, current valuation (key multiples), valuation vs the company's OWN history, valuation vs peers, consensus estimates (rev/EPS trajectory), and recent price action.
CRITICAL: in figureSourcing, label EVERY material figure as "primary" (from a filing/official data source — give the ref) or "estimated" (your inference). Never present an estimate as a filed fact.`

const newsPrompt = (co) => `Role: NEWS & SENTIMENT agent. Company ${co.ticker} — ${co.name||co.ticker}. Layer ${co.layer}. Trailing ${lookback} months as of ${asOf}.
Use WebSearch/WebFetch. Summarize: recent news flow (headline, date, url), analyst estimate revisions (direction + who), institutional positioning, and overall sentiment signals. Flag rumor vs confirmed.`

const bullPrompt = (r) => `Role: BULL analyst. Company ${r.co.ticker} — ${r.co.name||r.co.ticker}. Layer ${r.co.layer}.
AI-infra linkage on record: ${r.co.aiLinkage||'n/a'}.
DATA: ${JSON.stringify(r.data)}
NEWS: ${JSON.stringify(r.news)}
Construct the bull thesis: (1) why the AI-infrastructure exposure is REAL and MATERIAL — concrete mechanism and magnitude; (2) the SPECIFIC reason it looks UNDERAPPRECIATED vs the current price — what is the market missing or mispricing. Cite the evidence.`

const bearPrompt = (r) => `Role: BEAR analyst (adversarial — try to kill the thesis). Company ${r.co.ticker} — ${r.co.name||r.co.ticker}. Layer ${r.co.layer}.
DATA: ${JSON.stringify(r.data)}
NEWS: ${JSON.stringify(r.news)}
Refute the AI-infra bull case. Attack on: exposure immaterial or indirect (generic sector beta?); thesis already consensus and fully in the price; catalyst one-off or cyclical not structural; execution / competition / supply / customer-concentration risk. Default to skepticism — if the AI linkage is thin, say so bluntly.`

const synthPrompt = (r) => `Role: SYNTHESIZER (portfolio manager). Company ${r.co.ticker} — ${r.co.name||r.co.ticker}. Layer ${r.co.layer}.
DATA: ${JSON.stringify(r.data)}
NEWS: ${JSON.stringify(r.news)}
BULL: ${JSON.stringify(r.bull)}
BEAR: ${JSON.stringify(r.bear)}

PART A — adversarial synthesis (weigh bull vs bear, same method as before):
- netThesis (2-4 sentences).
- conviction: high | medium | low.
- alreadyInPrice: what the market is ALREADY pricing in (with valuation evidence).
- notInPrice: what is NOT yet in the price (the edge, if any).
- valuationEvidence: the multiples vs own history and peers that back the above.
- keyRisk: the single most important risk.
- verdict: underappreciated | fairly valued | priced-in (this measures MISPRICING only).
- survives: true if AI-infra exposure is material AND the bear case does not dominate; else false WITH a one-line dropReason.

PART B — NUMERIC SCORING for return-oriented ranking. CRITICAL: a "fairly valued" or "priced-in" verdict does NOT mean low forward return. Score forward TOTAL-RETURN potential on the merits, INDEPENDENT of the mispricing verdict. Score each dimension 0-10 (10 = best), company-specific, each justified by the DATA/NEWS/BULL/BEAR evidence:
  - aiExposure: how DIRECT and MATERIAL is AI-infrastructure revenue/linkage (10 = pure-play core driver; 0 = generic/none).
  - growth: revenue/EPS growth trajectory + backlog/order momentum (10 = durable hyper-growth).
  - moat: competitive position / value capture / margin defensibility (10 = wide moat or scarce irreplaceable asset; low = commoditized, thin margins).
  - valuation: risk-reward of the CURRENT multiple vs its growth, own history and peers (10 = cheap for the growth; 0 = priced for perfection / inverted asymmetry).
  - catalyst: strength + durability + visibility of the catalyst (10 = structural multi-year; low = one-off/cyclical).
  - momentum: estimate-revision + sentiment tailwind (10 = estimates being revised UP with room to run; low = over-owned/crowded with downward-revision risk).
  - riskAdj: INVERSE risk (10 = low execution/concentration/cyclicality/balance-sheet risk; 0 = high risk).
- returnPotential: high | medium | low — your forward ~12-month total-return potential read ON THE MERITS (NOT the mispricing verdict; a fairly-valued compounder can be 'high').
- scoreRationale: 1-2 sentences justifying the scores and naming the swing factors.`

// ===== PHASE 1 =====
phase('Map layers')
log(`Mapping ${LAYERS.length} value-chain layers (lookback ${lookback}mo, as-of ${asOf})`)
const layerResults = (await parallel(LAYERS.map(L => () =>
  agent(layerPrompt(L), { label:`L${L.n}: ${L.name}`, phase:'Map layers', schema: LAYER_SCHEMA })
))).filter(Boolean)

// build deduped shortlist with layer context
const seen = new Set()
const names = []
for (const lr of layerResults) {
  const short = (lr.shortlist || []).slice(0, maxNames)
  for (const tk of short) {
    if (!tk || seen.has(tk)) continue
    seen.add(tk)
    const co = (lr.companies || []).find(c => c.ticker === tk) || { ticker: tk }
    names.push({ ...co, layer: lr.layer, layerNumber: lr.layerNumber })
  }
}
log(`Shortlisted ${names.length} unique names across layers -> deep-dive`)

// ===== PHASE 2 ===== pipeline: research -> debate -> synthesize (each name independent)
const theses = (await pipeline(names,
  (co) => parallel([
    () => agent(dataPrompt(co), { label:`data:${co.ticker}`, phase:'Research', schema: DATA_SCHEMA }),
    () => agent(newsPrompt(co), { label:`news:${co.ticker}`, phase:'Research', schema: NEWS_SCHEMA }),
  ]).then(([data, news]) => ({ co, data, news })),
  (r) => parallel([
    () => agent(bullPrompt(r), { label:`bull:${r.co.ticker}`, phase:'Debate', schema: BULL_SCHEMA }),
    () => agent(bearPrompt(r), { label:`bear:${r.co.ticker}`, phase:'Debate', schema: BEAR_SCHEMA }),
  ]).then(([bull, bear]) => ({ ...r, bull, bear })),
  (r) => agent(synthPrompt(r), { label:`synth:${r.co.ticker}`, phase:'Synthesize', schema: SYNTH_SCHEMA })
    .then(s => ({
      ...s,
      ticker: r.co.ticker, layer: r.co.layer, layerNumber: r.co.layerNumber,
      _co: r.co, _data: r.data, _news: r.news, _bull: r.bull, _bear: r.bear,
    })),
)).filter(Boolean)

// ----- composite scoring + ranking (deterministic, transparent weights) -----
const WEIGHTS = { aiExposure:22, growth:24, moat:10, valuation:8, catalyst:12, momentum:18, riskAdj:6 }
const composite = (s) => {
  if (!s) return 0
  let total = 0
  for (const k in WEIGHTS) { const v = Math.max(0, Math.min(10, Number(s[k]) || 0)); total += v / 10 * WEIGHTS[k] }
  return Math.round(total * 10) / 10
}
for (const t of theses) { t.compositeScore = composite(t.scores) }
const ranked = theses.slice().sort((a, b) => b.compositeScore - a.compositeScore)
ranked.forEach((t, i) => { t.rank = i + 1 })

const survivors = theses.filter(t => t.survives)
const dropped   = theses.filter(t => !t.survives)
log(`Synthesis + scoring complete: ${survivors.length} survive, ${dropped.length} dropped; top: ${ranked[0] ? ranked[0].ticker + ' (' + ranked[0].compositeScore + ')' : 'n/a'}`)

return {
  config: { lookbackMonths: lookback, maxNamesPerLayer: maxNames, asOfDate: asOf, lookbackStart, layersRun: LAYERS.map(L => L.n), scoringWeights: WEIGHTS },
  layers: layerResults,
  theses: ranked,
  survivors,
  dropped,
}
