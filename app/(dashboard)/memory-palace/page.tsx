'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MemoryPalaceVisualization from '@/components/memory-palace/MemoryPalaceVisualization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';

interface MemoryItem {
  id: string;
  content: string;
  position: { x: number; y: number };
  image?: string;
  shape?: 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  items: MemoryItem[];
  color: string;
}

export default function MemoryPalacePage() {
  const [palaces, setPalaces] = useState<any[]>([]);
  const [selectedPalace, setSelectedPalace] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPalaceTitle, setNewPalaceTitle] = useState('');

  useEffect(() => {
    loadPalaces();
  }, []);

  const loadPalaces = async () => {
    try {
      const response: any = await api.getMemoryPalaces();
      if (response.success) {
        setPalaces(response.data || []);
        if (response.data && response.data.length > 0) {
          setSelectedPalace(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load memory palaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSamplePalace = async () => {
    if (!newPalaceTitle.trim()) {
      alert('제목을 입력하세요');
      return;
    }

    const sampleRooms: Room[] = [
      {
        id: 'room1',
        name: '입구 홀',
        description: '기본 개념들이 모여있는 곳',
        color: '#3b82f6',
        items: [
          {
            id: 'item1',
            content: '첫 번째 기억',
            position: { x: 30, y: 40 },
            image: '📚',
          },
          {
            id: 'item2',
            content: '두 번째 기억',
            position: { x: 60, y: 50 },
            image: '💡',
          },
        ],
      },
      {
        id: 'room2',
        name: '서재',
        description: '심화 학습 내용',
        color: '#8b5cf6',
        items: [
          {
            id: 'item3',
            content: '중요한 공식',
            position: { x: 40, y: 35 },
            image: '🔢',
          },
        ],
      },
      {
        id: 'room3',
        name: '정원',
        description: '응용 사례들',
        color: '#10b981',
        items: [],
      },
    ];

    try {
      const response: any = await api.createMemoryPalace({
        title: newPalaceTitle,
        rooms: sampleRooms,
      });

      if (response.success) {
        setPalaces([response.data, ...palaces]);
        setSelectedPalace(response.data);
        setShowCreateForm(false);
        setNewPalaceTitle('');
      }
    } catch (error) {
      console.error('Failed to create memory palace:', error);
      alert('기억의 궁전 생성에 실패했습니다');
    }
  };

  const deletePalace = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await api.deleteMemoryPalace(id);
      const newPalaces = palaces.filter(p => p._id !== id);
      setPalaces(newPalaces);
      if (selectedPalace?._id === id) {
        setSelectedPalace(newPalaces.length > 0 ? newPalaces[0] : null);
      }
    } catch (error) {
      alert('삭제에 실패했습니다');
    }
  };

  const handleAddItem = (roomId: string, item: Omit<MemoryItem, 'id'>) => {
    if (!selectedPalace) return;

    const newItem: MemoryItem = {
      ...item,
      id: `item-${Date.now()}`,
    };

    const updatedRooms = selectedPalace.rooms.map((room: Room) => {
      if (room.id === roomId) {
        return {
          ...room,
          items: [...room.items, newItem],
        };
      }
      return room;
    });

    const updatedPalace = {
      ...selectedPalace,
      rooms: updatedRooms,
    };

    setSelectedPalace(updatedPalace);
    setPalaces(palaces.map(p => p._id === updatedPalace._id ? updatedPalace : p));
  };

  const handleDeleteItem = (roomId: string, itemId: string) => {
    if (!selectedPalace) return;

    const updatedRooms = selectedPalace.rooms.map((room: Room) => {
      if (room.id === roomId) {
        return {
          ...room,
          items: room.items.filter((item: MemoryItem) => item.id !== itemId),
        };
      }
      return room;
    });

    const updatedPalace = {
      ...selectedPalace,
      rooms: updatedRooms,
    };

    setSelectedPalace(updatedPalace);
    setPalaces(palaces.map(p => p._id === updatedPalace._id ? updatedPalace : p));
  };

  const handleUpdateItem = async (roomId: string, itemId: string, data: {
    content?: string;
    image?: string;
    position?: { x: number; y: number };
    shape?: 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
    size?: 'small' | 'medium' | 'large';
    color?: string;
  }) => {
    if (!selectedPalace) return;

    const updatedRooms = selectedPalace.rooms.map((room: Room) => {
      if (room.id === roomId) {
        return {
          ...room,
          items: room.items.map((item: MemoryItem) =>
            item.id === itemId ? { ...item, ...data } : item
          ),
        };
      }
      return room;
    });

    const updatedPalace = {
      ...selectedPalace,
      rooms: updatedRooms,
    };

    // Update local state immediately
    setSelectedPalace(updatedPalace);
    setPalaces(palaces.map(p => p._id === updatedPalace._id ? updatedPalace : p));

    // Persist to backend
    try {
      const response = await fetch(`/api/memory-palaces/${selectedPalace._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`,
        },
        body: JSON.stringify({
          rooms: updatedRooms,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert('업데이트에 실패했습니다: ' + result.error);
        // Optionally revert the optimistic update here
      }
    } catch (error) {
      console.error('Failed to update memory palace:', error);
      alert('업데이트에 실패했습니다');
    }
  };

  const handleAddRoom = async (room: { name: string; description: string; color: string }) => {
    if (!selectedPalace) return;

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: room.name,
      description: room.description,
      color: room.color,
      items: [],
    };

    const updatedRooms = [...selectedPalace.rooms, newRoom];
    const updatedPalace = {
      ...selectedPalace,
      rooms: updatedRooms,
    };

    // Update local state immediately
    setSelectedPalace(updatedPalace);
    setPalaces(palaces.map(p => p._id === updatedPalace._id ? updatedPalace : p));

    // Persist to backend
    try {
      const response = await fetch(`/api/memory-palaces/${selectedPalace._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`,
        },
        body: JSON.stringify({
          rooms: updatedRooms,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert('업데이트에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update memory palace:', error);
      alert('업데이트에 실패했습니다');
    }
  };

  const handleUpdateRoom = async (roomId: string, data: { name?: string; description?: string; color?: string }) => {
    if (!selectedPalace) return;

    const updatedRooms = selectedPalace.rooms.map((room: Room) =>
      room.id === roomId ? { ...room, ...data } : room
    );

    const updatedPalace = {
      ...selectedPalace,
      rooms: updatedRooms,
    };

    // Update local state immediately
    setSelectedPalace(updatedPalace);
    setPalaces(palaces.map(p => p._id === updatedPalace._id ? updatedPalace : p));

    // Persist to backend
    try {
      const response = await fetch(`/api/memory-palaces/${selectedPalace._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`,
        },
        body: JSON.stringify({
          rooms: updatedRooms,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert('업데이트에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update memory palace:', error);
      alert('업데이트에 실패했습니다');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!selectedPalace) return;

    const updatedRooms = selectedPalace.rooms.filter((room: Room) => room.id !== roomId);

    if (updatedRooms.length === 0) {
      alert('마지막 방은 삭제할 수 없습니다');
      return;
    }

    const updatedPalace = {
      ...selectedPalace,
      rooms: updatedRooms,
    };

    // Update local state immediately
    setSelectedPalace(updatedPalace);
    setPalaces(palaces.map(p => p._id === updatedPalace._id ? updatedPalace : p));

    // Persist to backend
    try {
      const response = await fetch(`/api/memory-palaces/${selectedPalace._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`,
        },
        body: JSON.stringify({
          rooms: updatedRooms,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert('업데이트에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update memory palace:', error);
      alert('업데이트에 실패했습니다');
    }
  };

  const handleExport = () => {
    if (!selectedPalace) return;

    // Convert palace structure to text format
    const exportText = generatePalaceText(selectedPalace);

    // Create and download file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPalace.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generatePalaceText = (palace: any): string => {
    let text = `기억의 궁전: ${palace.title}\n`;
    text += `생성일: ${new Date(palace.createdAt).toLocaleDateString('ko-KR')}\n`;
    text += `\n${'='.repeat(50)}\n\n`;

    palace.rooms?.forEach((room: Room, index: number) => {
      text += `방 ${index + 1}: ${room.name}\n`;
      text += `${room.description}\n`;
      text += `${'─'.repeat(40)}\n`;

      if (room.items && room.items.length > 0) {
        room.items.forEach((item: MemoryItem, itemIndex: number) => {
          text += `  ${itemIndex + 1}. `;
          if (item.image) {
            text += `${item.image} `;
          }
          text += `${item.content}\n`;
        });
      } else {
        text += `  (비어있음)\n`;
      }

      text += `\n`;
    });

    return text;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">기억의 궁전</h1>
            <p className="text-gray-600 mt-2">공간 기억을 활용한 학습법</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            + 새 궁전 만들기
          </Button>
        </div>

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>새 기억의 궁전 만들기</CardTitle>
              <CardDescription>주제를 입력하면 샘플 궁전이 생성됩니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  placeholder="예: 역사 공부"
                  value={newPalaceTitle}
                  onChange={(e) => setNewPalaceTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createSamplePalace}>생성하기</Button>
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
              <div className="text-gray-500">기억의 궁전을 불러오는 중...</div>
            </CardContent>
          </Card>
        ) : palaces.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-6xl mb-4">🏛️</div>
              <h3 className="text-xl font-semibold text-gray-900">
                아직 기억의 궁전이 없습니다
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                기억의 궁전은 고대 그리스 시대부터 전해져 온 강력한 기억술입니다.
                <br />
                공간과 이미지를 활용해 방대한 정보를 효과적으로 기억하세요!
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                첫 궁전 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Palace List */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">내 궁전</h3>
              {palaces.map((palace) => (
                <div
                  key={palace._id}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedPalace?._id === palace._id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPalace(palace)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">
                        {palace.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {palace.rooms?.length || 0}개의 방
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(palace.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePalace(palace._id);
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
              {selectedPalace ? (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{selectedPalace.title}</CardTitle>
                        <CardDescription>
                          방을 탐험하며 기억을 배치하세요
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={handleExport}>
                        📄 출력
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <MemoryPalaceVisualization
                      rooms={selectedPalace.rooms || []}
                      onAddItem={handleAddItem}
                      onDeleteItem={handleDeleteItem}
                      onUpdateItem={handleUpdateItem}
                      onAddRoom={handleAddRoom}
                      onUpdateRoom={handleUpdateRoom}
                      onDeleteRoom={handleDeleteRoom}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-gray-500">
                      왼쪽에서 궁전을 선택하세요
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Info Section */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">기억의 궁전이란?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>기억의 궁전(Memory Palace)</strong>은 장소법(Method of Loci)이라고도 불리며,
              익숙한 공간에 기억할 정보를 시각적 이미지로 배치하는 기억술입니다.
            </p>
            <p>
              뇌는 공간 정보를 매우 잘 기억하기 때문에, 추상적인 정보를 익숙한 장소와 연결하면
              훨씬 쉽게 기억할 수 있습니다.
            </p>
            <div className="bg-white/60 p-3 rounded-lg">
              <p className="font-semibold mb-2">사용법:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>익숙한 장소(집, 학교 등)를 궁전으로 설정</li>
                <li>각 방에 특정 주제의 정보 배치</li>
                <li>생생한 이미지나 스토리로 연결</li>
                <li>정기적으로 궁전을 걸으며 복습</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
