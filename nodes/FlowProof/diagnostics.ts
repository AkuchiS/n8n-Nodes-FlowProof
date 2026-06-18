/**
 * FlowProof diagnostics — TypeScript port of flowproof/diagnostics.py.
 *
 * SOURCE OF TRUTH is the Python (receipt-verified against a live n8n import API). This is a
 * 1:1 port; test/parity.test.ts asserts identical verdicts on the shared 20-workflow corpus.
 * Heuristic, offline, zero-dependency. No network, no API keys.
 */
import {
  communityPackage,
  isBundled,
  versionStatus,
  DEPRECATED_NODES,
} from './knownNodes';

export type Severity = 'critical' | 'high' | 'med' | 'low' | 'info';
export interface Issue {
  id: string;
  sev: Severity;
  msg: string;
  node: string | null;
  fix: string | null;
  kind?: 'manual' | 'blocker';
}
export interface Report {
  name: string;
  node_count: number;
  fidelity_score: number;
  importable: boolean;
  counts: Record<Severity, number>;
  blocker_count: number;
  manual_step_count: number;
  community_packages: string[];
  issues: Issue[];
}

const SEV_WEIGHT: Record<Severity, number> = { critical: 40, high: 18, med: 7, low: 2, info: 0 };
const BLOCKING_SEV: Severity[] = ['critical', 'high'];
const MANUAL_IDS = new Set(['community_node', 'dangling_credential', 'unknown_version']);

const SECRET_KEY = /^(api[_-]?key|apikey|access[_-]?token|token|secret|password|passwd|private[_-]?key|client[_-]?secret|authorization|auth[_-]?token|bearer|x[_-]?api[_-]?key|app[_-]?secret)$/i;
const SECRET_VALUE = /(sk-(?:live|proj|test|ant)?-?[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{12,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z\-_]{30,}|ya29\.[A-Za-z0-9\-_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
const PLACEHOLDER = /^(|x{2,}|y{3,}|your[_\- ]?.*|<.*>|\{\{.*\}\}|=.*|changeme|todo|none|null|placeholder|insert[_\- ].*|\.\.\.|sk-xxx.*)$/i;

function isExpression(val: string): boolean {
  return val.startsWith('=') || (val.includes('{{') && val.includes('}}'));
}

function looksLikeRealSecret(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.length < 8) return false;
  if (isExpression(v) || PLACEHOLDER.test(v)) return false;
  if (v.includes(' ')) return false;
  return /[A-Za-z]/.test(v) && /[0-9A-Za-z\-_/+=]{8,}/.test(v);
}

type Leaf = [string, string | null, unknown];
function walkParams(obj: unknown, path = ''): Leaf[] {
  const out: Leaf[] = [];
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const p = path ? `${path}.${k}` : String(k);
      if (v !== null && typeof v === 'object') out.push(...walkParams(v, p));
      else out.push([p, k, v]);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      const p = `${path}[${i}]`;
      if (v !== null && typeof v === 'object') out.push(...walkParams(v, p));
      else out.push([p, null, v]);
    });
  }
  return out;
}

function iterConnectionTargets(connections: unknown): Array<[string, string, string]> {
  const out: Array<[string, string, string]> = [];
  if (!connections || typeof connections !== 'object' || Array.isArray(connections)) return out;
  for (const [source, outputs] of Object.entries(connections as Record<string, unknown>)) {
    if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs)) continue;
    for (const branches of Object.values(outputs as Record<string, unknown>)) {
      if (!Array.isArray(branches)) continue;
      for (const branch of branches) {
        if (!Array.isArray(branch)) continue;
        for (const link of branch) {
          if (link && typeof link === 'object' && !Array.isArray(link) && 'node' in link) {
            out.push([source, '', (link as { node: string }).node]);
          }
        }
      }
    }
  }
  return out;
}

interface WF {
  name?: string;
  nodes?: unknown;
  connections?: unknown;
  pinData?: unknown;
  [k: string]: unknown;
}

