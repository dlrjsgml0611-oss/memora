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
  fx?: number; // Fixed x position (custom position)
  fy?: number; // Fixed y position (custom position)
}

interface MindMapVisualizationProps {
  data: MindMapNode;
  width?: number;
  height?: number;
  onNodeUpdate?: (nodeId: string, data: { name: string; image?: string }) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeAdd?: (parentId: string, nodeName: string) => void;
  onPositionUpdate?: (updatedStructure: MindMapNode) => void;
}

export default function MindMapVisualization({
  data,
  width = 1200,
  height = 800,
  onNodeUpdate,
  onNodeDelete,
  onNodeAdd,
  onPositionUpdate
}: MindMapVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<MindMapNode | null>(null);
  const [mindmapData, setMindmapData] = useState<MindMapNode>(data);
  const [showAddNodeModal, setShowAddNodeModal] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [allNodes, setAllNodes] = useState<MindMapNode[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const draggedNodeRef = useRef<{ id: string; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const linksRef = useRef<any>(null);
  const nodesRef = useRef<any>(null);

  useEffect(() => {
    setMindmapData(data);
  }, [data]);

  // 선택된 노드 시각적 하이라이트 업데이트
  useEffect(() => {
    if (!selectedNode) return;

    // 모든 노드의 하이라이트 제거
    d3.selectAll('.node-circle, .node-visual')
      .attr('stroke-width', 2)
      .attr('stroke', (nd: any) => {
        if (nd?.data?.image) return 'none';
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
        return colors[(nd?.depth || 0) % colors.length];
      })
      .style('filter', 'none');

    // 선택된 노드만 하이라이트
    d3.selectAll('.node')
      .filter((d: any) => d.data.id === selectedNode)
      .selectAll('.node-circle, .node-visual')
      .attr('stroke-width', 4)
      .attr('stroke', '#f59e0b')
      .style('filter', 'drop-shadow(0 0 8px #f59e0b)');
  }, [selectedNode]);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 모달이 열려 있거나 입력 중이면 무시
      if (showAddNodeModal || editingNode) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!selectedNode || allNodes.length === 0) return;

      const currentIndex = allNodes.findIndex(node => node.id === selectedNode);
      if (currentIndex === -1) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          // 루트 노드는 삭제 불가
          if (selectedNode !== mindmapData.id && selectedNode !== 'root') {
            if (confirm('이 노드를 삭제하시겠습니까?')) {
              handleNodeDelete(selectedNode);
              setSelectedNode(null);
            }
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          // 이전 노드 선택
          if (currentIndex > 0) {
            setSelectedNode(allNodes[currentIndex - 1].id);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          // 다음 노드 선택
          if (currentIndex < allNodes.length - 1) {
            setSelectedNode(allNodes[currentIndex + 1].id);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          // 부모 노드 선택
          const parent = findParentNode(mindmapData, selectedNode);
          if (parent) {
            setSelectedNode(parent.id);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          // 첫 번째 자식 노드 선택 (hierarchical structure 사용)
          const currentNode = findNodeById(mindmapData, selectedNode);
          if (currentNode?.children && currentNode.children.length > 0) {
            setSelectedNode(currentNode.children[0].id);
          }
          break;
        case 'Enter':
          e.preventDefault();
          // 노드 편집 (hierarchical structure 사용)
          const nodeToEdit = findNodeById(mindmapData, selectedNode);
          if (nodeToEdit) {
            setEditingNode(nodeToEdit);
          }
          break;
        case 'Insert':
        case '+':
          e.preventDefault();
          // 하위 노드 추가
          if (selectedNode) {
            setShowAddNodeModal(selectedNode);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, allNodes, showAddNodeModal, editingNode, mindmapData]);

  // 노드 찾기 헬퍼 함수
  const findNodeById = (root: MindMapNode, targetId: string): MindMapNode | null => {
    if (root.id === targetId) {
      return root;
    }
    if (root.children) {
      for (const child of root.children) {
        const found = findNodeById(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // 부모 노드 찾기 헬퍼 함수
  const findParentNode = (root: MindMapNode, targetId: string, parent: MindMapNode | null = null): MindMapNode | null => {
    if (root.id === targetId) {
      return parent;
    }
    if (root.children) {
      for (const child of root.children) {
        const found = findParentNode(child, targetId, root);
        if (found) return found;
      }
    }
    return null;
  };

  const handleNodeSave = (nodeId: string, updatedData: { name: string; image?: string }) => {
    // Call the parent's onNodeUpdate
    if (onNodeUpdate) {
      onNodeUpdate(nodeId, updatedData);
    }

    setEditingNode(null);
  };

  const handleNodeDelete = (nodeId: string) => {
    // Call the parent's onNodeDelete
    if (onNodeDelete) {
      onNodeDelete(nodeId);
    }

    setEditingNode(null);
  };

  const handleAddNode = () => {
    if (!showAddNodeModal || !newNodeName.trim()) return;

    // Call the parent's onNodeAdd
    if (onNodeAdd) {
      onNodeAdd(showAddNodeModal, newNodeName.trim());
    }

    setShowAddNodeModal(null);
    setNewNodeName('');
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

    // 모든 노드를 배열로 저장
    const nodesList = (root as any).descendants().map((d: any) => d.data);
    setAllNodes(nodesList);

    // Helper function to calculate node position (considering custom position)
    const getNodePosition = (d: any) => {
      // If node has custom position (fx, fy), use that
      if (d.data.fx !== undefined && d.data.fy !== undefined) {
        return { x: d.data.fx, y: d.data.fy };
      }
      // Otherwise use radial layout position
      const angle = d.x;
      const radius = d.y;
      const x = radius * Math.cos(angle - Math.PI / 2);
      const y = radius * Math.sin(angle - Math.PI / 2);
      return { x, y };
    };

    // Add links
    const links = g.selectAll('.link')
      .data((root as any).links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        const sourcePos = getNodePosition(d.source);
        const targetPos = getNodePosition(d.target);
        return `M${sourcePos.x},${sourcePos.y}C${sourcePos.x},${sourcePos.y} ${targetPos.x},${targetPos.y} ${targetPos.x},${targetPos.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    linksRef.current = links;

    // Add nodes
    const nodes = g.selectAll('.node')
      .data((root as any).descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => {
        const pos = getNodePosition(d);
        return `translate(${pos.x},${pos.y})`;
      })
      .style('cursor', 'move')
      .on('click', function(event, d: any) {
        event.stopPropagation();
        const clickedNodeId = d.data.id;
        setSelectedNode(clickedNodeId);

        // Highlight selected node
        d3.selectAll('.node-circle, .node-visual')
          .attr('stroke-width', 2)
          .attr('stroke', (nd: any) => {
            if (nd.data?.image) return 'none';
            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
            return colors[nd.depth % colors.length];
          })
          .style('filter', 'none');

        // Highlight the clicked node
        d3.select(this).selectAll('.node-circle, .node-visual')
          .attr('stroke-width', 4)
          .attr('stroke', '#f59e0b')
          .style('filter', 'drop-shadow(0 0 8px #f59e0b)');
      })
      .on('dblclick', function(event, d: any) {
        event.stopPropagation();
        setEditingNode(d.data);
      })
      .on('contextmenu', function(event, d: any) {
        event.preventDefault();
        event.stopPropagation();
        setShowAddNodeModal(d.data.id);
      })
      .call(d3.drag<SVGGElement, any>()
        .on('start', function(event, d: any) {
          setIsDragging(true);
          d3.select(this).raise();
          setSelectedNode(d.data.id);

          // Calculate offset between mouse and node center
          const currentTransform = d3.select(this).attr('transform');
          const match = currentTransform.match(/translate\(([^,]+),([^)]+)\)/);
          if (match) {
            const nodeX = parseFloat(match[1]);
            const nodeY = parseFloat(match[2]);
            draggedNodeRef.current = {
              id: d.data.id,
              startX: nodeX,
              startY: nodeY,
              offsetX: event.x - nodeX,
              offsetY: event.y - nodeY
            };
          }

          // Highlight during drag
          d3.selectAll('.node-circle, .node-visual')
            .attr('stroke-width', 2)
            .attr('stroke', (nd: any) => {
              if (nd.data?.image) return 'none';
              const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
              return colors[nd.depth % colors.length];
            })
            .style('filter', 'none');

          d3.select(this).selectAll('.node-circle, .node-visual')
            .attr('stroke-width', 4)
            .attr('stroke', '#10b981')
            .style('filter', 'drop-shadow(0 0 8px #10b981)');
        })
        .on('drag', function(event, d: any) {
          // Calculate new position with offset correction
          const newX = event.x - (draggedNodeRef.current?.offsetX || 0);
          const newY = event.y - (draggedNodeRef.current?.offsetY || 0);

          // Update node position
          d3.select(this).attr('transform', `translate(${newX},${newY})`);

          // Update connected edges
          linksRef.current.attr('d', function(linkData: any) {
            let sourcePos, targetPos;

            // Check if this link is connected to the dragged node
            if (linkData.source.data.id === d.data.id) {
              sourcePos = { x: newX, y: newY };
              targetPos = getNodePosition(linkData.target);
            } else if (linkData.target.data.id === d.data.id) {
              sourcePos = getNodePosition(linkData.source);
              targetPos = { x: newX, y: newY };
            } else {
              // Not connected to dragged node, keep original path
              sourcePos = getNodePosition(linkData.source);
              targetPos = getNodePosition(linkData.target);
            }

            return `M${sourcePos.x},${sourcePos.y}C${sourcePos.x},${sourcePos.y} ${targetPos.x},${targetPos.y} ${targetPos.x},${targetPos.y}`;
          });
        })
        .on('end', function(event, d: any) {
          setIsDragging(false);

          // Calculate final position with offset correction
          const finalX = event.x - (draggedNodeRef.current?.offsetX || 0);
          const finalY = event.y - (draggedNodeRef.current?.offsetY || 0);

          // Update node data with new custom position
          const updateNodePosition = (node: MindMapNode): MindMapNode => {
            if (node.id === d.data.id) {
              return { ...node, fx: finalX, fy: finalY };
            }
            if (node.children) {
              return {
                ...node,
                children: node.children.map(updateNodePosition)
              };
            }
            return node;
          };

          const updatedStructure = updateNodePosition(mindmapData);
          setMindmapData(updatedStructure);

          // Notify parent component to save changes
          if (onPositionUpdate) {
            onPositionUpdate(updatedStructure);
          }

          // Restore normal highlight
          d3.select(this).selectAll('.node-circle, .node-visual')
            .attr('stroke-width', 4)
            .attr('stroke', '#f59e0b')
            .style('filter', 'drop-shadow(0 0 8px #f59e0b)');

          draggedNodeRef.current = null;
        })
      );

    nodesRef.current = nodes;

    // Add node visuals (either image/emoji or circle)
    nodes.each(function(d: any) {
      const node = d3.select(this);

      if (d.data.image) {
        // Check if it's an emoji (single character) or URL
        const isEmoji = d.data.image.length <= 2;

        if (isEmoji) {
          // Render emoji with background circle for better clickability
          const size = d.depth === 0 ? 40 : 30;
          node.append('circle')
            .attr('class', 'node-visual')
            .attr('r', size / 2)
            .attr('fill', 'rgba(255, 255, 255, 0.8)')
            .attr('stroke', 'none');

          node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', (d.depth === 0 ? '32px' : '24px'))
            .style('pointer-events', 'none')
            .style('user-select', 'none')
            .text(d.data.image);
        } else {
          // Render image URL with background
          const size = d.depth === 0 ? 40 : 30;
          node.append('circle')
            .attr('class', 'node-visual')
            .attr('r', size / 2 + 2)
            .attr('fill', 'white')
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 2);

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
          .attr('class', 'node-circle')
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
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-md text-sm text-gray-600 max-w-xs">
        <div className="font-semibold mb-2 text-gray-900">⌨️ 컨트롤</div>
        <div className="space-y-1">
          <div className="font-medium text-gray-700">마우스</div>
          <div>• 배경 드래그: 화면 이동</div>
          <div>• 노드 드래그: 노드 위치 조정</div>
          <div>• 스크롤: 확대/축소</div>
          <div>• 더블클릭(배경): 초기화</div>
          <div>• 노드 클릭: 선택</div>
          <div>• 노드 더블클릭: 편집</div>
          <div>• 노드 우클릭: 하위 노드 추가</div>
          <div className="font-medium text-gray-700 mt-2">키보드</div>
          <div>• ↑↓: 이전/다음 노드</div>
          <div>• ←→: 부모/자식 노드</div>
          <div>• Enter: 노드 편집</div>
          <div>• +/Insert: 하위 노드 추가</div>
          <div>• Delete/Backspace: 노드 삭제</div>
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

      {showAddNodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">하위 노드 추가</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="nodeName" className="block text-sm font-medium text-gray-700 mb-2">
                  노드 이름
                </label>
                <input
                  id="nodeName"
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNode()}
                  placeholder="노드 이름을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddNode}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                >
                  추가
                </button>
                <button
                  onClick={() => {
                    setShowAddNodeModal(null);
                    setNewNodeName('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
