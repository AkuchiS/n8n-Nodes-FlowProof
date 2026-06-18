import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import { diagnose, Report } from './diagnostics';

export class FlowProof implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'FlowProof',
    name: 'flowProof',
    icon: 'file:flowproof.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{ $parameter["operation"] }}',
    description: 'Validate that an n8n workflow export imports cleanly — offline, no API, no network.',
    defaults: { name: 'FlowProof' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [], // by design: never any credential, never any external call
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Check', value: 'check', description: 'Full diagnostic report', action: 'Diagnose import breakers' },
          { name: 'Verify', value: 'verify', description: 'Pass/fail verdict + blockers', action: 'Pass or fail verdict' },
        ],
        default: 'check',
      },
      {
        displayName: 'Workflow JSON',
        name: 'workflowJson',
        type: 'json',
        default: '={{ $json }}',
        description: 'The exported n8n workflow JSON to validate (single workflow, an export-all array, or a {workflows:[...]} wrapper)',
        required: true,
      },
      {
        displayName: 'Fail Node on NOT-Importable',
        name: 'failOnBlocker',
        type: 'boolean',
        default: false,
        description: 'Whether to throw (stop the run) when the workflow is not importable, so this node can gate a deploy',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const out: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string;
      const failOnBlocker = this.getNodeParameter('failOnBlocker', i) as boolean;
      const raw = this.getNodeParameter('workflowJson', i);

      let wf: { nodes?: unknown[]; connections?: Record<string, unknown> };
      try {
        wf = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
      } catch (err) {
        throw new NodeOperationError(this.getNode(), 'Workflow JSON is not valid JSON', { itemIndex: i });
      }

      const report: Report = diagnose(wf as { nodes?: any[] });

      if (failOnBlocker && !report.importable) {
        throw new NodeOperationError(
          this.getNode(),
          `FlowProof: not importable — ${report.blocker_count} blocker(s)`,
          { itemIndex: i },
        );
      }

      const json =
        operation === 'verify'
          ? {
              workflow: (wf as any)?.name ?? null,
              importable: report.importable,
              fidelity_score: report.fidelity_score,
              blockers: report.issues.filter((x) => x.kind === 'blocker'),
              manual_steps: report.manual_step_count,
            }
          : report;

      out.push({ json: json as any, pairedItem: { item: i } });
    }

    return [out];
  }
}