export function diagnose(wf: WF): Report {
  const issues: Issue[] = [];
  const add = (id: string, sev: Severity, msg: string, node: string | null = null, fix: string | null = null) =>
    issues.push({ id, sev, msg, node, fix });

  const nodes = wf.nodes;
  if (!Array.isArray(nodes)) {
    add('no_nodes', 'critical', "workflow has no 'nodes' array — not a valid n8n export");
    return finalize(wf, issues, [], new Set());
  }

  const names: string[] = [];
  const seenNames = new Set<string>();
  const community = new Set<string>();

  for (let idx = 0; idx < nodes.length; idx++) {
    const node = nodes[idx] as Record<string, unknown>;
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      add('bad_node', 'high', `nodes[${idx}] is not an object`);
      continue;
    }
    const name = node.name as string | undefined;
    const ntype = node.type as string | undefined;
    const label = (name || ntype || `nodes[${idx}]`) as string;

    if (!name || typeof name !== 'string') {
      add('missing_name', 'high', "node is missing a string 'name'", label, 'give every node a unique name');
    } else {
      if (seenNames.has(name)) {
        add('duplicate_name', 'critical',
          `duplicate node name ${pyRepr(name)} — n8n keys connections by name, so duplicates silently merge/drop edges on import`,
          name, 'rename to make every node name unique');
      }
      seenNames.add(name);
      names.push(name);
    }
    if (!ntype || typeof ntype !== 'string') {
      add('missing_type', 'critical', "node has no 'type'", label);
      continue;
    }
    const pos = node.position;
    if (!(Array.isArray(pos) && pos.length === 2)) {
      add('missing_position', 'med', "node has no valid 'position' [x,y] (renders stacked at 0,0)", label, 'set a [x,y] position');
    }

    if (!isBundled(ntype)) {
      const pkg = communityPackage(ntype);
      if (pkg) {
        community.add(pkg);
        add('community_node', 'med',
          `uses community node ${pyRepr(ntype)} from package '${pkg}' — buyer must \`npm i ${pkg}\` / install it or the import shows a broken node`,
          label, `document & pin community package '${pkg}'`);
      } else {
        add('unknown_node', 'high', `unrecognized node type ${pyRepr(ntype)} (not a bundled or community pattern)`, label);
      }
    }

    if (ntype in DEPRECATED_NODES) {
      add('deprecated_node', 'med', `node type ${pyRepr(ntype)} is deprecated — migrate to ${pyRepr(DEPRECATED_NODES[ntype])}`, label, `replace with ${DEPRECATED_NODES[ntype]}`);
    }

    const [status, vmsg] = versionStatus(ntype, node.typeVersion);
    if (status === 'ahead') add('version_ahead', 'high', vmsg, label, 're-export from the n8n version you support, or pin a minimum n8n');
    else if (status === 'deprecated_syntax') add('deprecated_syntax', 'med', vmsg, label);
    else if (status === 'missing') add('no_typeversion', 'low', vmsg, label, 'set typeVersion explicitly');
    else if (status === 'unknown_version') add('unknown_version', 'info', `${vmsg} (${ntype})`, label);

    const creds = node.credentials;
    if (creds && typeof creds === 'object' && !Array.isArray(creds)) {
      for (const [ctype, ref] of Object.entries(creds as Record<string, unknown>)) {
        if (ref && typeof ref === 'object' && !Array.isArray(ref)) {
          const r = ref as Record<string, unknown>;
          const extra = Object.keys(r).filter((k) => k !== 'id' && k !== 'name').sort();
          if (extra.length) {
            add('embedded_credential', 'critical',
              `credential ${pyRepr(ctype)} embeds raw fields ${pyReprList(extra)} — this leaks secrets if shipped`,
              label, 'strip embedded credential data; export only id+name');
          }
          add('dangling_credential', 'med',
            `credential ${pyRepr(ctype)} (name=${pyRepr(r.name ?? '?')}) is referenced by id ${pyRepr(r.id ?? '?')} that won't exist on the buyer's instance — they must re-select it after import`,
            label, 'ship a credential-setup step; keep the name as a stable label');
        } else {
          add('dangling_credential', 'med', `credential ${pyRepr(ctype)} reference is malformed`, label);
        }
      }
    }

    for (const [ppath, key, value] of walkParams(node.parameters ?? {})) {
      const keyname = key !== null && key !== undefined ? key : ppath.split('.').pop()!.split('[')[0];
      const byKey = SECRET_KEY.test(String(keyname)) && looksLikeRealSecret(value);
      const byShape = typeof value === 'string' && SECRET_VALUE.test(value);
      if (byKey || byShape) {
        add('hardcoded_secret', 'critical',
          `parameter '${ppath}' looks like a hard-coded secret — never ship this; move it to a credential or $env`,
          label, 'replace value with an n8n expression / credential');
      }
    }
  }

  const nameSet = new Set(names);
  const connections = wf.connections ?? {};
  for (const [source, , target] of iterConnectionTargets(connections)) {
    if (!nameSet.has(source)) {
      add('dangling_source', 'high', `connections reference source node ${pyRepr(source)} that does not exist`, source);
    }
    if (!nameSet.has(target)) {
      add('dangling_target', 'critical',
        `connection ${pyRepr(source)} -> ${pyRepr(target)} points to a node that does not exist — edge is dropped on import (broken flow)`,
        source, 'remove the dangling connection or restore the missing node');
    }
  }

  const connected = new Set<string>();
  for (const [source, , target] of iterConnectionTargets(connections)) {
    connected.add(source);
    connected.add(target);
  }
  for (const n of names) {
    const nodeObj = (nodes as Record<string, unknown>[]).find((x) => x && typeof x === 'object' && x.name === n) ?? {};
    const ntype = (nodeObj.type as string) || '';
    const isTrigger = ntype.toLowerCase().includes('trigger') ||
      ['.start', '.manualTrigger', '.webhook'].some((s) => ntype.endsWith(s));
    if (!connected.has(n) && !isTrigger) {
      add('orphan_node', 'low', `node ${pyRepr(n)} has no connections (dead/unused in the flow)`, n);
    }
  }

  const pin = wf.pinData;
  if (pin && typeof pin === 'object' && !Array.isArray(pin) && Object.keys(pin).length) {
    add('pinned_data', 'low',
      `pinData present for ${Object.keys(pin).length} node(s) — pinned test data bloats the export and can leak sample/PII; strip before shipping`,
      null, 'remove pinData');
  }

  for (const metaKey of ['id', 'versionId', 'instanceId', 'meta']) {
    if (metaKey in wf && metaKey !== 'id') {
      add('source_metadata', 'info', `export carries source-instance metadata '${metaKey}' (cosmetic)`);
    }
  }

  return finalize(wf, issues, names, community);
}

