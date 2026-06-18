// Self-contained smoke test for `npm test` — no corpus, no network, no Python.
// Exercises the built diagnose() on inline fixtures. (The deeper 20-workflow
// parity test vs the Python engine is test/parity.test.ts — run it in CI with
// the corpus; see README / DECISION_AND_PLAN.md.)
const assert = require('assert');
const { diagnose } = require('../dist/nodes/FlowProof/diagnostics.js');

let pass = 0;
function check(name, cond) {
  assert.ok(cond, 'FAIL: ' + name);
  console.log('  ok ' + name);
  pass++;
}

// 1) a clean workflow imports
const clean = {
  name: 'clean',
  nodes: [
    { name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
    { name: 'Edit', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [200, 0], parameters: {} },
  ],
  connections: { Start: { main: [[{ node: 'Edit', type: 'main', index: 0 }]] } },
};
let r = diagnose(clean);
check('clean workflow is importable', r.importable === true);
check('clean workflow has 0 blockers', r.blocker_count === 0);

// 2) a hard-coded secret is a critical blocker
const leak = {
  name: 'leak',
  nodes: [{ name: 'A', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [0, 0], parameters: { token: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWX12345' } }],
  connections: {},
};
r = diagnose(leak);
check('hard-coded secret -> not importable', r.importable === false);
check('hard-coded secret -> flagged as hardcoded_secret', r.issues.some((i) => i.id === 'hardcoded_secret'));

// 3) a community node is detected (manual setup, not a false blocker)
const comm = {
  name: 'community',
  nodes: [{ name: 'D', type: 'n8n-nodes-discord.discord', typeVersion: 1, position: [0, 0], parameters: {} }],
  connections: {},
};
r = diagnose(comm);
check('community node -> package detected', r.community_packages.includes('n8n-nodes-discord'));

console.log('\nsmoke: ' + pass + ' checks passed');
