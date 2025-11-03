'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EditItemModal from './EditItemModal';

interface Room {
  id: string;
  name: string;
  description: string;
  items: MemoryItem[];
  color: string;
}

interface MemoryItem {
  id: string;
  content: string;
  position: { x: number; y: number };
  image?: string;
}

interface MemoryPalaceVisualizationProps {
  rooms: Room[];
  onAddItem?: (roomId: string, item: Omit<MemoryItem, 'id'>) => void;
  onDeleteItem?: (roomId: string, itemId: string) => void;
  onUpdateItem?: (roomId: string, itemId: string, data: { content: string; image?: string }) => void;
}

export default function MemoryPalaceVisualization({
  rooms,
  onAddItem,
  onDeleteItem,
  onUpdateItem
}: MemoryPalaceVisualizationProps) {
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MemoryItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemContent, setNewItemContent] = useState('');
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  if (!rooms || rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">방이 없습니다. 새 방을 만들어주세요.</p>
      </div>
    );
  }

  const currentRoom = rooms[currentRoomIndex];

  const goToPreviousRoom = () => {
    setCurrentRoomIndex((prev) => (prev - 1 + rooms.length) % rooms.length);
    setSelectedItem(null);
  };

  const goToNextRoom = () => {
    setCurrentRoomIndex((prev) => (prev + 1) % rooms.length);
    setSelectedItem(null);
  };

  const handleAddItem = () => {
    if (!newItemContent.trim()) return;

    const newItem: Omit<MemoryItem, 'id'> = {
      content: newItemContent,
      position: {
        x: Math.random() * 60 + 20, // 20-80%
        y: Math.random() * 60 + 20,
      },
    };

    onAddItem?.(currentRoom.id, newItem);
    setNewItemContent('');
    setShowAddForm(false);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('이 기억 항목을 삭제하시겠습니까?')) {
      onDeleteItem?.(currentRoom.id, itemId);
      setSelectedItem(null);
    }
  };

  const handleEditItem = (item: MemoryItem) => {
    setEditingItem(item);
  };

  const handleSaveItem = (itemId: string, data: { content: string; image?: string }) => {
    onUpdateItem?.(currentRoom.id, itemId, data);
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Room Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousRoom}
          disabled={rooms.length <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          이전 방
        </Button>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">{currentRoom.name}</h3>
          <p className="text-sm text-gray-600">{currentRoom.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            방 {currentRoomIndex + 1} / {rooms.length}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextRoom}
          disabled={rooms.length <= 1}
        >
          다음 방
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* 3D Room Visualization */}
      <div
        className="relative w-full h-[600px] rounded-lg overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentRoom.color}20 0%, ${currentRoom.color}40 100%)`,
          perspective: '1000px',
        }}
      >
        {/* Room Container */}
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: 'transform 0.5s ease',
          }}
        >
          {/* Floor */}
          <div
            className="absolute left-1/2 top-1/2 w-full h-full"
            style={{
              transform: 'translate(-50%, -50%) rotateX(90deg)',
              background: `linear-gradient(45deg, ${currentRoom.color}10 25%, transparent 25%, transparent 75%, ${currentRoom.color}10 75%, ${currentRoom.color}10),
                           linear-gradient(45deg, ${currentRoom.color}10 25%, transparent 25%, transparent 75%, ${currentRoom.color}10 75%, ${currentRoom.color}10)`,
              backgroundSize: '80px 80px',
              backgroundPosition: '0 0, 40px 40px',
            }}
          />

          {/* Back Wall */}
          <div
            className="absolute left-1/2 top-0 w-full h-full bg-gradient-to-b from-white/80 to-white/40 backdrop-blur-sm border border-gray-200"
            style={{
              transform: 'translateX(-50%) translateZ(-300px)',
            }}
          />

          {/* Memory Items */}
          {currentRoom.items.map((item) => (
            <div
              key={item.id}
              className={`absolute cursor-pointer transition-all duration-300 ${
                selectedItem === item.id ? 'scale-110 z-10' : 'hover:scale-105'
              }`}
              style={{
                left: `${item.position.x}%`,
                top: `${item.position.y}%`,
                transform: `translateZ(${selectedItem === item.id ? '100px' : '50px'})`,
              }}
              onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
            >
              <div
                className={`bg-white rounded-lg shadow-lg p-4 min-w-[150px] max-w-[250px] border-2 ${
                  selectedItem === item.id
                    ? 'border-blue-500'
                    : 'border-gray-200'
                }`}
              >
                {item.image && (
                  <div className="mb-2 h-20 w-full rounded bg-gray-100 flex items-center justify-center text-4xl">
                    {item.image}
                  </div>
                )}
                <p className="text-sm font-medium text-gray-900 break-words">
                  {item.content}
                </p>
                {selectedItem === item.id && (
                  <div className="mt-2 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-blue-600 hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(item);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      편집
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      삭제
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-md text-sm">
          <div className="font-semibold mb-2">시점 조정</div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRotation({ x: rotation.x - 10, y: rotation.y })}
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRotation({ x: rotation.x + 10, y: rotation.y })}
            >
              ↓
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRotation({ x: rotation.x, y: rotation.y - 10 })}
            >
              ←
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRotation({ x: rotation.x, y: rotation.y + 10 })}
            >
              →
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRotation({ x: 0, y: 0 })}
            >
              초기화
            </Button>
          </div>
        </div>

        {/* Add Item Button */}
        <div className="absolute top-4 right-4">
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-1" />
            기억 추가
          </Button>
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 space-y-3">
          <h4 className="font-semibold text-gray-900">새 기억 항목 추가</h4>
          <input
            type="text"
            placeholder="기억할 내용을 입력하세요"
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <div className="flex gap-2">
            <Button onClick={handleAddItem}>추가</Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Room Stats */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-sm text-gray-900 mb-2">
          💡 기억의 궁전 활용 팁
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 각 방에 특정 주제나 카테고리의 정보를 배치하세요</li>
          <li>• 기억할 내용을 생생한 이미지나 스토리와 연결하세요</li>
          <li>• 정기적으로 궁전을 걸으며 기억을 되살리세요</li>
          <li>• 현재 {currentRoom.items.length}개의 기억이 이 방에 저장되어 있습니다</li>
        </ul>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveItem}
        />
      )}
    </div>
  );
}
