// Extracts the embedded machine-state JSON (AIVC_STATE block) from a markdown report.
// The report markdown carries its own structured state in an HTML comment, so Google Drive
// only ever holds markdown files — no separate JSON. usage:
//   node builders/extract_state.js <report.md> [out.json]
const fs = require('fs');
const MD = process.argv[2];
const OUT = process.argv[3] || 'prior_baseline.json';
if (!MD) { console.error('usage: node builders/extract_state.js <report.md> [out.json]'); process.exit(1); }

const s = fs.readFileSync(MD, 'utf8');
const m = s.match(/<!--AIVC_STATE\s*([\s\S]*?)\s*AIVC_STATE-->/);
if (!m) { console.error('No AIVC_STATE block found in ' + MD + ' — is this a report produced by this toolchain?'); process.exit(1); }

let state;
try { state = JSON.parse(m[1]); }
catch (e) { console.error('AIVC_STATE block is not valid JSON: ' + e.message); process.exit(1); }

fs.writeFileSync(OUT, JSON.stringify(state, null, 2), 'utf8');
console.log('extracted state -> ' + OUT + ' | ' + ((state.ranking || []).length) + ' ranked names, ' + ((state.layers || []).length) + ' layers, asOf ' + ((state.meta || {}).asOfDate || '?'));