function finalize(wf: WF, issues: Issue[], _names: string[], community: Set<string>): Report {
  const counts: Record<Severity, number> = { critical: 0, high: 0, med: 0, low: 0, info: 0 };
  let penalty = 0;
  for (const i of issues) {
    i.kind = MANUAL_IDS.has(i.id) ? 'manual' : 'blocker';
    counts[i.sev] = (counts[i.sev] || 0) + 1;
    penalty += SEV_WEIGHT[i.sev] || 0;
  }
  const score = Math.max(0, 100 - penalty);
  const blockers = issues.filter((i) => BLOCKING_SEV.includes(i.sev) && i.kind !== 'manual');
  const manual = issues.filter((i) => i.kind === 'manual');
  return {
    name: (wf.name as string) ?? '<unnamed>',
    node_count: Array.isArray(wf.nodes) ? wf.nodes.length : 0,
    fidelity_score: score,
    importable: blockers.length === 0,
    counts,
    blocker_count: blockers.length,
    manual_step_count: manual.length,
    community_packages: [...community].sort(),
    issues,
  };
}

// Mirror Python's repr() for strings inside messages: 'value' with single quotes.
function pyRepr(v: unknown): string {
  if (typeof v === 'string') return `'${v}'`;
  return String(v);
}
function pyReprList(arr: string[]): string {
  return `[${arr.map((s) => `'${s}'`).join(', ')}]`;
}
