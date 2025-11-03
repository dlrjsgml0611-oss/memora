'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import EditNodeModal from './EditNodeModal';

interface MindMapNode {
  id: string;
  name: string;
  image?: string;
  children?: MindMapNode[];
  _children?: MindMapNode[];
  x?: number;
  y?: number;
  depth?: number;
}

interface MindMapVisualizationProps {
  data: MindMapNode;
  width?: number;
  height?: number;
  onNodeUpdate?: (nodeId: string, data: { name: string; image?: string }) => void;
  onNodeDelete?: (nodeId: string) => void;
}

export default function MindMapVisualization({
  data,
  width = 1200,
  height = 800,
  onNodeUpdate,
  onNodeDelete
}: MindMapVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<MindMapNode | null>(null);
  const [mindmapData, setMindmapData] = useState<MindMapNode>(data);

  useEffect(() => {
    setMindmapData(data);
  }, [data]);

  const handleNodeSave = (nodeId: string, updatedData: { name: string; image?: string }) => {
    // Update the local state
    const updateNodeRecursive = (node: MindMapNode): MindMapNode => {
      if (node.id === nodeId) {
        return { ...node, ...updatedData };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodeRecursive)
        };
      }
      return node;
    };

    const updatedMindmapData = updateNodeRecursive(mindmapData);
    setMindmapData(updatedMindmapData);

    // Call the parent's onNodeUpdate if provided
    if (onNodeUpdate) {
      onNodeUpdate(nodeId, updatedData);
    }

    setEditingNode(null);
  };

  const handleNodeDelete = (nodeId: string) => {
    // Delete the node from local state
    const deleteNodeRecursive = (node: MindMapNode): MindMapNode | null => {
      if (node.id === nodeId) {
        return null;
      }
      if (node.children) {
        const filteredChildren = node.children
          .map(deleteNodeRecursive)
          .filter((child): child is MindMapNode => child !== null);
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : undefined
        };
      }
      return node;
    };

    const updatedMindmapData = deleteNodeRecursive(mindmapData);
    if (updatedMindmapData) {
      setMindmapData(updatedMindmapData);
    }

    // Call the parent's onNodeDelete if provided
    if (onNodeDelete) {
      onNodeDelete(nodeId);
    }

    setEditingNode(null);
  };

  useEffect(() => {
    if (!svgRef.current || !mindmapData) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    // Create tree layout
    const tree = d3.tree<MindMapNode>()
      .size([2 * Math.PI, Math.min(width, height) / 2 - 100])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth!);

    // Create hierarchy
    const root = d3.hierarchy(mindmapData);
    tree(root as any);

    // Add links
    g.selectAll('.link')
      .data((root as any).links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        const sourceAngle = d.source.x;
        const sourceRadius = d.source.y;
        const targetAngle = d.target.x;
        const targetRadius = d.target.y;

        const sourceX = sourceRadius * Math.cos(sourceAngle - Math.PI / 2);
        const sourceY = sourceRadius * Math.sin(sourceAngle - Math.PI / 2);
        const targetX = targetRadius * Math.cos(targetAngle - Math.PI / 2);
        const targetY = targetRadius * Math.sin(targetAngle - Math.PI / 2);

        return `M${sourceX},${sourceY}C${sourceX},${sourceY} ${targetX},${targetY} ${targetX},${targetY}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    // Add nodes
    const nodes = g.selectAll('.node')
      .data((root as any).descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => {
        const angle = d.x;
        const radius = d.y;
        const x = radius * Math.cos(angle - Math.PI / 2);
        const y = radius * Math.sin(angle - Math.PI / 2);
        return `translate(${x},${y})`;
      })
      .style('cursor', 'pointer')
      .on('click', function(event, d: any) {
        event.stopPropagation();
        setSelectedNode(d.data.id);

        // Highlight selected node
        d3.selectAll('.node circle')
          .attr('stroke-width', 2)
          .attr('stroke', '#3b82f6');

        d3.select(this).select('circle')
          .attr('stroke-width', 4)
          .attr('stroke', '#f59e0b');
      })
      .on('dblclick', function(event, d: any) {
        event.stopPropagation();
        setEditingNode(d.data);
      });

    // Add node visuals (either image/emoji or circle)
    nodes.each(function(d: any) {
      const node = d3.select(this);

      if (d.data.image) {
        // Check if it's an emoji (single character) or URL
        const isEmoji = d.data.image.length <= 2;

        if (isEmoji) {
          // Render emoji
          node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', (d.depth === 0 ? '32px' : '24px'))
            .style('pointer-events', 'none')
            .text(d.data.image);
        } else {
          // Render image URL
          const size = d.depth === 0 ? 40 : 30;
          node.append('image')
            .attr('href', d.data.image)
            .attr('x', -size / 2)
            .attr('y', -size / 2)
            .attr('width', size)
            .attr('height', size)
            .attr('clip-path', 'circle()')
            .style('pointer-events', 'none');
        }
      } else {
        // Default circle
        node.append('circle')
          .attr('r', d.depth === 0 ? 12 : 8)
          .attr('fill', () => {
            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
            return colors[d.depth % colors.length];
          })
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 2);
      }
    });

    // Add labels
    nodes.append('text')
      .attr('dy', (d: any) => {
        if (d.data.image) {
          const isEmoji = d.data.image.length <= 2;
          return d.depth === 0 ? (isEmoji ? 25 : 30) : (isEmoji ? 20 : 25);
        }
        return d.depth === 0 ? -20 : -15;
      })
      .attr('text-anchor', 'middle')
      .style('font-size', (d: any) => d.depth === 0 ? '16px' : '12px')
      .style('font-weight', (d: any) => d.depth === 0 ? 'bold' : 'normal')
      .style('fill', '#1f2937')
      .style('pointer-events', 'none')
      .text((d: any) => d.data.name);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Reset button behavior
    svg.on('dblclick.zoom', () => {
      svg.transition().duration(750).call(
        zoom.transform as any,
        d3.zoomIdentity.translate(width / 2, height / 2)
      );
    });

  }, [mindmapData, width, height]);

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded-lg bg-white shadow-sm"
      />
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-md text-sm text-gray-600">
        <div className="font-semibold mb-2">컨트롤</div>
        <div className="space-y-1">
          <div>• 드래그: 이동</div>
          <div>• 스크롤: 확대/축소</div>
          <div>• 더블클릭(배경): 초기화</div>
          <div>• 노드 클릭: 선택</div>
          <div>• 노드 더블클릭: 편집</div>
        </div>
      </div>

      {editingNode && (
        <EditNodeModal
          node={editingNode}
          onClose={() => setEditingNode(null)}
          onSave={handleNodeSave}
          onDelete={handleNodeDelete}
          canDelete={editingNode.id !== 'root' && editingNode.id !== mindmapData.id}
        />
      )}
    </div>
  );
}
