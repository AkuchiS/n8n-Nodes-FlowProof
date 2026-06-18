/**
 * FlowProof — n8n node knowledge base (TypeScript port of flowproof/known_nodes.py).
 * SOURCE OF TRUTH is the Python; this is a 1:1 port kept in parity by test/parity.test.ts.
 * Pure data + pure functions, no dependencies.
 */

export const BUNDLED_PREFIXES = ['n8n-nodes-base.', '@n8n/n8n-nodes-langchain.'];

// type -> highest typeVersion this knowledge base knows about.
export const MAX_TYPE_VERSION: Record<string, number> = {
  'n8n-nodes-base.httpRequest': 4.2,
  'n8n-nodes-base.webhook': 2.0,
  'n8n-nodes-base.respondToWebhook': 1.1,
  'n8n-nodes-base.set': 3.4,
  'n8n-nodes-base.code': 2.0,
  'n8n-nodes-base.if': 2.2,
  'n8n-nodes-base.switch': 3.2,
  'n8n-nodes-base.merge': 3.1,
  'n8n-nodes-base.filter': 2.2,
  'n8n-nodes-base.noOp': 1.0,
  'n8n-nodes-base.stopAndError': 1.0,
  'n8n-nodes-base.wait': 1.1,
  'n8n-nodes-base.splitInBatches': 3.0,
  'n8n-nodes-base.aggregate': 1.0,
  'n8n-nodes-base.removeDuplicates': 2.0,
  'n8n-nodes-base.itemLists': 3.1,
  'n8n-nodes-base.splitOut': 1.0,
  'n8n-nodes-base.limit': 1.0,
  'n8n-nodes-base.sort': 1.0,
  'n8n-nodes-base.dateTime': 2.0,
  'n8n-nodes-base.html': 1.2,
  'n8n-nodes-base.xml': 1.0,
  'n8n-nodes-base.crypto': 1.0,
  'n8n-nodes-base.manualTrigger': 1.0,
  'n8n-nodes-base.scheduleTrigger': 1.2,
  'n8n-nodes-base.executeWorkflow': 1.1,
  'n8n-nodes-base.executeWorkflowTrigger': 1.0,
  'n8n-nodes-base.errorTrigger': 1.0,
  'n8n-nodes-base.readWriteFile': 1.0,
  'n8n-nodes-base.editImage': 1.0,
  'n8n-nodes-base.compression': 1.1,
  'n8n-nodes-base.emailSend': 2.1,
  'n8n-nodes-base.emailReadImap': 2.0,
  'n8n-nodes-base.gmail': 2.1,
  'n8n-nodes-base.googleSheets': 4.5,
  'n8n-nodes-base.googleDrive': 3.0,
  'n8n-nodes-base.googleCalendar': 1.2,
  'n8n-nodes-base.slack': 2.3,
  'n8n-nodes-base.telegram': 1.2,
  'n8n-nodes-base.discord': 2.0,
  'n8n-nodes-base.notion': 2.2,
  'n8n-nodes-base.airtable': 2.1,
  'n8n-nodes-base.github': 1.0,
  'n8n-nodes-base.postgres': 2.5,
  'n8n-nodes-base.mySql': 2.4,
  'n8n-nodes-base.mongoDb': 1.1,
  'n8n-nodes-base.redis': 1.0,
  'n8n-nodes-base.rssFeedRead': 1.1,
  'n8n-nodes-base.ftp': 1.0,
  'n8n-nodes-base.ssh': 1.0,
  'n8n-nodes-base.x': 2.0,
  'n8n-nodes-base.openAi': 1.8,
  '@n8n/n8n-nodes-langchain.agent': 1.7,
  '@n8n/n8n-nodes-langchain.chatTrigger': 1.1,
  '@n8n/n8n-nodes-langchain.lmChatOpenAi': 1.0,
  '@n8n/n8n-nodes-langchain.openAi': 1.4,
  '@n8n/n8n-nodes-langchain.memoryBufferWindow': 1.3,
  '@n8n/n8n-nodes-langchain.outputParserStructured': 1.2,
  '@n8n/n8n-nodes-langchain.toolWorkflow': 1.2,
  '@n8n/n8n-nodes-langchain.vectorStoreInMemory': 1.0,
  // Corpus-grown 2026-06-12 (improve cycle 1): versions OBSERVED in the QC corpus.
  '@n8n/n8n-nodes-langchain.googleGemini': 1.0,
  '@n8n/n8n-nodes-langchain.lmChatGoogleGemini': 1.0,
  '@n8n/n8n-nodes-langchain.lmChatGroq': 1.0,
  '@n8n/n8n-nodes-langchain.memoryMongoDbChat': 1.0,
  '@n8n/n8n-nodes-langchain.toolCode': 1.3,
  '@n8n/n8n-nodes-langchain.toolWikipedia': 1.0,
  'n8n-nodes-base.activeCampaignTrigger': 1.0,
  'n8n-nodes-base.acuitySchedulingTrigger': 1.0,
  'n8n-nodes-base.affinityTrigger': 1.0,
  'n8n-nodes-base.cryptoTool': 1.0,
  'n8n-nodes-base.dateTimeTool': 2.0,
  'n8n-nodes-base.gmailTrigger': 1.2,
  'n8n-nodes-base.httpRequestTool': 4.2,
  'n8n-nodes-base.perplexity': 1.0,
  'n8n-nodes-base.rssFeedReadTool': 1.2,
  'n8n-nodes-base.stickyNote': 1.0,
  'n8n-nodes-base.telegramTrigger': 1.2,
  'n8n-nodes-base.writeBinaryFile': 1.0,
};

