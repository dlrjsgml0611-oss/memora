import type {
  LegacyMindMapNode,
  MindmapDocumentV2,
  MindmapEdgeV2,
  MindmapNodeV2,
  MindmapV2,
} from '@/types/learning-space';

function toStringValue(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

function clampFinite(value: unknown, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(min, Math.min(max, numeric));
}

function makeNodeId(index: number) {
  return `node-${index + 1}`;
}

function isLegacyNode(value: unknown): value is LegacyMindMapNode {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as { name?: unknown }).name === 'string';
}

function sanitizeMindmapNode(raw: Partial<MindmapNodeV2>, index: number): MindmapNodeV2 {
  const id = toStringValue(raw.id, makeNodeId(index));
  const label = toStringValue(raw.label, `노드 ${index + 1}`);
  const parentId = raw.parentId === null
    ? null
    : typeof raw.parentId === 'string' && raw.parentId.trim().length > 0
      ? raw.parentId
      : undefined;

  const node: MindmapNodeV2 = {
    id,
    label,
    parentId,
  };

  if (typeof raw.image === 'string' && raw.image.trim().length > 0) {
    node.image = raw.image.trim();
  }

  const x = clampFinite(raw.position?.x, -20000, 20000);
  const y = clampFinite(raw.position?.y, -20000, 20000);
  if (x !== undefined && y !== undefined) {
    node.position = { x, y };
  }

  const depth = clampFinite(raw.depth, 0, 20);
  if (depth !== undefined) {
    node.depth = Math.round(depth);
  }

  return node;
}

function sanitizeMindmapEdge(raw: Partial<MindmapEdgeV2>, index: number): MindmapEdgeV2 {
  const sourceId = toStringValue(raw.sourceId, '');
  const targetId = toStringValue(raw.targetId, '');
  const id = toStringValue(raw.id, `edge-${sourceId || 'x'}-${targetId || 'y'}-${index + 1}`);
  const strength = clampFinite(raw.strength, 0, 1);

  const edge: MindmapEdgeV2 = {
    id,
    sourceId,
    targetId,
  };

  if (typeof raw.label === 'string' && raw.label.trim().length > 0) {
    edge.label = raw.label.trim();
  }
  if (strength !== undefined) {
    edge.strength = Number(strength.toFixed(2));
  }

  return edge;
}

export function hierarchyToMindmapV2(root: LegacyMindMapNode): MindmapV2 {
  const nodes: MindmapNodeV2[] = [];
  const edges: MindmapEdgeV2[] = [];

  let sequence = 0;
  const walk = (node: LegacyMindMapNode, parentId: string | null, depth: number) => {
    const id = toStringValue(node.id, makeNodeId(sequence));
    const currentNode = sanitizeMindmapNode(
      {
        id,
        label: node.name,
        image: node.image,
        parentId,
        position: {
          x: node.fx ?? 0,
          y: node.fy ?? 0,
        },
        depth,
      },
      sequence
    );
    nodes.push(currentNode);
    sequence += 1;

    if (parentId) {
      edges.push(
        sanitizeMindmapEdge(
          {
            sourceId: parentId,
            targetId: id,
            strength: 0.7,
          },
          edges.length
        )
      );
    }

    (node.children || []).forEach((child) => {
      walk(child, id, depth + 1);
    });
  };

  walk(root, null, 0);

  const rootNodeId = nodes[0]?.id || 'root';
  if (nodes.length === 0) {
    nodes.push({ id: rootNodeId, label: '새 마인드맵', parentId: null, depth: 0 });
  } else {
    nodes[0] = { ...nodes[0], parentId: null, depth: 0 };
  }

  return {
    version: 'v2',
    rootNodeId,
    nodes,
    edges,
    layout: { type: 'radial' },
  };
}

export function mindmapV2ToHierarchy(mindmap: MindmapV2): LegacyMindMapNode {
  const nodeMap = new Map<string, LegacyMindMapNode>();

  mindmap.nodes.forEach((node) => {
    nodeMap.set(node.id, {
      id: node.id,
      name: node.label,
      image: node.image,
      children: [],
      fx: node.position?.x,
      fy: node.position?.y,
    });
  });

  const rootId = nodeMap.has(mindmap.rootNodeId)
    ? mindmap.rootNodeId
    : mindmap.nodes[0]?.id;

  if (!rootId) {
    return { id: 'root', name: '새 마인드맵', children: [] };
  }

  const childByParent = new Map<string, string[]>();
  mindmap.edges.forEach((edge) => {
    if (!nodeMap.has(edge.sourceId) || !nodeMap.has(edge.targetId)) return;
    const list = childByParent.get(edge.sourceId) || [];
    if (!list.includes(edge.targetId)) list.push(edge.targetId);
    childByParent.set(edge.sourceId, list);
  });

  const build = (id: string, path: Set<string>): LegacyMindMapNode => {
    const current = nodeMap.get(id) || { id, name: id, children: [] };
    if (path.has(id)) {
      return {
        id: current.id,
        name: current.name,
        image: current.image,
        children: [],
        fx: current.fx,
        fy: current.fy,
      };
    }

    const nextPath = new Set(path);
    nextPath.add(id);
    const childIds = childByParent.get(id) || [];

    const children = childIds.map((childId) => build(childId, nextPath));
    return {
      id: current.id,
      name: current.name,
      image: current.image,
      children: children.length > 0 ? children : undefined,
      fx: current.fx,
      fy: current.fy,
    };
  };

  return build(rootId, new Set());
}

export function normalizeMindmapV2(input: unknown): MindmapV2 {
  if (input && typeof input === 'object') {
    const candidate = input as Partial<MindmapV2>;
    if (Array.isArray(candidate.nodes)) {
      const nodes = candidate.nodes.map((node, index) => sanitizeMindmapNode(node, index));
      const nodeIds = new Set(nodes.map((node) => node.id));
      const edges = Array.isArray(candidate.edges)
        ? candidate.edges
            .map((edge, index) => sanitizeMindmapEdge(edge, index))
            .filter((edge) => edge.sourceId && edge.targetId && nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId))
        : [];

      const rootNodeId = nodeIds.has(candidate.rootNodeId || '')
        ? (candidate.rootNodeId as string)
        : nodes[0]?.id || 'root';

      if (nodes.length === 0) {
        nodes.push({ id: rootNodeId, label: '새 마인드맵', parentId: null, depth: 0 });
      }

      return {
        version: 'v2',
        rootNodeId,
        nodes,
        edges,
        layout: {
          type: candidate.layout?.type || 'radial',
        },
      };
    }
  }

  if (isLegacyNode(input)) {
    return hierarchyToMindmapV2(input);
  }

  return {
    version: 'v2',
    rootNodeId: 'root',
    nodes: [{ id: 'root', label: '새 마인드맵', parentId: null, depth: 0 }],
    edges: [],
    layout: { type: 'radial' },
  };
}

export function normalizeMindmapDocumentV2<T extends { _id?: unknown; title?: string; structure?: unknown; mindmap?: unknown; createdAt?: unknown; updatedAt?: unknown }>(
  source: T
): MindmapDocumentV2 {
  const mindmap = normalizeMindmapV2(source.mindmap ?? source.structure);
  return {
    _id: String(source._id || ''),
    title: toStringValue(source.title, '새 마인드맵'),
    mindmap,
    structure: mindmapV2ToHierarchy(mindmap),
    schemaVersion: 'v2',
    createdAt: source.createdAt ? String(source.createdAt) : undefined,
    updatedAt: source.updatedAt ? String(source.updatedAt) : undefined,
  };
}
