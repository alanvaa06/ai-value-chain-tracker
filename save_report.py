import json, os

# Reconstruct the AIVC_STATE from prior weekly report (2026-06-06)
state = {
  "meta": {
    "asOfDate": "2026-06-06",
    "generatedAt": "2026-06-06",
    "priorBaselineDate": "2026-06-03",
    "scoringWeights": {"aiExposure":22,"growth":24,"moat":10,"valuation":8,"catalyst":12,"momentum":18,"riskAdj":6},
    "counts": {"layers":11,"universeCompanies":104,"shortlisted":47,"survivors":42,"dropped":5}
  },
  "ranking": [
    {"rank":1,"ticker":"NVDA","layerNumber":4,"layer":"Compute Silicon","compositeScore":88,"returnPotential":"high","verdict":"fairly valued","conviction":"high","survives":True,"scores":{"aiExposure":10,"growth":10,"moat":8,"valuation":7,"catalyst":8,"momentum":9,"riskAdj":5}},
    {"rank":2,"ticker":"AVGO","layerNumber":4,"layer":"Compute Silicon","compositeScore":87.2,"returnPotential":"high","verdict":"fairly valued","conviction":"high","survives":True,"scores":{"aiExposure":10,"growth":10,"moat":8,"valuation":5,"catalyst":9,"momentum":9,"riskAdj":5}},
    {"rank":3,"ticker":"TSM","layerNumber":3,"layer":"Semiconductor Manufacturing Enablers","compositeScore":76.6,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":9,"moat":10,"valuation":6,"catalyst":7,"momentum":5,"riskAdj":5}},
    {"rank":4,"ticker":"000660.KS","layerNumber":5,"layer":"Memory & Storage","compositeScore":76.6,"returnPotential":"medium","verdict":"underappreciated","conviction":"medium","survives":True,"scores":{"aiExposure":10,"growth":9,"moat":7,"valuation":7,"catalyst":6,"momentum":6,"riskAdj":4}},
    {"rank":5,"ticker":"ALAB","layerNumber":6,"layer":"Networking & Interconnect","compositeScore":76.4,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":10,"growth":9,"moat":6,"valuation":2,"catalyst":7,"momentum":8,"riskAdj":3}},
    {"rank":6,"ticker":"VRT","layerNumber":2,"layer":"Datacenter Buildout","compositeScore":76,"returnPotential":"high","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":9,"moat":6,"valuation":4,"catalyst":8,"momentum":8,"riskAdj":4}},
    {"rank":7,"ticker":"IREN","layerNumber":8,"layer":"Cloud & Compute Capacity","compositeScore":75.6,"returnPotential":"high","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":10,"growth":8,"moat":7,"valuation":4,"catalyst":8,"momentum":7,"riskAdj":3}},
    {"rank":8,"ticker":"CRDO","layerNumber":6,"layer":"Networking & Interconnect","compositeScore":74.8,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":10,"growth":9,"moat":5,"valuation":5,"catalyst":6,"momentum":7,"riskAdj":4}},
    {"rank":9,"ticker":"EME","layerNumber":2,"layer":"Datacenter Buildout","compositeScore":74.2,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":8,"growth":9,"moat":6,"valuation":4,"catalyst":7,"momentum":8,"riskAdj":5}},
    {"rank":10,"ticker":"BESI","layerNumber":3,"layer":"Semiconductor Manufacturing Enablers","compositeScore":73.6,"returnPotential":"medium","verdict":"priced-in","conviction":"medium","survives":True,"scores":{"aiExposure":10,"growth":8,"moat":8,"valuation":2,"catalyst":7,"momentum":7,"riskAdj":3}},
    {"rank":11,"ticker":"MRVL","layerNumber":4,"layer":"Compute Silicon","compositeScore":73.4,"returnPotential":"medium","verdict":"priced-in","conviction":"medium","survives":True,"scores":{"aiExposure":10,"growth":9,"moat":7,"valuation":3,"catalyst":6,"momentum":6,"riskAdj":4}},
    {"rank":12,"ticker":"BE","layerNumber":1,"layer":"Energy & Power","compositeScore":73.2,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":9,"moat":6,"valuation":3,"catalyst":7,"momentum":7,"riskAdj":4}},
    {"rank":13,"ticker":"COHR","layerNumber":6,"layer":"Networking & Interconnect","compositeScore":73.2,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":9,"moat":6,"valuation":3,"catalyst":7,"momentum":7,"riskAdj":4}},
    {"rank":14,"ticker":"FIX","layerNumber":2,"layer":"Datacenter Buildout","compositeScore":73,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":9,"moat":5,"valuation":4,"catalyst":7,"momentum":7,"riskAdj":4}},
    {"rank":15,"ticker":"APP","layerNumber":11,"layer":"Applications & Distribution","compositeScore":72.8,"returnPotential":"high","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":5,"growth":9,"moat":7,"valuation":4,"catalyst":8,"momentum":10,"riskAdj":5}},
    {"rank":16,"ticker":"WULF","layerNumber":8,"layer":"Cloud & Compute Capacity","compositeScore":72.6,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":9,"moat":3,"valuation":3,"catalyst":6,"momentum":9,"riskAdj":3}},
    {"rank":17,"ticker":"ASML","layerNumber":3,"layer":"Semiconductor Manufacturing Enablers","compositeScore":72.4,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":7,"growth":8,"moat":10,"valuation":4,"catalyst":7,"momentum":7,"riskAdj":6}},
    {"rank":18,"ticker":"GOOGL","layerNumber":9,"layer":"Foundation Models","compositeScore":72.2,"returnPotential":"high","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":7,"growth":8,"moat":9,"valuation":5,"catalyst":7,"momentum":7,"riskAdj":6}},
    {"rank":19,"ticker":"NBIS","layerNumber":8,"layer":"Cloud & Compute Capacity","compositeScore":71.8,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":10,"growth":9,"moat":4,"valuation":4,"catalyst":7,"momentum":6,"riskAdj":3}},
    {"rank":20,"ticker":"CRWV","layerNumber":8,"layer":"Cloud & Compute Capacity","compositeScore":70.6,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":10,"growth":9,"moat":5,"valuation":4,"catalyst":6,"momentum":5,"riskAdj":3}},
    {"rank":21,"ticker":"APLD","layerNumber":8,"layer":"Cloud & Compute Capacity","compositeScore":69,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":9,"moat":3,"valuation":3,"catalyst":5,"momentum":8,"riskAdj":3}},
    {"rank":22,"ticker":"AMD","layerNumber":4,"layer":"Compute Silicon","compositeScore":69,"returnPotential":"high","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":9,"moat":5,"valuation":3,"catalyst":8,"momentum":8,"riskAdj":4}},
    {"rank":23,"ticker":"AMZN","layerNumber":9,"layer":"Foundation Models","compositeScore":68.8,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":7,"growth":7,"moat":9,"valuation":6,"catalyst":7,"momentum":6,"riskAdj":6}},
    {"rank":24,"ticker":"MSFT","layerNumber":9,"layer":"Foundation Models","compositeScore":68.6,"returnPotential":"high","verdict":"underappreciated","conviction":"medium","survives":True,"scores":{"aiExposure":6,"growth":8,"moat":9,"valuation":7,"catalyst":7,"momentum":5,"riskAdj":7}},
    {"rank":25,"ticker":"DELL","layerNumber":7,"layer":"Systems & Integration","compositeScore":68.4,"returnPotential":"medium","verdict":"priced-in","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":8,"moat":4,"valuation":4,"catalyst":6,"momentum":7,"riskAdj":4}},
    {"rank":26,"ticker":"PLTR","layerNumber":11,"layer":"Applications & Distribution","compositeScore":67.8,"returnPotential":"medium","verdict":"priced-in","conviction":"medium","survives":True,"scores":{"aiExposure":8,"growth":10,"moat":6,"valuation":2,"catalyst":6,"momentum":5,"riskAdj":4}},
    {"rank":27,"ticker":"MU","layerNumber":5,"layer":"Memory & Storage","compositeScore":67.4,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":9,"growth":8,"moat":4,"valuation":5,"catalyst":5,"momentum":7,"riskAdj":3}},
    {"rank":28,"ticker":"GEV","layerNumber":1,"layer":"Energy & Power","compositeScore":67.2,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":7,"growth":8,"moat":8,"valuation":3,"catalyst":7,"momentum":6,"riskAdj":5}},
    {"rank":29,"ticker":"MDB","layerNumber":10,"layer":"Inference, Orchestration & Data Tooling","compositeScore":66.6,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":7,"growth":8,"moat":5,"valuation":4,"catalyst":6,"momentum":9,"riskAdj":5}},
    {"rank":30,"ticker":"6669","layerNumber":7,"layer":"Systems & Integration","compositeScore":64.4,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":10,"growth":7,"moat":3,"valuation":5,"catalyst":5,"momentum":6,"riskAdj":3}},
    {"rank":31,"ticker":"CAMT","layerNumber":3,"layer":"Semiconductor Manufacturing Enablers","compositeScore":64,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":8,"growth":6,"moat":6,"valuation":4,"catalyst":6,"momentum":7,"riskAdj":5}},
    {"rank":32,"ticker":"TLN","layerNumber":1,"layer":"Energy & Power","compositeScore":63.8,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":7,"growth":7,"moat":8,"valuation":4,"catalyst":6,"momentum":6,"riskAdj":4}},
    {"rank":33,"ticker":"RMBS","layerNumber":5,"layer":"Memory & Storage","compositeScore":63.6,"returnPotential":"medium","verdict":"underappreciated","conviction":"medium","survives":True,"scores":{"aiExposure":7,"growth":6,"moat":8,"valuation":6,"catalyst":6,"momentum":5,"riskAdj":6}},
    {"rank":34,"ticker":"2317","layerNumber":7,"layer":"Systems & Integration","compositeScore":63.4,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":8,"growth":7,"moat":4,"valuation":5,"catalyst":6,"momentum":6,"riskAdj":5}},
    {"rank":35,"ticker":"CBRS","layerNumber":4,"layer":"Compute Silicon","compositeScore":63.4,"returnPotential":"medium","verdict":"priced-in","conviction":"low","survives":True,"scores":{"aiExposure":10,"growth":8,"moat":5,"valuation":1,"catalyst":6,"momentum":8,"riskAdj":2}},
    {"rank":36,"ticker":"SMCI","layerNumber":7,"layer":"Systems & Integration","compositeScore":63.2,"returnPotential":"medium","verdict":"priced-in","conviction":"medium","survives":False,"scores":{"aiExposure":10,"growth":8,"moat":2,"valuation":4,"catalyst":4,"momentum":6,"riskAdj":2}},
    {"rank":37,"ticker":"EQIX","layerNumber":2,"layer":"Datacenter Buildout","compositeScore":62.8,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":5,"growth":6,"moat":9,"valuation":4,"catalyst":6,"momentum":8,"riskAdj":6}},
    {"rank":38,"ticker":"DDOG","layerNumber":10,"layer":"Inference, Orchestration & Data Tooling","compositeScore":61.6,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":5,"growth":8,"moat":8,"valuation":3,"catalyst":6,"momentum":6,"riskAdj":5}},
    {"rank":39,"ticker":"ARM","layerNumber":4,"layer":"Compute Silicon","compositeScore":61,"returnPotential":"low","verdict":"priced-in","conviction":"medium","survives":True,"scores":{"aiExposure":6,"growth":8,"moat":8,"valuation":1,"catalyst":6,"momentum":6,"riskAdj":3}},
    {"rank":40,"ticker":"285A.T","layerNumber":5,"layer":"Memory & Storage","compositeScore":60.6,"returnPotential":"medium","verdict":"priced-in","conviction":"medium","survives":True,"scores":{"aiExposure":6,"growth":9,"moat":4,"valuation":4,"catalyst":5,"momentum":6,"riskAdj":3}},
    {"rank":41,"ticker":"SNOW","layerNumber":10,"layer":"Inference, Orchestration & Data Tooling","compositeScore":60.2,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":6,"growth":7,"moat":7,"valuation":3,"catalyst":7,"momentum":8,"riskAdj":5}},
    {"rank":42,"ticker":"RDDT","layerNumber":11,"layer":"Applications & Distribution","compositeScore":59.2,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":False,"scores":{"aiExposure":3,"growth":9,"moat":6,"valuation":5,"catalyst":5,"momentum":7,"riskAdj":4}},
    {"rank":43,"ticker":"VST","layerNumber":1,"layer":"Energy & Power","compositeScore":58.4,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":True,"scores":{"aiExposure":5,"growth":7,"moat":6,"valuation":6,"catalyst":7,"momentum":5,"riskAdj":4}},
    {"rank":44,"ticker":"SNDK","layerNumber":5,"layer":"Memory & Storage","compositeScore":55.2,"returnPotential":"low","verdict":"priced-in","conviction":"medium","survives":False,"scores":{"aiExposure":6,"growth":8,"moat":3,"valuation":3,"catalyst":4,"momentum":6,"riskAdj":3}},
    {"rank":45,"ticker":"DUOL","layerNumber":11,"layer":"Applications & Distribution","compositeScore":46.6,"returnPotential":"medium","verdict":"fairly valued","conviction":"medium","survives":False,"scores":{"aiExposure":2,"growth":7,"moat":6,"valuation":7,"catalyst":5,"momentum":3,"riskAdj":4}},
    {"rank":46,"ticker":"NNE","layerNumber":1,"layer":"Energy & Power","compositeScore":37.2,"returnPotential":"low","verdict":"priced-in","conviction":"low","survives":True,"scores":{"aiExposure":6,"growth":2,"moat":5,"valuation":1,"catalyst":3,"momentum":6,"riskAdj":2}},
    {"rank":47,"ticker":"CFLT","layerNumber":10,"layer":"Inference, Orchestration & Data Tooling","compositeScore":29.4,"returnPotential":"low","verdict":"priced-in","conviction":"medium","survives":False,"scores":{"aiExposure":4,"growth":4,"moat":6,"valuation":1,"catalyst":1,"momentum":1,"riskAdj":2}}
  ],
  "layers": [
    {"layerNumber":1,"layer":"Energy & Power","companies":[{"ticker":"TLN"},{"ticker":"VST"},{"ticker":"CEG"},{"ticker":"GEV"},{"ticker":"BE"},{"ticker":"OKLO"},{"ticker":"SMR"},{"ticker":"LEU"},{"ticker":"ETN"},{"ticker":"PWR"},{"ticker":"NNE"}]},
    {"layerNumber":2,"layer":"Datacenter Buildout","companies":[{"ticker":"VRT"},{"ticker":"GEV"},{"ticker":"FIX"},{"ticker":"EQIX"},{"ticker":"DLR"},{"ticker":"ETN"},{"ticker":"NVT"},{"ticker":"PWR"},{"ticker":"STRL"},{"ticker":"EME"}]},
    {"layerNumber":3,"layer":"Semiconductor Manufacturing Enablers","companies":[{"ticker":"TSM"},{"ticker":"ASML"},{"ticker":"BESI"},{"ticker":"CAMT"},{"ticker":"AMAT"},{"ticker":"KLAC"},{"ticker":"6146"},{"ticker":"8035"},{"ticker":"AMKR"},{"ticker":"ENTG"},{"ticker":"MU"},{"ticker":"000660"}]},
    {"layerNumber":4,"layer":"Compute Silicon","companies":[{"ticker":"NVDA"},{"ticker":"AMD"},{"ticker":"AVGO"},{"ticker":"MRVL"},{"ticker":"ARM"},{"ticker":"GOOGL"},{"ticker":"CBRS"},{"ticker":"INTC"},{"ticker":"TSM"}]},
    {"layerNumber":5,"layer":"Memory & Storage","companies":[{"ticker":"MU"},{"ticker":"000660.KS"},{"ticker":"285A.T"},{"ticker":"SNDK"},{"ticker":"STX"},{"ticker":"WDC"},{"ticker":"P"},{"ticker":"005930.KS"},{"ticker":"RMBS"}]},
    {"layerNumber":6,"layer":"Networking & Interconnect","companies":[{"ticker":"ALAB"},{"ticker":"CRDO"},{"ticker":"COHR"},{"ticker":"LITE"},{"ticker":"ANET"},{"ticker":"AVGO"},{"ticker":"MRVL"},{"ticker":"APH"},{"ticker":"FN"},{"ticker":"AAOI"},{"ticker":"NVDA"}]},
    {"layerNumber":7,"layer":"Systems & Integration","companies":[{"ticker":"DELL"},{"ticker":"SMCI"},{"ticker":"2317"},{"ticker":"2382"},{"ticker":"3231"},{"ticker":"6669"},{"ticker":"HPE"},{"ticker":"0992"},{"ticker":"PENG"}]},
    {"layerNumber":8,"layer":"Cloud & Compute Capacity","companies":[{"ticker":"CRWV"},{"ticker":"NBIS"},{"ticker":"IREN"},{"ticker":"ORCL"},{"ticker":"MSFT"},{"ticker":"AMZN"},{"ticker":"CIFR"},{"ticker":"APLD"},{"ticker":"WULF"},{"ticker":"EQIX"},{"ticker":"DLR"}]},
    {"layerNumber":9,"layer":"Foundation Models","companies":[{"ticker":"MSFT"},{"ticker":"AMZN"},{"ticker":"GOOGL"},{"ticker":"NVDA"},{"ticker":"META"},{"ticker":"CRWV"},{"ticker":"SFTBY"}]},
    {"layerNumber":10,"layer":"Inference, Orchestration & Data Tooling","companies":[{"ticker":"MDB"},{"ticker":"CFLT"},{"ticker":"DDOG"},{"ticker":"DT"},{"ticker":"ESTC"},{"ticker":"SNOW"},{"ticker":"NBIS"}]},
    {"layerNumber":11,"layer":"Applications & Distribution","companies":[{"ticker":"APP"},{"ticker":"PLTR"},{"ticker":"RDDT"},{"ticker":"DUOL"},{"ticker":"TTD"},{"ticker":"CRM"},{"ticker":"HUBS"}]}
  ],
  "survivors": ["NVDA","AVGO","TSM","000660.KS","ALAB","VRT","IREN","CRDO","EME","BESI","MRVL","BE","COHR","FIX","APP","WULF","ASML","GOOGL","NBIS","CRWV","APLD","AMD","AMZN","MSFT","DELL","PLTR","MU","GEV","MDB","6669","CAMT","TLN","RMBS","2317","CBRS","EQIX","DDOG","ARM","285A.T","SNOW","VST","NNE"],
  "dropped": ["SMCI","RDDT","SNDK","DUOL","CFLT"]
}

report_md = """# AI Value Chain — Weekly Diff · week ending 2026-06-06

*As-of 2026-06-06 · window 2026-05-30 → 2026-06-06 · vs prior baseline 2026-06-03*

**This week:** 4 new names, 7 scored changes, 3 newly-scored universe names, 11 follow-ups. Biggest move: AVGO 79→87.2. New: EME, RMBS, CBRS, NNE.

[Report body — see Drive for full text]

---
*Updated baseline written: ai_value_chain_baseline_2026-06-06.json (104 companies, 47 ranked).*

"""

state_block = "\n\n<!--AIVC_STATE\n" + json.dumps(state) + "\nAIVC_STATE-->\n"

with open("latest_report.md", "w", encoding="utf-8") as f:
    f.write(report_md + state_block)

print("Saved latest_report.md with", len(state["ranking"]), "ranked names,", len(state["layers"]), "layers")
