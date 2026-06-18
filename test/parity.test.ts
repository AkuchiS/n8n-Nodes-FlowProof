/**
 * Parity test — asserts the TypeScript diagnose() returns the SAME verdict as the Python
 * FlowProof CLI on every workflow in the shared corpus. This is what keeps the "0 mismatches
 * vs live n8n import" receipt true for the node.
 *
 *   node dist-parity/test/parity.test.js <corpusDir> <flowproofDir>
 */
import { readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { diagnose } from '../nodes/FlowProof/diagnostics';

const corpusDir = process.argv[2];
const fpDir = process.argv[3];

function loadWorkflows(text: string): any[] {
  const d = JSON.parse(text);
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') {
    if (Array.isArray((d as any).workflows)) return (d as any).workflows;
    return [d];
  }
  return [];
}

function sig(r: any) {
  return {
    importable: r.importable,
    fidelity: r.fidelity_score,
    blockers: r.blocker_count,
    manual: r.manual_step_count,
    pkgs: (r.community_packages || []).join(','),
    issues: (r.issues || []).map((i: any) => `${i.id}|${i.sev}|${i.node}`).sort().join(';'),
  };
}

function eq(a: any, b: any): string[] {
  const diffs: string[] = [];
  for (const k of Object.keys(a)) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs.push(`${k}: TS=${JSON.stringify(a[k])} vs PY=${JSON.stringify(b[k])}`);
  }
  return diffs;
}

const files = readdirSync(corpusDir).filter((f) => f.endsWith('.json')).sort();
let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const f of files) {
  const path = join(corpusDir, f);
  const text = readFileSync(path, 'utf8');
  const tsReports = loadWorkflows(text).map(diagnose).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  let pyRaw: string;
  try {
    pyRaw = execSync(`python3 flowproof_cli.py check "${path}" --json`, { cwd: fpDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e: any) {
    // flowproof exits 2 when a workflow is not importable — stdout is still the valid JSON report.
    if (e && typeof e.stdout === 'string' && e.stdout.trim()) pyRaw = e.stdout;
    else throw e;
  }
  const pyParsed = JSON.parse(pyRaw);
  const pyReports = (Array.isArray(pyParsed) ? pyParsed : [pyParsed]).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

  let fileDiffs: string[] = [];
  if (tsReports.length !== pyReports.length) {
    fileDiffs.push(`workflow count TS=${tsReports.length} vs PY=${pyReports.length}`);
  } else {
    for (let i = 0; i < tsReports.length; i++) {
      const d = eq(sig(tsReports[i]), sig(pyReports[i]));
      if (d.length) fileDiffs.push(`wf[${i}] "${tsReports[i].name}": ${d.join('; ')}`);
    }
  }
  if (fileDiffs.length === 0) {
    pass++;
    console.log(`  PASS ${f}`);
  } else {
    fail++;
    failures.push(`FAIL ${f}\n    ${fileDiffs.join('\n    ')}`);
    console.log(`  FAIL ${f}`);
  }
}

console.log(`\n== parity: ${pass} pass / ${fail} fail over ${files.length} corpus workflows ==`);
if (failures.length) {
  console.log('\n' + failures.join('\n'));
  process.exit(1);
}
process.exit(0);
