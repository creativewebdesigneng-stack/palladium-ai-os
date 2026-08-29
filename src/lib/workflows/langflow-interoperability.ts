type AnyRecord = Record<string, unknown>;

type ImportedStep = {
  kind: 'agent' | 'approval' | 'delay' | 'notification';
  name: string;
  mode: 'sequential';
  position: number;
  agent_id?: string | null;
  config: Record<string, unknown>;
};

const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|client[_-]?secret)/i;

function isObject(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown, max = 500) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F]/g, ' ').trim().slice(0, max) : '';
}

function safeObject(value: unknown, depth = 0): Record<string, unknown> {
  if (!isObject(value) || depth > 4) return {};
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value).slice(0, 40)) {
    if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key) || SECRET_KEY.test(key)) continue;
    if (raw == null || typeof raw === 'boolean' || typeof raw === 'number') output[key] = raw;
    else if (typeof raw === 'string') output[key] = raw.slice(0, 2000);
    else if (Array.isArray(raw)) output[key] = raw.slice(0, 20).filter((item) => typeof item === 'string').map(String);
    else if (isObject(raw)) output[key] = safeObject(raw, depth + 1);
  }
  return output;
}

function nodeData(node: AnyRecord) {
  return isObject(node['data']) ? node['data'] : {};
}

function nodeType(node: AnyRecord) {
  const data = nodeData(node);
  const nested = isObject(data['node']) ? data['node'] : {};
  return cleanString(data['type'] ?? nested['type'] ?? nested['display_name'] ?? node['type'] ?? node['id'], 180).toLowerCase();
}

function nodeName(node: AnyRecord, index: number) {
  const data = nodeData(node);
  const nested = isObject(data['node']) ? data['node'] : {};
  return cleanString(data['display_name'] ?? nested['display_name'] ?? data['type'] ?? node['id'], 120) || `Langflow node ${index + 1}`;
}

function extractGraph(value: AnyRecord) {
  const data = isObject(value['data']) ? value['data'] : value;
  return {
    nodes: Array.isArray(data['nodes']) ? data['nodes'].filter(isObject).slice(0, 100) : [],
    edges: Array.isArray(data['edges']) ? data['edges'].filter(isObject).slice(0, 200) : [],
  };
}

export function isLangflowWorkflowDefinition(value: unknown) {
  if (!isObject(value)) return false;
  const graph = extractGraph(value);
  return graph.nodes.length > 0 && graph.nodes.some((node) => isObject(node['data'])) && !Array.isArray(value['steps']);
}

export function adaptLangflowWorkflowDefinition(value: unknown) {
  if (!isLangflowWorkflowDefinition(value)) return value;
  const definition = value as AnyRecord;
  const { nodes, edges } = extractGraph(definition);
  const idToName = new Map(nodes.map((node, index) => [cleanString(node['id'], 180), nodeName(node, index)]));
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    const source = cleanString(edge['source'], 180);
    const target = cleanString(edge['target'], 180);
    if (!source || !target) continue;
    incoming.set(target, [...(incoming.get(target) ?? []), idToName.get(source) ?? source]);
  }

  const steps: ImportedStep[] = [];
  const skipped: string[] = [];
  for (const [index, node] of nodes.entries()) {
    const type = nodeType(node);
    const name = nodeName(node, index);
    const id = cleanString(node['id'], 180);
    const data = nodeData(node);

    if (/chatinput|textinput|inputnode|input$|prompt/.test(type)) {
      skipped.push(name);
      continue;
    }
    if (/wait|delay|sleep/.test(type)) {
      steps.push({ kind: 'delay', name, mode: 'sequential', position: steps.length, config: { duration_ms: 1000, source: 'langflow-import', source_type: type } });
      continue;
    }
    if (/approval|human.*input|human.*review/.test(type)) {
      steps.push({ kind: 'approval', name, mode: 'sequential', position: steps.length, config: { source: 'langflow-import', source_type: type } });
      continue;
    }
    if (/chatoutput|outputnode|notification/.test(type)) {
      steps.push({ kind: 'notification', name, mode: 'sequential', position: steps.length, config: { source: 'langflow-import', source_type: type, message: `Langflow output: ${name}` } });
      continue;
    }

    const template = isObject(data['node']) && isObject((data['node'] as AnyRecord)['template'])
      ? safeObject((data['node'] as AnyRecord)['template'])
      : safeObject(data['template']);
    steps.push({
      kind: 'agent',
      name,
      mode: 'sequential',
      position: steps.length,
      agent_id: null,
      config: {
        source: 'langflow-import',
        source_node_id: id,
        source_type: type || 'component',
        upstream: incoming.get(id) ?? [],
        template,
      },
    });
  }

  if (!steps.length) throw new Error('The Langflow flow has no executable components that can be translated safely.');
  if (steps.length > 25) throw new Error(`This Langflow flow translates to ${steps.length} executable components. PalladiumAI workflows are limited to 25 steps; simplify the flow before importing.`);

  return {
    name: cleanString(definition['name'], 120) || 'Imported Langflow flow',
    description: cleanString(definition['description'], 1000) || `Imported from Langflow. ${skipped.length} input/prompt component${skipped.length === 1 ? '' : 's'} folded into the draft graph.`,
    trigger_type: 'manual',
    schedule: null,
    steps,
  };
}
