'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit, Play, Pause, SkipForward } from 'lucide-react';
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
  shape?: 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

interface MemoryPalaceVisualizationProps {
  rooms: Room[];
  onAddItem?: (roomId: string, item: Omit<MemoryItem, 'id'>) => void;
  onDeleteItem?: (roomId: string, itemId: string) => void;
  onUpdateItem?: (roomId: string, itemId: string, data: {
    content?: string;
    image?: string;
    position?: { x: number; y: number };
    shape?: 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
    size?: 'small' | 'medium' | 'large';
    color?: string;
  }) => void;
  onAddRoom?: (room: Omit<Room, 'id' | 'items'>) => void;
  onUpdateRoom?: (roomId: string, data: { name?: string; description?: string; color?: string }) => void;
  onDeleteRoom?: (roomId: string) => void;
}

type ViewPreset = 'front' | 'top' | 'side' | 'isometric';

export default function MemoryPalaceVisualization({
  rooms,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom
}: MemoryPalaceVisualizationProps) {
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MemoryItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemContent, setNewItemContent] = useState('');
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Room management state
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [showEditRoomForm, setShowEditRoomForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomColor, setNewRoomColor] = useState('#3b82f6');

  // Tour mode state
  const [isTourMode, setIsTourMode] = useState(false);
  const [tourItemIndex, setTourItemIndex] = useState(0);
  const [tourAutoPlay, setTourAutoPlay] = useState(false);
  const tourIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // View presets
  const viewPresets: Record<ViewPreset, { x: number; y: number; label: string }> = {
    front: { x: 0, y: 0, label: '정면' },
    top: { x: 45, y: 0, label: '위' },
    side: { x: 0, y: 30, label: '측면' },
    isometric: { x: 20, y: 20, label: '등각' },
  };

  const applyViewPreset = (preset: ViewPreset) => {
    setRotation(viewPresets[preset]);
  };

  // Tour mode functions
  const startTour = useCallback(() => {
    if (!rooms || rooms.length === 0) return;
    const validRoomIndex = Math.max(0, Math.min(currentRoomIndex, rooms.length - 1));
    const currentRoom = rooms[validRoomIndex];
    if (!currentRoom || currentRoom.items.length === 0) {
      alert('이 방에 기억 항목이 없습니다.');
      return;
    }
    setIsTourMode(true);
    setTourItemIndex(0);
    setSelectedItem(currentRoom.items[0].id);
  }, [rooms, currentRoomIndex]);

  const stopTour = useCallback(() => {
    setIsTourMode(false);
    setTourAutoPlay(false);
    if (tourIntervalRef.current) {
      clearInterval(tourIntervalRef.current);
      tourIntervalRef.current = null;
    }
  }, []);

  const nextTourItem = useCallback(() => {
    if (!rooms || rooms.length === 0) return;
    const validRoomIndex = Math.max(0, Math.min(currentRoomIndex, rooms.length - 1));
    const currentRoom = rooms[validRoomIndex];
    if (!currentRoom) return;

    const nextIndex = tourItemIndex + 1;
    if (nextIndex >= currentRoom.items.length) {
      // Move to next room or end tour
      if (currentRoomIndex < rooms.length - 1) {
        setCurrentRoomIndex(currentRoomIndex + 1);
        setTourItemIndex(0);
        const nextRoom = rooms[currentRoomIndex + 1];
        if (nextRoom.items.length > 0) {
          setSelectedItem(nextRoom.items[0].id);
        }
      } else {
        stopTour();
      }
    } else {
      setTourItemIndex(nextIndex);
      setSelectedItem(currentRoom.items[nextIndex].id);
    }
  }, [rooms, currentRoomIndex, tourItemIndex, stopTour]);

  // Auto-play tour
  useEffect(() => {
    if (tourAutoPlay && isTourMode) {
      tourIntervalRef.current = setInterval(nextTourItem, 3000);
    } else if (tourIntervalRef.current) {
      clearInterval(tourIntervalRef.current);
      tourIntervalRef.current = null;
    }
    return () => {
      if (tourIntervalRef.current) clearInterval(tourIntervalRef.current);
    };
  }, [tourAutoPlay, isTourMode, nextTourItem]);

  // Define callbacks BEFORE any early returns (Hook rules)
  const goToPreviousRoom = useCallback(() => {
    if (!rooms || rooms.length === 0) return;
    setCurrentRoomIndex((prev) => (prev - 1 + rooms.length) % rooms.length);
    setSelectedItem(null);
  }, [rooms]);

  const goToNextRoom = useCallback(() => {
    if (!rooms || rooms.length === 0) return;
    setCurrentRoomIndex((prev) => (prev + 1) % rooms.length);
    setSelectedItem(null);
  }, [rooms]);

  const handleDeleteItem = useCallback((itemId: string) => {
    if (!rooms || rooms.length === 0) return;
    const validRoomIndex = Math.max(0, Math.min(currentRoomIndex, rooms.length - 1));
    const currentRoom = rooms[validRoomIndex];
    if (!currentRoom) return;

    if (confirm('이 기억 항목을 삭제하시겠습니까?')) {
      onDeleteItem?.(currentRoom.id, itemId);
      setSelectedItem(null);
    }
  }, [rooms, currentRoomIndex, onDeleteItem]);

  // Ensure currentRoomIndex stays within valid bounds when rooms change
  useEffect(() => {
    if (rooms && rooms.length > 0 && currentRoomIndex >= rooms.length) {
      setCurrentRoomIndex(0);
    }
  }, [rooms, currentRoomIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Ignore if modal is open
      if (editingItem || showAddForm || showAddRoomForm || showEditRoomForm) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (rooms && rooms.length > 1) {
            e.preventDefault();
            goToPreviousRoom();
          }
          break;
        case 'ArrowRight':
          if (rooms && rooms.length > 1) {
            e.preventDefault();
            goToNextRoom();
          }
          break;
        case 'n':
        case 'N':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowAddForm(true);
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedItem) {
            e.preventDefault();
            handleDeleteItem(selectedItem);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedItem(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rooms, selectedItem, editingItem, showAddForm, showAddRoomForm, showEditRoomForm, goToPreviousRoom, goToNextRoom, handleDeleteItem]);

  // Early returns AFTER all Hooks
  if (!rooms || rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">방이 없습니다. 새 방을 만들어주세요.</p>
      </div>
    );
  }

  // Ensure currentRoomIndex is within valid range
  const validRoomIndex = Math.max(0, Math.min(currentRoomIndex, rooms.length - 1));
  const currentRoom = rooms[validRoomIndex];

  // Safety check
  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">방 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const handleAddItem = () => {
    if (!newItemContent.trim()) return;

    const newItem: Omit<MemoryItem, 'id'> = {
      content: newItemContent,
      position: {
        x: Math.random() * 60 + 20, // 20-80%
        y: Math.random() * 60 + 20,
      },
      shape: 'card', // Default 3D shape
      size: 'medium', // Default size
      color: '#3b82f6', // Default color
    };

    onAddItem?.(currentRoom.id, newItem);
    setNewItemContent('');
    setShowAddForm(false);
  };

  const handleEditItem = (item: MemoryItem) => {
    setEditingItem(item);
  };

  const handleSaveItem = (itemId: string, data: {
    content: string;
    image?: string;
    shape?: string;
    size?: string;
    color?: string;
  }) => {
    // 타입 호환성을 위해 shape를 검증
    const validData: Parameters<NonNullable<typeof onUpdateItem>>[2] = {
      content: data.content,
      image: data.image,
      shape: data.shape as 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card' | undefined,
      size: data.size as 'small' | 'medium' | 'large' | undefined,
      color: data.color,
    };
    onUpdateItem?.(currentRoom.id, itemId, validData);
    setEditingItem(null);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    setDraggingItem(itemId);
    // Make the drag image invisible
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    e.preventDefault();
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    if (!containerRef.current) return;

    // Only update if the drag ended with valid coordinates
    if (e.clientX === 0 && e.clientY === 0) {
      setDraggingItem(null);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;

    // Constrain to container bounds with better margins
    const clampedX = Math.max(2, Math.min(92, x));
    const clampedY = Math.max(2, Math.min(92, y));

    if (onUpdateItem) {
      onUpdateItem(currentRoom.id, itemId, {
        position: { x: clampedX, y: clampedY }
      });
    }

    setDraggingItem(null);
  };

  const handleAddRoom = () => {
    if (!newRoomName.trim()) {
      alert('방 이름을 입력하세요');
      return;
    }

    const newRoom = {
      name: newRoomName,
      description: newRoomDescription,
      color: newRoomColor,
    };

    onAddRoom?.(newRoom);
    setNewRoomName('');
    setNewRoomDescription('');
    setNewRoomColor('#3b82f6');
    setShowAddRoomForm(false);
  };

  const handleUpdateRoom = () => {
    if (!newRoomName.trim()) {
      alert('방 이름을 입력하세요');
      return;
    }

    onUpdateRoom?.(currentRoom.id, {
      name: newRoomName,
      description: newRoomDescription,
      color: newRoomColor,
    });

    setShowEditRoomForm(false);
  };

  const handleDeleteRoom = () => {
    if (rooms.length <= 1) {
      alert('마지막 방은 삭제할 수 없습니다');
      return;
    }

    if (confirm('이 방과 모든 기억을 삭제하시겠습니까?')) {
      onDeleteRoom?.(currentRoom.id);
      // Move to previous room if current room is being deleted
      const newIndex = Math.min(currentRoomIndex, rooms.length - 2);
      setCurrentRoomIndex(Math.max(0, newIndex));
    }
  };

  const openEditRoomForm = () => {
    setNewRoomName(currentRoom.name);
    setNewRoomDescription(currentRoom.description);
    setNewRoomColor(currentRoom.color);
    setShowEditRoomForm(true);
  };

  const get3DShape = (item: MemoryItem) => {
    const shape = item.shape || 'card';
    const size = item.size || 'medium';
    const color = item.color || '#3b82f6';

    const sizeMap = {
      small: { width: 80, height: 80 },
      medium: { width: 120, height: 120 },
      large: { width: 160, height: 160 }
    };

    const dimensions = sizeMap[size];

    switch (shape) {
      case 'box':
        return (
          <div
            className="relative"
            style={{
              width: dimensions.width,
              height: dimensions.height,
              transformStyle: 'preserve-3d'
            }}
          >
            <div
              className="absolute inset-0 rounded-lg shadow-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                transform: 'translateZ(20px)',
                border: `2px solid ${color}`,
              }}
            >
              {item.image && <span className="text-4xl">{item.image}</span>}
            </div>
            {/* Box sides for 3D effect */}
            <div className="absolute inset-0 rounded-lg" style={{
              background: `linear-gradient(to right, ${color}66, ${color}33)`,
              transform: 'rotateY(90deg) translateZ(20px)',
            }} />
            <div className="absolute inset-0 rounded-lg" style={{
              background: `linear-gradient(to bottom, ${color}66, ${color}33)`,
              transform: 'rotateX(90deg) translateZ(20px)',
            }} />
          </div>
        );

      case 'sphere':
        return (
          <div
            className="rounded-full shadow-2xl flex items-center justify-center"
            style={{
              width: dimensions.width,
              height: dimensions.height,
              background: `radial-gradient(circle at 30% 30%, ${color}ff, ${color}99, ${color}66)`,
              border: `3px solid ${color}`,
            }}
          >
            {item.image && <span className="text-4xl">{item.image}</span>}
          </div>
        );

      case 'cylinder':
        return (
          <div
            className="relative"
            style={{
              width: dimensions.width * 0.8,
              height: dimensions.height * 1.2,
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
              style={{
                width: dimensions.width * 0.8,
                height: 30,
                background: `radial-gradient(ellipse, ${color}ff, ${color}cc)`,
                border: `2px solid ${color}`,
              }}
            />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 shadow-2xl flex items-center justify-center"
              style={{
                width: dimensions.width * 0.8,
                height: dimensions.height,
                background: `linear-gradient(to right, ${color}99, ${color}ff, ${color}99)`,
                borderLeft: `2px solid ${color}`,
                borderRight: `2px solid ${color}`,
              }}
            >
              {item.image && <span className="text-4xl">{item.image}</span>}
            </div>
          </div>
        );

      case 'pyramid':
        return (
          <div
            className="relative flex items-end justify-center"
            style={{
              width: dimensions.width,
              height: dimensions.height,
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${dimensions.width / 2}px solid transparent`,
                borderRight: `${dimensions.width / 2}px solid transparent`,
                borderBottom: `${dimensions.height}px solid ${color}`,
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
              }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 text-4xl">
              {item.image}
            </div>
          </div>
        );

      default: // card
        return (
          <div
            className="rounded-lg shadow-2xl p-4 bg-white border-2"
            style={{
              width: dimensions.width,
              minHeight: dimensions.height,
              borderColor: color,
              background: `linear-gradient(135deg, white 0%, ${color}11 100%)`,
            }}
          >
            {item.image && (
              <div className="mb-2 flex items-center justify-center text-4xl">
                {item.image}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Room Navigation */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
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

        {/* Room Management Buttons */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddRoomForm(!showAddRoomForm)}
          >
            <Plus className="h-3 w-3 mr-1" />
            방 추가
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openEditRoomForm}
          >
            <Edit className="h-3 w-3 mr-1" />
            방 편집
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteRoom}
            disabled={rooms.length <= 1}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            방 삭제
          </Button>
        </div>
      </div>

      {/* 3D Room Visualization */}
      <div
        ref={containerRef}
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

          {/* Empty room message */}
          {currentRoom.items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-lg text-center max-w-md">
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-gray-900 font-semibold mb-2">빈 방입니다</p>
                <p className="text-sm text-gray-600">
                  오른쪽 상단의 "기억 추가" 버튼을 클릭하거나<br />
                  <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+N</kbd>을 눌러 첫 기억을 추가하세요
                </p>
              </div>
            </div>
          )}

          {/* Memory Items */}
          {currentRoom.items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDrag={(e) => handleDrag(e, item.id)}
              onDragEnd={(e) => handleDragEnd(e, item.id)}
              className={`absolute cursor-move transition-all duration-200 ${
                selectedItem === item.id ? 'scale-110 z-10' : 'hover:scale-105'
              } ${draggingItem === item.id ? 'opacity-70 cursor-grabbing' : 'cursor-grab'}`}
              style={{
                left: `${item.position.x}%`,
                top: `${item.position.y}%`,
                transform: `translate(-50%, -50%) translateZ(${selectedItem === item.id ? '100px' : '50px'})`,
              }}
              onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
            >
              {/* 3D Object */}
              <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
                {get3DShape(item)}

                {/* Content label below object */}
                <div className={`mt-2 p-2 rounded shadow-md text-center max-w-[200px] transition-all ${
                  selectedItem === item.id ? 'bg-blue-500 text-white ring-2 ring-blue-300' : 'bg-white text-gray-900'
                }`}>
                  <p className="text-xs font-medium break-words line-clamp-3">
                    {item.content}
                  </p>
                </div>
              </div>

              {/* Action buttons when selected */}
              <div className="relative">
                <p className="hidden">{item.content}</p>
                {selectedItem === item.id && (
                  <div className="mt-2 flex gap-1 justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(item);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      편집
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-md text-sm max-w-xs">
          <div className="font-semibold mb-2 text-gray-900">⌨️ 컨트롤</div>
          <div className="space-y-2 text-xs text-gray-600 mb-3">
            <div>• ← → : 방 이동</div>
            <div>• Ctrl+N : 기억 추가</div>
            <div>• Delete : 선택 항목 삭제</div>
            <div>• ESC : 선택 취소</div>
            <div>• 드래그 : 항목 이동</div>
          </div>

          <div className="font-semibold mb-2 text-gray-900">🎬 시점 프리셋</div>
          <div className="flex gap-1 flex-wrap mb-3">
            {(Object.keys(viewPresets) as ViewPreset[]).map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant="outline"
                onClick={() => applyViewPreset(preset)}
                className="text-xs px-2 py-1"
              >
                {viewPresets[preset].label}
              </Button>
            ))}
          </div>

          <div className="font-semibold mb-2 text-gray-900">시점 조정</div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setRotation({ x: rotation.x - 10, y: rotation.y })} title="위로 회전">↑</Button>
            <Button size="sm" variant="outline" onClick={() => setRotation({ x: rotation.x + 10, y: rotation.y })} title="아래로 회전">↓</Button>
            <Button size="sm" variant="outline" onClick={() => setRotation({ x: rotation.x, y: rotation.y - 10 })} title="왼쪽으로 회전">←</Button>
            <Button size="sm" variant="outline" onClick={() => setRotation({ x: rotation.x, y: rotation.y + 10 })} title="오른쪽으로 회전">→</Button>
            <Button size="sm" variant="outline" onClick={() => setRotation({ x: 0, y: 0 })} title="시점 초기화">⟲</Button>
          </div>
        </div>

        {/* Tour Mode Controls */}
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-md">
          <div className="font-semibold mb-2 text-gray-900 text-sm">🚶 투어 모드</div>
          {!isTourMode ? (
            <Button size="sm" onClick={startTour} className="w-full">
              <Play className="h-3 w-3 mr-1" /> 투어 시작
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-600 text-center">
                {tourItemIndex + 1} / {rooms[Math.max(0, Math.min(currentRoomIndex, rooms.length - 1))]?.items.length || 0}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setTourAutoPlay(!tourAutoPlay)}>
                  {tourAutoPlay ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="outline" onClick={nextTourItem}>
                  <SkipForward className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={stopTour} className="text-red-500">
                  ✕
                </Button>
              </div>
            </div>
          )}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={handleAddItem} disabled={!newItemContent.trim()}>추가</Button>
            <Button variant="outline" onClick={() => {
              setShowAddForm(false);
              setNewItemContent('');
            }}>
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Add Room Form */}
      {showAddRoomForm && (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 space-y-3">
          <h4 className="font-semibold text-gray-900">새 방 만들기</h4>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">방 이름</label>
            <input
              type="text"
              placeholder="예: 서재, 정원, 거실"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">방 설명</label>
            <input
              type="text"
              placeholder="이 방에 저장할 내용을 간단히 설명하세요"
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">방 색상</label>
            <div className="flex gap-2">
              {['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6', '#6366f1'].map((c) => (
                <button
                  key={c}
                  onClick={() => setNewRoomColor(c)}
                  className={`w-10 h-10 rounded-full border-2 transition ${
                    newRoomColor === c ? 'border-gray-900 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddRoom}>생성</Button>
            <Button variant="outline" onClick={() => setShowAddRoomForm(false)}>
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Edit Room Form */}
      {showEditRoomForm && (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 space-y-3">
          <h4 className="font-semibold text-gray-900">방 편집</h4>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">방 이름</label>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">방 설명</label>
            <input
              type="text"
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">방 색상</label>
            <div className="flex gap-2">
              {['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6', '#6366f1'].map((c) => (
                <button
                  key={c}
                  onClick={() => setNewRoomColor(c)}
                  className={`w-10 h-10 rounded-full border-2 transition ${
                    newRoomColor === c ? 'border-gray-900 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpdateRoom}>저장</Button>
            <Button variant="outline" onClick={() => setShowEditRoomForm(false)}>
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Room Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">
            💡 기억의 궁전 활용 팁
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 각 방에 특정 주제나 카테고리의 정보를 배치하세요</li>
            <li>• 기억할 내용을 생생한 이미지나 스토리와 연결하세요</li>
            <li>• 정기적으로 궁전을 걸으며 기억을 되살리세요</li>
            <li>• 3D 형태와 색상을 활용해 더 기억에 남게 만드세요</li>
          </ul>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">
            📊 통계
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>현재 방:</span>
              <span className="font-medium text-gray-900">{currentRoom.name}</span>
            </div>
            <div className="flex justify-between">
              <span>이 방의 기억:</span>
              <span className="font-medium text-gray-900">{currentRoom.items.length}개</span>
            </div>
            <div className="flex justify-between">
              <span>전체 방:</span>
              <span className="font-medium text-gray-900">{rooms.length}개</span>
            </div>
            <div className="flex justify-between">
              <span>총 기억:</span>
              <span className="font-medium text-gray-900">
                {rooms.reduce((acc, room) => acc + room.items.length, 0)}개
              </span>
            </div>
          </div>
        </div>
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
