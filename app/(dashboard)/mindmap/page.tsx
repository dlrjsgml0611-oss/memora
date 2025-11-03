'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MindMapVisualization from '@/components/mindmap/MindMapVisualization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';

interface MindMapNode {
  id: string;
  name: string;
  image?: string;
  children?: MindMapNode[];
}

export default function MindmapPage() {
  const [mindmaps, setMindmaps] = useState<any[]>([]);
  const [selectedMindmap, setSelectedMindmap] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState('');

  useEffect(() => {
    loadMindmaps();
  }, []);

  const loadMindmaps = async () => {
    try {
      const response: any = await api.getMindmaps();
      if (response.success) {
        setMindmaps(response.data || []);
        if (response.data && response.data.length > 0) {
          setSelectedMindmap(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load mindmaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSampleMindmap = async () => {
    if (!newMapTitle.trim()) {
      alert('제목을 입력하세요');
      return;
    }

    const sampleData: MindMapNode = {
      id: 'root',
      name: newMapTitle,
      children: [
        {
          id: 'concept1',
          name: '핵심 개념',
          children: [
            { id: 'concept1-1', name: '기초 이론' },
            { id: 'concept1-2', name: '응용 사례' },
          ],
        },
        {
          id: 'concept2',
          name: '실전 활용',
          children: [
            { id: 'concept2-1', name: '프로젝트 A' },
            { id: 'concept2-2', name: '프로젝트 B' },
          ],
        },
        {
          id: 'concept3',
          name: '학습 자료',
          children: [
            { id: 'concept3-1', name: '책' },
            { id: 'concept3-2', name: '강의' },
            { id: 'concept3-3', name: '블로그' },
          ],
        },
      ],
    };

    try {
      const response: any = await api.createMindmap({
        title: newMapTitle,
        structure: sampleData,
      });

      if (response.success) {
        setMindmaps([response.data, ...mindmaps]);
        setSelectedMindmap(response.data);
        setShowCreateForm(false);
        setNewMapTitle('');
      }
    } catch (error) {
      console.error('Failed to create mindmap:', error);
      alert('마인드맵 생성에 실패했습니다');
    }
  };

  const deleteMindmap = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await api.deleteMindmap(id);
      const newMindmaps = mindmaps.filter(m => m._id !== id);
      setMindmaps(newMindmaps);
      if (selectedMindmap?._id === id) {
        setSelectedMindmap(newMindmaps.length > 0 ? newMindmaps[0] : null);
      }
    } catch (error) {
      alert('삭제에 실패했습니다');
    }
  };

  const handleNodeUpdate = async (nodeId: string, data: { name: string; image?: string }) => {
    if (!selectedMindmap) return;

    try {
      const response = await fetch(`/api/mindmaps/${selectedMindmap._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`,
        },
        body: JSON.stringify({
          structure: selectedMindmap.structure,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the local state with the new structure
        const updatedMindmaps = mindmaps.map(m =>
          m._id === selectedMindmap._id ? result.data : m
        );
        setMindmaps(updatedMindmaps);
        setSelectedMindmap(result.data);
      } else {
        alert('업데이트에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update mindmap:', error);
      alert('업데이트에 실패했습니다');
    }
  };

  const handleNodeDelete = async (nodeId: string) => {
    if (!selectedMindmap) return;

    try {
      const response = await fetch(`/api/mindmaps/${selectedMindmap._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`,
        },
        body: JSON.stringify({
          structure: selectedMindmap.structure,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const updatedMindmaps = mindmaps.map(m =>
          m._id === selectedMindmap._id ? result.data : m
        );
        setMindmaps(updatedMindmaps);
        setSelectedMindmap(result.data);
      } else {
        alert('삭제에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete node:', error);
      alert('삭제에 실패했습니다');
    }
  };

  const handleExport = () => {
    if (!selectedMindmap) return;

    // Convert mindmap structure to text format
    const exportText = generateMindmapText(selectedMindmap.structure);

    // Create and download file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedMindmap.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMindmapText = (node: MindMapNode, level: number = 0): string => {
    const indent = '  '.repeat(level);
    let text = `${indent}- ${node.name}`;
    if (node.image) {
      text += ` ${node.image}`;
    }
    text += '\n';

    if (node.children) {
      node.children.forEach(child => {
        text += generateMindmapText(child, level + 1);
      });
    }

    return text;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">마인드맵</h1>
            <p className="text-gray-600 mt-2">개념을 시각적으로 연결하세요</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            + 새 마인드맵
          </Button>
        </div>

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>새 마인드맵 만들기</CardTitle>
              <CardDescription>주제를 입력하면 샘플 마인드맵이 생성됩니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  placeholder="예: 자바스크립트 기초"
                  value={newMapTitle}
                  onChange={(e) => setNewMapTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createSampleMindmap}>생성하기</Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">마인드맵을 불러오는 중...</div>
            </CardContent>
          </Card>
        ) : mindmaps.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-6xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold text-gray-900">
                아직 마인드맵이 없습니다
              </h3>
              <p className="text-gray-600">
                첫 번째 마인드맵을 만들고 지식을 시각화하세요!
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                마인드맵 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Mindmap List */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">내 마인드맵</h3>
              {mindmaps.map((map) => (
                <div
                  key={map._id}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedMindmap?._id === map._id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedMindmap(map)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">
                        {map.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(map.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMindmap(map._id);
                      }}
                      className="text-gray-400 hover:text-red-500 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Content - Visualization */}
            <div className="lg:col-span-3">
              {selectedMindmap ? (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{selectedMindmap.title}</CardTitle>
                        <CardDescription>
                          노드를 클릭하여 선택하고, 드래그하여 이동하세요
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={handleExport}>
                        📄 출력
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <MindMapVisualization
                      data={selectedMindmap.structure}
                      width={900}
                      height={600}
                      onNodeUpdate={handleNodeUpdate}
                      onNodeDelete={handleNodeDelete}
                    />
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-sm text-gray-900 mb-2">
                        💡 마인드맵 활용 팁
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• 중심 주제에서 시작해 관련 개념들을 방사형으로 연결하세요</li>
                        <li>• 각 가지는 하나의 핵심 아이디어를 나타냅니다</li>
                        <li>• 색상과 구조로 정보의 계층을 파악하기 쉽습니다</li>
                        <li>• 복잡한 개념을 단순화하고 전체 구조를 한눈에 볼 수 있습니다</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-gray-500">
                      왼쪽에서 마인드맵을 선택하세요
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