export const DEPRECATED_NODES: Record<string, string> = {
  'n8n-nodes-base.function': 'n8n-nodes-base.code',
  'n8n-nodes-base.functionItem': 'n8n-nodes-base.code',
  'n8n-nodes-base.start': 'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.cron': 'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.interval': 'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.htmlExtract': 'n8n-nodes-base.html',
  'n8n-nodes-base.renameKeys': 'n8n-nodes-base.set',
  'n8n-nodes-base.twitter': 'n8n-nodes-base.x',
  'n8n-nodes-base.moveBinaryData': 'n8n-nodes-base.code',
};

export const DEPRECATED_SYNTAX_BELOW: Record<string, number> = {
  'n8n-nodes-base.httpRequest': 4.0,
  'n8n-nodes-base.set': 2.0,
  'n8n-nodes-base.if': 2.0,
  'n8n-nodes-base.switch': 2.0,
  'n8n-nodes-base.merge': 2.0,
  'n8n-nodes-base.itemLists': 3.0,
};

export function isBundled(nodeType: string): boolean {
  return !!nodeType && BUNDLED_PREFIXES.some((p) => nodeType.startsWith(p));
}

export function communityPackage(nodeType: string): string | null {
  if (!nodeType || isBundled(nodeType)) return null;
  if (nodeType.startsWith('@')) {
    // @scope/package.nodeName -> @scope/package
    const idx = nodeType.lastIndexOf('.');
    return idx === -1 ? nodeType : nodeType.slice(0, idx);
  }
  const idx = nodeType.indexOf('.');
  return idx === -1 ? nodeType : nodeType.slice(0, idx);
}

export type VersionStatus = 'ok' | 'ahead' | 'deprecated_syntax' | 'unknown_version' | 'missing';

export function versionStatus(nodeType: string, typeVersion: unknown): [VersionStatus, string] {
  if (typeVersion === null || typeVersion === undefined) {
    return ['missing', 'node has no typeVersion (older export; may import at v1)'];
  }
  const tv = typeof typeVersion === 'number' ? typeVersion : Number(typeVersion);
  if (Number.isNaN(tv)) {
    return ['missing', `typeVersion is not numeric: ${JSON.stringify(typeVersion)}`];
  }
  const known = MAX_TYPE_VERSION[nodeType];
  if (known === undefined) {
    return ['unknown_version', 'version not in knowledge base (cannot vet drift)'];
  }
  if (tv > known) {
    return ['ahead', `typeVersion ${tv} is newer than known max ${known} (exported from a newer n8n; will fail on older instances)`];
  }
  const floor = DEPRECATED_SYNTAX_BELOW[nodeType];
  if (floor !== undefined && tv < floor) {
    return ['deprecated_syntax', `typeVersion ${tv} uses the pre-${floor} parameter schema (silently mis-maps on current n8n)`];
  }
  return ['ok', `typeVersion ${tv} within supported range (<= ${known})`];
}
