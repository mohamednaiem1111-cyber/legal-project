// Copies the code from n8n/src/*.js (and the legal matrix) into n8n/Maat_v2.json.
// Usage:  npm run sync:n8n      (then: npm test)
// Edit the files in n8n/src, never the code inside the JSON by hand.
import fs from 'node:fs';

const root = new URL('../n8n/', import.meta.url);
const wfPath = new URL('Maat_v2.json', root);
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
// Always LF inside the workflow JSON, even when git checked the files out with CRLF (Windows).
const src = (f) => fs.readFileSync(new URL('src/' + f, root), 'utf8').replace(/\r\n/g, '\n');
const matrix = JSON.parse(src('matrix.json'));

const MAP = {
  'Guard': 'guard.js',
  'Prepare Policy': 'prepare.js',
  'Breach Processing': 'breach.js',
  'Score & Report': 'score.js',
  'ROPA Draft': 'ropa.js',
};

// --- basic matrix checks ---
const weights = matrix.axes.reduce((s, a) => s + a.weight, 0);
if (weights !== 100) throw new Error(`matrix.json: axis weights must sum to 100 (now ${weights})`);
const ids = new Set();
for (const a of matrix.axes) for (const it of a.items) {
  if (ids.has(it.id)) throw new Error('matrix.json: duplicate item id ' + it.id);
  ids.add(it.id);
  if (!['NC', 'ND'].includes(it.silence)) throw new Error('matrix.json: silence must be NC or ND for ' + it.id);
  if (/[{}]/.test(it.text)) throw new Error('matrix.json: curly braces are not allowed in item text ' + it.id);
}

let changed = 0;
for (const [node, file] of Object.entries(MAP)) {
  const n = wf.nodes.find((x) => x.name === node);
  if (!n) throw new Error('node not found in workflow: ' + node);
  let code = src(file);
  if (file === 'score.js') {
    if (!code.includes('__MATRIX__')) throw new Error('score.js must keep the __MATRIX__ placeholder');
    code = code.replace('__MATRIX__', JSON.stringify(matrix, null, 1));
  }
  if (n.parameters.jsCode !== code) { n.parameters.jsCode = code; changed++; }
}

// --- regenerate the checklist at the end of the AI Agent system prompt ---
const agent = wf.nodes.find((x) => x.name === 'AI Agent');
const MARK = 'CHECKLIST (columns: id | SILENCE | requirement)\n';
const sys = agent.parameters.options.systemMessage;
const at = sys.indexOf(MARK);
if (at < 0) throw new Error('AI Agent system prompt: checklist marker not found');
const lines = [];
for (const a of matrix.axes) for (const it of a.items) lines.push(`${it.id} | ${it.silence} | ${it.text}`);
lines.push(`${matrix.cyber.id} | ${matrix.cyber.silence} | ${matrix.cyber.text}`);
const newSys = sys.slice(0, at) + MARK + lines.join('\n') + '\n';
if (/[{}]/.test(newSys)) throw new Error('system prompt must not contain curly braces');
if (newSys !== sys) { agent.parameters.options.systemMessage = newSys; changed++; }

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log(changed ? `Maat_v2.json updated (${changed} part(s) changed). Now run: npm test` : 'Maat_v2.json already in sync.');
