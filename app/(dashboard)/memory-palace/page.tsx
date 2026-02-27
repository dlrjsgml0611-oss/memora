'use client';

import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MemoryPalaceVisualization from '@/components/memory-palace/MemoryPalaceVisualization';
import EditItemModal from '@/components/memory-palace/EditItemModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFeedback } from '@/components/ui/feedback';
import { api } from '@/lib/api/client';
import { legacyRoomsToPalaceV2 } from '@/lib/memory-palace/v2';
import type { MemoryPalaceDocumentV2 } from '@/types';
import {
  Castle,
  CheckCircle2,
  Clock3,
  Compass,
  Download,
  Eye,
  EyeOff,
  History,
  LayoutGrid,
  Play,
  Plus,
  RefreshCcw,
  Sparkles,
  Target,
  Trash2,
  WandSparkles,
  XCircle,
} from 'lucide-react';

const MemoryPalace3D = lazy(() => import('@/components/memory-palace/MemoryPalace3D'));

interface MemoryItem {
  id: string;
  content: string;
  position: { x: number; y: number };
  image?: string;
  shape?: 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  height?: number;
}

interface Room {
  id: string;
  name: string;
  description: string;
  items: MemoryItem[];
  color: string;
}

type ViewMode = '2d' | '3d';
type WorldStyleMode = 'voxel' | 'cinematic';
type BiomeMode = 'academy' | 'desert' | 'snow' | 'nether';
type WorkspaceMode = 'build' | 'review';
type ReviewOrder = 'path' | 'shuffle';

interface RecallCard {
  id: string;
  roomId: string;
  roomName: string;
  roomIndex: number;
  itemId: string;
  itemIndex: number;
  zoneLabel: string;
  anchorHint: string;
  cue: string;
  answer: string;
  image?: string;
  color: string;
  retryCount?: number;
}

interface ReviewWeakSpot {
  id: string;
  cue: string;
  answer: string;
  roomId: string;
  roomName: string;
  misses: number;
}

interface ReviewSummary {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  durationSec: number;
  finishedAt: string;
  attemptsTotal?: number;
  correctedAfterRetry?: number;
  weakSpots?: ReviewWeakSpot[];
}

interface MemoryPalaceReviewRecord {
  _id: string;
  palaceId: string;
  palaceTitle: string;
  totalItems: number;
  correctItems: number;
  wrongItems: number;
  accuracy: number;
  durationSec: number;
  finishedAt: string;
}

const QUICK_ANCHORS = [
  { label: '핵심 정의', icon: '📘' },
  { label: '반례/함정', icon: '⚠️' },
  { label: '실전 예시', icon: '🧪' },
  { label: '암기 문장', icon: '🎵' },
  { label: '시험 체크포인트', icon: '✅' },
];

function shuffleArray<T>(source: T[]): T[] {
  const cloned = [...source];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatDuration(durationSec: number) {
  if (!durationSec) return '0분';
  const minutes = Math.max(1, Math.round(durationSec / 60));
  return `${minutes}분`;
}

function describeSpatialZone(position: { x: number; y: number }) {
  const horizontal = position.x < 34 ? '서쪽' : position.x > 66 ? '동쪽' : '중앙';
  const vertical = position.y < 34 ? '북쪽' : position.y > 66 ? '남쪽' : '중심';

  if (horizontal === '중앙' && vertical === '중심') return '중앙 홀';
  if (horizontal === '중앙') return `${vertical} 복도`;
  if (vertical === '중심') return `${horizontal} 벽면`;
  return `${vertical} ${horizontal} 코너`;
}

function buildSpatialCue(room: Room, item: MemoryItem, itemIndex: number) {
  const zoneLabel = describeSpatialZone(item.position);
  const anchorHint = item.image ? `${item.image} 오브젝트` : `${itemIndex + 1}번 오브젝트`;
  return {
    zoneLabel,
    anchorHint,
    cue: `${room.name} · ${zoneLabel} · ${anchorHint}`,
  };
}

export default function MemoryPalacePage() {
  const feedback = useFeedback();
  const [palaces, setPalaces] = useState<MemoryPalaceDocumentV2[]>([]);
  const [selectedPalace, setSelectedPalace] = useState<MemoryPalaceDocumentV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPalaceTitle, setNewPalaceTitle] = useState('');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('build');
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [worldStyle, setWorldStyle] = useState<WorldStyleMode>('voxel');
  const [biomeMode, setBiomeMode] = useState<BiomeMode>('academy');
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MemoryItem | null>(null);
  const [deletingPalaceId, setDeletingPalaceId] = useState<string | null>(null);

  const [reviewOrder, setReviewOrder] = useState<ReviewOrder>('path');
  const [adaptiveReviewEnabled, setAdaptiveReviewEnabled] = useState(true);
  const [reviewQueue, setReviewQueue] = useState<RecallCard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewRevealed, setReviewRevealed] = useState(false);
  const [reviewStats, setReviewStats] = useState({ correct: 0, wrong: 0 });
  const [reviewFirstPassStats, setReviewFirstPassStats] = useState({ correct: 0, wrong: 0 });
  const [reviewUniqueTotal, setReviewUniqueTotal] = useState(0);
  const [reviewFirstOutcome, setReviewFirstOutcome] = useState<Record<string, boolean>>({});
  const [reviewFinalOutcome, setReviewFinalOutcome] = useState<Record<string, boolean>>({});
  const [reviewMissedCounts, setReviewMissedCounts] = useState<Record<string, number>>({});
  const [reviewCardCatalog, setReviewCardCatalog] = useState<Record<string, RecallCard>>({});
  const [reviewStartedAt, setReviewStartedAt] = useState<number | null>(null);
  const [lastReviewSummary, setLastReviewSummary] = useState<ReviewSummary | null>(null);
  const [reviewHistory, setReviewHistory] = useState<MemoryPalaceReviewRecord[]>([]);
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(true);

  useEffect(() => {
    loadPalaces();
  }, []);

  useEffect(() => {
    const roomCount = selectedPalace?.rooms?.length || 0;
    if (roomCount === 0) {
      setCurrentRoomIndex(0);
      return;
    }
    if (currentRoomIndex >= roomCount) {
      setCurrentRoomIndex(0);
    }
  }, [selectedPalace, currentRoomIndex]);

  useEffect(() => {
    setWorkspaceMode('build');
    setReviewQueue([]);
    setReviewIndex(0);
    setReviewRevealed(false);
    setReviewStats({ correct: 0, wrong: 0 });
    setReviewFirstPassStats({ correct: 0, wrong: 0 });
    setReviewUniqueTotal(0);
    setReviewFirstOutcome({});
    setReviewFinalOutcome({});
    setReviewMissedCounts({});
    setReviewCardCatalog({});
    setReviewStartedAt(null);
    setLastReviewSummary(null);
  }, [selectedPalace?._id]);

  useEffect(() => {
    if (workspaceMode !== 'review') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (event.key === ' ' || event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setReviewRevealed((prev) => !prev);
      }

      if (!reviewRevealed) return;

      if (event.key === '1') {
        event.preventDefault();
        void gradeReview(true);
      }
      if (event.key === '2') {
        event.preventDefault();
        void gradeReview(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    workspaceMode,
    reviewRevealed,
    reviewIndex,
    reviewQueue,
    reviewStats,
    reviewFirstPassStats,
    reviewFirstOutcome,
    reviewFinalOutcome,
    reviewMissedCounts,
    reviewStartedAt,
    adaptiveReviewEnabled,
  ]);

  const loadPalaces = async () => {
    try {
      const [palaceResponse, reviewResponse] = await Promise.all([
        api.getMemoryPalaces(),
        api.getMemoryPalaceReviews(40),
      ]);

      if (palaceResponse.success) {
        setPalaces(palaceResponse.data || []);
        if (palaceResponse.data && palaceResponse.data.length > 0) {
          setSelectedPalace(palaceResponse.data[0]);
        }
      }

      if (reviewResponse.success) {
        const historyItems = reviewResponse.data?.items || [];
        setReviewHistory(historyItems);
        if (historyItems.length > 0) {
          const latest = historyItems[0];
          setLastReviewSummary({
            total: latest.totalItems,
            correct: latest.correctItems,
            wrong: latest.wrongItems,
            accuracy: latest.accuracy,
            durationSec: latest.durationSec,
            finishedAt: latest.finishedAt,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load memory palaces:', error);
      feedback.error('기억의 궁전 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setReviewHistoryLoading(false);
    }
  };

  const createSamplePalace = async () => {
    if (!newPalaceTitle.trim()) {
      feedback.warning('궁전 제목을 입력하세요.');
      return;
    }

    const sampleRooms: Room[] = [
      {
        id: 'room-entry',
        name: '현관',
        description: '전체 주제의 인상과 핵심 키워드를 배치',
        color: '#3b82f6',
        items: [
          {
            id: 'item-entry-1',
            content: '주제를 상징하는 한 문장',
            position: { x: 30, y: 36 },
            image: '🗝️',
          },
          {
            id: 'item-entry-2',
            content: '가장 먼저 떠올릴 대표 이미지',
            position: { x: 67, y: 58 },
            image: '🎯',
          },
        ],
      },
      {
        id: 'room-library',
        name: '서재',
        description: '정의, 공식, 기준을 정리',
        color: '#8b5cf6',
        items: [
          {
            id: 'item-library-1',
            content: '핵심 정의',
            position: { x: 42, y: 40 },
            image: '📘',
          },
          {
            id: 'item-library-2',
            content: '시험 빈출 포인트',
            position: { x: 62, y: 62 },
            image: '✅',
          },
        ],
      },
      {
        id: 'room-lab',
        name: '실험실',
        description: '실전 예시와 반례를 대비',
        color: '#14b8a6',
        items: [
          {
            id: 'item-lab-1',
            content: '실전 적용 예시',
            position: { x: 35, y: 48 },
            image: '🧪',
          },
          {
            id: 'item-lab-2',
            content: '헷갈리기 쉬운 함정',
            position: { x: 66, y: 35 },
            image: '⚠️',
          },
        ],
      },
      {
        id: 'room-exit',
        name: '출구 복도',
        description: '회상 순서를 마무리하는 체크 구간',
        color: '#f97316',
        items: [
          {
            id: 'item-exit-1',
            content: '암기 문장 또는 두문자',
            position: { x: 50, y: 52 },
            image: '🎵',
          },
        ],
      },
    ];

    try {
      const response = await api.createMemoryPalace({
        title: newPalaceTitle,
        rooms: sampleRooms,
        palace: legacyRoomsToPalaceV2(sampleRooms),
      });

      if (response.success && response.data) {
        setPalaces((prev) => [response.data!, ...prev]);
        setSelectedPalace(response.data);
        setShowCreateForm(false);
        setNewPalaceTitle('');
        setCurrentRoomIndex(0);
        feedback.success('기억의 궁전을 생성했습니다.');
      }
    } catch (error) {
      console.error('Failed to create memory palace:', error);
      feedback.error('기억의 궁전 생성에 실패했습니다.');
    }
  };

  const deletePalace = async (id: string) => {
    const confirmed = await feedback.confirm({
      title: '기억의 궁전을 삭제할까요?',
      description: '방과 기억 항목이 모두 삭제됩니다.',
      confirmText: '삭제',
      cancelText: '취소',
      destructive: true,
    });

    if (!confirmed) return;

    try {
      setDeletingPalaceId(id);
      await api.deleteMemoryPalace(id);
      const newPalaces = palaces.filter((palace) => palace._id !== id);
      setPalaces(newPalaces);
      if (selectedPalace?._id === id) {
        setSelectedPalace(newPalaces.length > 0 ? newPalaces[0] : null);
      }
      feedback.success('기억의 궁전을 삭제했습니다.');
    } catch (error) {
      feedback.error('삭제에 실패했습니다.');
    } finally {
      setDeletingPalaceId(null);
    }
  };

  const persistPalaceRooms = async (
    palaceId: string,
    updatedRooms: Room[],
    options?: { silent?: boolean }
  ) => {
    try {
      const response = await api.updateMemoryPalace(palaceId, {
        rooms: updatedRooms,
        palace: legacyRoomsToPalaceV2(updatedRooms),
      });

      if (!response.success) {
        if (!options?.silent) {
          feedback.error('기억의 궁전을 저장하지 못했습니다.');
        }
        return false;
      }

      const updatedFromServer = response.data;
      if (!updatedFromServer) {
        if (!options?.silent) {
          feedback.error('기억의 궁전 저장 응답이 비어 있습니다.');
        }
        return false;
      }
      setSelectedPalace(updatedFromServer);
      setPalaces((prev) =>
        prev.map((palace) => (palace._id === updatedFromServer._id ? updatedFromServer : palace))
      );
      return true;
    } catch (error) {
      console.error('Failed to update memory palace:', error);
      if (!options?.silent) {
        feedback.error('기억의 궁전을 저장하지 못했습니다.');
      }
      return false;
    }
  };

  const applyRoomsOptimistically = async (updatedRooms: Room[], options?: { silent?: boolean }) => {
    if (!selectedPalace) return false;

    const previousPalace = selectedPalace;
    const updatedPalace = {
      ...selectedPalace,
      rooms: updatedRooms,
    };

    setSelectedPalace(updatedPalace);
    setPalaces((prev) => prev.map((palace) => (palace._id === updatedPalace._id ? updatedPalace : palace)));

    const saved = await persistPalaceRooms(selectedPalace._id, updatedRooms, options);
    if (!saved) {
      setSelectedPalace(previousPalace);
      setPalaces((prev) => prev.map((palace) => (palace._id === previousPalace._id ? previousPalace : palace)));
    }

    return saved;
  };

  const currentRoom: Room | null = useMemo(() => {
    if (!selectedPalace?.rooms || selectedPalace.rooms.length === 0) return null;
    const index = Math.max(0, Math.min(currentRoomIndex, selectedPalace.rooms.length - 1));
    return selectedPalace.rooms[index] as Room;
  }, [selectedPalace, currentRoomIndex]);

  const handleSelectRoom = (roomId: string) => {
    if (!selectedPalace?.rooms) return;
    const index = selectedPalace.rooms.findIndex((room: Room) => room.id === roomId);
    if (index >= 0) {
      setCurrentRoomIndex(index);
      setSelectedItem(null);
    }
  };

  const handleAddItem = async (roomId: string, item: Omit<MemoryItem, 'id'>) => {
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

    await applyRoomsOptimistically(updatedRooms);
  };

  const handleDeleteItem = async (roomId: string, itemId: string) => {
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

    await applyRoomsOptimistically(updatedRooms);
  };

  const handleUpdateItem = async (
    roomId: string,
    itemId: string,
    data: {
      content?: string;
      image?: string;
      position?: { x: number; y: number };
      shape?: 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
      size?: 'small' | 'medium' | 'large';
      color?: string;
      height?: number;
    }
  ) => {
    if (!selectedPalace) return;

    const updatedRooms = selectedPalace.rooms.map((room: Room) => {
      if (room.id === roomId) {
        return {
          ...room,
          items: room.items.map((item: MemoryItem) => (item.id === itemId ? { ...item, ...data } : item)),
        };
      }
      return room;
    });

    await applyRoomsOptimistically(updatedRooms, { silent: true });
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
    const saved = await applyRoomsOptimistically(updatedRooms);
    if (saved) {
      setCurrentRoomIndex(updatedRooms.length - 1);
    }
  };

  const handleUpdateRoom = async (roomId: string, data: { name?: string; description?: string; color?: string }) => {
    if (!selectedPalace) return;

    const updatedRooms = selectedPalace.rooms.map((room: Room) =>
      room.id === roomId ? { ...room, ...data } : room
    );

    await applyRoomsOptimistically(updatedRooms);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!selectedPalace) return;

    const updatedRooms = selectedPalace.rooms.filter((room: Room) => room.id !== roomId);
    if (updatedRooms.length === 0) {
      feedback.warning('최소 1개의 방은 유지되어야 합니다.');
      return;
    }

    const saved = await applyRoomsOptimistically(updatedRooms);
    if (saved) {
      setCurrentRoomIndex((prev) => Math.max(0, Math.min(prev, updatedRooms.length - 1)));
    }
  };

  const addQuickAnchor = async (label: string, icon: string) => {
    if (!selectedPalace || !currentRoom) return;

    const newItem: MemoryItem = {
      id: `item-${Date.now()}`,
      content: label,
      image: icon,
      position: {
        x: clamp(20 + Math.random() * 60, 8, 92),
        y: clamp(20 + Math.random() * 60, 8, 92),
      },
      shape: 'card',
      size: 'medium',
      color: currentRoom.color || '#3b82f6',
    };

    const updatedRooms = selectedPalace.rooms.map((room: Room) =>
      room.id === currentRoom.id
        ? {
            ...room,
            items: [...room.items, newItem],
          }
        : room
    );

    const saved = await applyRoomsOptimistically(updatedRooms, { silent: true });
    if (saved) {
      feedback.success(`"${label}" 항목을 추가했습니다.`);
    }
  };

  const autoArrangeCurrentRoom = async () => {
    if (!selectedPalace || !currentRoom) return;
    if (!currentRoom.items || currentRoom.items.length === 0) {
      feedback.info('자동 배치할 항목이 없습니다.');
      return;
    }

    const items = currentRoom.items;
    const cols = Math.ceil(Math.sqrt(items.length));
    const rows = Math.ceil(items.length / cols);

    const arrangedItems = items.map((item: MemoryItem, index: number) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = cols === 1 ? 50 : 14 + (col / (cols - 1)) * 72;
      const y = rows === 1 ? 50 : 18 + (row / (rows - 1)) * 64;

      return {
        ...item,
        position: {
          x: Number(clamp(x, 8, 92).toFixed(1)),
          y: Number(clamp(y, 8, 92).toFixed(1)),
        },
      };
    });

    const updatedRooms = selectedPalace.rooms.map((room: Room) =>
      room.id === currentRoom.id
        ? {
            ...room,
            items: arrangedItems,
          }
        : room
    );

    const saved = await applyRoomsOptimistically(updatedRooms);
    if (saved) {
      feedback.success('현재 방 항목을 자동 배치했습니다.');
    }
  };

  const buildReviewQueue = (order: ReviewOrder): RecallCard[] => {
    if (!selectedPalace?.rooms) return [];

    const queue = selectedPalace.rooms.flatMap((room: Room, roomIndex: number) =>
      (room.items || []).map((item: MemoryItem, itemIndex: number) => {
        const cuePack = buildSpatialCue(room, item, itemIndex);
        return {
          id: `${room.id}:${item.id}`,
          roomId: room.id,
          roomName: room.name,
          roomIndex,
          itemId: item.id,
          itemIndex,
          zoneLabel: cuePack.zoneLabel,
          anchorHint: cuePack.anchorHint,
          cue: cuePack.cue,
          answer: item.content,
          image: item.image,
          color: room.color || '#3b82f6',
          retryCount: 0,
        };
      })
    );

    return order === 'shuffle' ? shuffleArray(queue) : queue;
  };

  const startReviewSession = () => {
    const queue = buildReviewQueue(reviewOrder);
    if (queue.length === 0) {
      feedback.warning('회상 훈련을 시작하려면 기억 항목이 필요합니다.');
      return;
    }

    const catalog = Object.fromEntries(queue.map((card) => [card.id, card]));

    setReviewQueue(queue);
    setReviewCardCatalog(catalog);
    setReviewIndex(0);
    setReviewRevealed(false);
    setReviewStats({ correct: 0, wrong: 0 });
    setReviewFirstPassStats({ correct: 0, wrong: 0 });
    setReviewUniqueTotal(queue.length);
    setReviewFirstOutcome({});
    setReviewFinalOutcome({});
    setReviewMissedCounts({});
    setReviewStartedAt(Date.now());
    setLastReviewSummary(null);
    setWorkspaceMode('review');
  };

  const finishReviewSession = async (payload: {
    attemptStats: { correct: number; wrong: number };
    firstPassStats: { correct: number; wrong: number };
    firstOutcome: Record<string, boolean>;
    finalOutcome: Record<string, boolean>;
    missedCounts: Record<string, number>;
  }) => {
    const total = reviewUniqueTotal || Object.keys(payload.firstOutcome).length;
    const correctFirstPass = payload.firstPassStats.correct;
    const wrongFirstPass = Math.max(total - correctFirstPass, 0);
    const accuracy = total === 0 ? 0 : Math.round((correctFirstPass / total) * 100);
    const durationSec = reviewStartedAt ? Math.max(1, Math.round((Date.now() - reviewStartedAt) / 1000)) : 0;

    const weakSpots = Object.entries(payload.missedCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, misses]) => {
        const card = reviewCardCatalog[id];
        return {
          id,
          cue: card?.cue || '기억 지점',
          answer: card?.answer || '내용 없음',
          roomId: card?.roomId || '',
          roomName: card?.roomName || '',
          misses,
        } satisfies ReviewWeakSpot;
      });

    const correctedAfterRetry = Object.entries(payload.firstOutcome).filter(
      ([id, firstPassCorrect]) => !firstPassCorrect && payload.finalOutcome[id]
    ).length;

    const summary: ReviewSummary = {
      total,
      correct: correctFirstPass,
      wrong: wrongFirstPass,
      accuracy,
      durationSec,
      finishedAt: new Date().toISOString(),
      attemptsTotal: payload.attemptStats.correct + payload.attemptStats.wrong,
      correctedAfterRetry,
      weakSpots,
    };

    setLastReviewSummary(summary);
    setWorkspaceMode('build');
    setReviewQueue([]);
    setReviewIndex(0);
    setReviewRevealed(false);
    setReviewStartedAt(null);

    if (selectedPalace?._id && total > 0) {
      try {
        const saveResponse: any = await api.createMemoryPalaceReview({
          palaceId: selectedPalace._id,
          palaceTitle: selectedPalace.title,
          totalItems: total,
          correctItems: correctFirstPass,
          wrongItems: wrongFirstPass,
          accuracy,
          durationSec,
          finishedAt: summary.finishedAt,
        });

        if (saveResponse?.success && saveResponse.data) {
          const saved = saveResponse.data as MemoryPalaceReviewRecord;
          setReviewHistory((prev) => [saved, ...prev.filter((item) => item._id !== saved._id)].slice(0, 40));
        }
      } catch (error) {
        console.error('Failed to save memory palace review:', error);
        feedback.warning('회상 결과 저장에 실패했습니다. 네트워크 상태를 확인해 주세요.');
      }
    }

    feedback.success(`회상 훈련 완료: 1차 정답률 ${accuracy}% (${correctFirstPass}/${total}) · 재도전 복구 ${correctedAfterRetry}개`);
  };

  const gradeReview = (correct: boolean) => {
    if (reviewQueue.length === 0) return;
    const card = reviewQueue[reviewIndex];
    if (!card) return;
    const cardId = card.id;

    const nextStats = {
      correct: reviewStats.correct + (correct ? 1 : 0),
      wrong: reviewStats.wrong + (correct ? 0 : 1),
    };
    setReviewStats(nextStats);

    let nextFirstOutcome = reviewFirstOutcome;
    let nextFirstPassStats = reviewFirstPassStats;
    if (typeof reviewFirstOutcome[cardId] === 'undefined') {
      nextFirstOutcome = {
        ...reviewFirstOutcome,
        [cardId]: correct,
      };
      nextFirstPassStats = {
        correct: reviewFirstPassStats.correct + (correct ? 1 : 0),
        wrong: reviewFirstPassStats.wrong + (correct ? 0 : 1),
      };
      setReviewFirstOutcome(nextFirstOutcome);
      setReviewFirstPassStats(nextFirstPassStats);
    }

    const nextFinalOutcome = {
      ...reviewFinalOutcome,
      [cardId]: correct || Boolean(reviewFinalOutcome[cardId]),
    };
    setReviewFinalOutcome(nextFinalOutcome);

    let nextMissedCounts = reviewMissedCounts;
    if (!correct) {
      nextMissedCounts = {
        ...reviewMissedCounts,
        [cardId]: (reviewMissedCounts[cardId] || 0) + 1,
      };
      setReviewMissedCounts(nextMissedCounts);
    }

    let nextQueue = reviewQueue;
    if (adaptiveReviewEnabled && !correct && (card.retryCount || 0) < 1) {
      const retryCard: RecallCard = {
        ...card,
        retryCount: (card.retryCount || 0) + 1,
      };
      nextQueue = [...reviewQueue, retryCard];
      setReviewQueue(nextQueue);
    }

    const isLast = reviewIndex >= nextQueue.length - 1;
    if (isLast) {
      void finishReviewSession({
        attemptStats: nextStats,
        firstPassStats: nextFirstPassStats,
        firstOutcome: nextFirstOutcome,
        finalOutcome: nextFinalOutcome,
        missedCounts: nextMissedCounts,
      });
      return;
    }

    setReviewIndex((prev) => prev + 1);
    setReviewRevealed(false);
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
        text += '  (비어있음)\n';
      }

      text += '\n';
    });

    return text;
  };

  const handleExport = () => {
    if (!selectedPalace) return;

    const exportText = generatePalaceText(selectedPalace);
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedPalace.title}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    feedback.success('기억의 궁전을 텍스트 파일로 내보냈습니다.');
  };

  const palaceRoomsFor3D = selectedPalace?.palace?.rooms?.length
    ? selectedPalace.palace.rooms
    : selectedPalace?.rooms || [];
  const roomCount = palaceRoomsFor3D.length;
  const itemCount = selectedPalace?.rooms?.reduce((sum: number, room: Room) => sum + room.items.length, 0) || 0;
  const activeRoom3D = palaceRoomsFor3D[currentRoomIndex] || null;
  const selectedPalaceReviewHistory = useMemo(() => {
    if (reviewHistory.length === 0) return [];
    if (!selectedPalace?._id) return reviewHistory.slice(0, 8);

    return reviewHistory
      .filter((review) => String(review.palaceId) === String(selectedPalace._id))
      .slice(0, 8);
  }, [reviewHistory, selectedPalace?._id]);
  const recentAccuracy = lastReviewSummary?.accuracy ?? selectedPalaceReviewHistory[0]?.accuracy ?? null;
  const recentWeakSpots = lastReviewSummary?.weakSpots || [];

  const reviewCard = reviewQueue[reviewIndex] || null;
  const reviewProgress = reviewQueue.length > 0 ? Math.round(((reviewIndex + 1) / reviewQueue.length) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-6 md:p-8 shadow-sm">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-orange-200/40 blur-2xl" />
          <div className="absolute -left-8 -bottom-12 h-44 w-44 rounded-full bg-amber-200/35 blur-2xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-amber-700">MEMORY PALACE STUDIO</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">기억의 궁전 리빌드</h1>
              <p className="mt-2 text-sm text-slate-600 md:text-base">
                설계(배치/편집)와 회상 훈련(인출 연습)을 분리해 실제 기억 성능까지 끌어올립니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white/80">
                <button
                  onClick={() => setWorkspaceMode('build')}
                  className={`px-3 py-1.5 text-sm font-semibold transition ${
                    workspaceMode === 'build' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  설계
                </button>
                <button
                  onClick={startReviewSession}
                  className={`px-3 py-1.5 text-sm font-semibold transition ${
                    workspaceMode === 'review' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  회상 훈련
                </button>
              </div>
              <Button onClick={() => setShowCreateForm((prev) => !prev)}>
                <Plus className="mr-2 h-4 w-4" />
                새 궁전
              </Button>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs text-slate-500">내 궁전 수</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{palaces.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs text-slate-500">현재 방 수</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{roomCount}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs text-slate-500">총 기억 항목</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{itemCount}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs text-slate-500">최근 회상 정답률</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {recentAccuracy !== null ? `${recentAccuracy}%` : '-'}
              </p>
            </div>
          </div>
        </section>

        {showCreateForm && (
          <Card className="border-amber-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                새 기억의 궁전 만들기
              </CardTitle>
              <CardDescription>주제를 입력하면 복습 경로가 포함된 샘플 궁전을 즉시 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  placeholder="예: 운영체제 핵심 개념"
                  value={newPalaceTitle}
                  onChange={(event) => setNewPalaceTitle(event.target.value)}
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
            <CardContent className="p-12 text-center text-slate-500">기억의 궁전을 불러오는 중...</CardContent>
          </Card>
        ) : palaces.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 p-12 text-center">
              <Castle className="mx-auto h-10 w-10 text-amber-500" />
              <h3 className="text-xl font-semibold text-slate-900">아직 기억의 궁전이 없습니다</h3>
              <p className="mx-auto max-w-lg text-slate-600">
                장소법은 정보를 공간 경로에 배치해 회상률을 높이는 기법입니다. 샘플 궁전을 만든 뒤, 본인만의 방 구조로 바꿔보세요.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>첫 궁전 만들기</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-3">
              <Card className="border-slate-200/70 bg-white/90">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">내 궁전</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {palaces.map((palace) => {
                    const isSelected = selectedPalace?._id === palace._id;
                    return (
                      <div
                        key={palace._id}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-amber-300 bg-amber-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          setSelectedPalace(palace);
                          setCurrentRoomIndex(0);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedPalace(palace);
                            setCurrentRoomIndex(0);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{palace.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{palace.rooms?.length || 0}개의 방</p>
                            <p className="text-[11px] text-slate-400">
                              {palace.createdAt ? new Date(palace.createdAt).toLocaleDateString('ko-KR') : '날짜 없음'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void deletePalace(palace._id);
                            }}
                            className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label="궁전 삭제"
                            disabled={deletingPalaceId === palace._id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {selectedPalace && (
                <Card className="border-slate-200/70 bg-white/95">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Compass className="h-4 w-4 text-amber-600" />
                      방 경로
                    </CardTitle>
                    <CardDescription>복습 순서대로 방을 이동하며 고정하세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedPalace.rooms?.map((room: Room, index: number) => {
                      const active = currentRoom?.id === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => handleSelectRoom(room.id)}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                            active
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {index + 1}. {room.name}
                              </p>
                              <p className="text-xs text-slate-500">{room.items?.length || 0}개 항목</p>
                            </div>
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: room.color || '#3b82f6' }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {workspaceMode === 'build' && currentRoom && (
                <Card className="border-slate-200/70 bg-white/95">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <WandSparkles className="h-4 w-4 text-amber-600" />
                      빠른 앵커
                    </CardTitle>
                    <CardDescription>{currentRoom.name}에 자주 쓰는 기억 앵커를 즉시 추가합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2">
                    {QUICK_ANCHORS.map((anchor) => (
                      <button
                        key={anchor.label}
                        type="button"
                        onClick={() => void addQuickAnchor(anchor.label, anchor.icon)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-amber-300 hover:bg-amber-50"
                      >
                        {anchor.icon} {anchor.label}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="border-slate-200/70 bg-white/95">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-amber-600" />
                    최근 회상 기록
                  </CardTitle>
                  <CardDescription>
                    {selectedPalace
                      ? `${selectedPalace.title} 기준 최신 세션`
                      : '최근 회상 세션'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reviewHistoryLoading ? (
                    <p className="text-sm text-slate-500">회상 기록을 불러오는 중...</p>
                  ) : selectedPalaceReviewHistory.length === 0 ? (
                    <p className="text-sm text-slate-500">아직 저장된 회상 기록이 없습니다.</p>
                  ) : (
                    selectedPalaceReviewHistory.map((review) => (
                      <div
                        key={review._id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            정답률 {review.accuracy}%
                          </p>
                          <p className="text-xs text-slate-500">
                            {review.correctItems}/{review.totalItems}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <p>{new Date(review.finishedAt).toLocaleString('ko-KR')}</p>
                          <p className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {formatDuration(review.durationSec)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200/70 bg-white/95">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-rose-500" />
                    최근 약점 포인트
                  </CardTitle>
                  <CardDescription>직전 회상 세션 기준 반복 오답 항목</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentWeakSpots.length === 0 ? (
                    <p className="text-sm text-slate-500">아직 분석할 약점 데이터가 없습니다.</p>
                  ) : (
                    recentWeakSpots.map((spot) => (
                      <div key={spot.id} className="rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{spot.cue}</p>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{spot.answer}</p>
                        <p className="mt-1 text-[11px] text-rose-600">오답 {spot.misses}회 · {spot.roomName}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="xl:col-span-9">
              {selectedPalace ? (
                workspaceMode === 'build' ? (
                  <Card className="border-slate-200/70 bg-white/95 shadow-sm">
                    <CardHeader>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <CardTitle>{selectedPalace.title}</CardTitle>
                          <CardDescription>
                            {currentRoom
                              ? `${currentRoom.name} · ${currentRoom.items.length}개 항목`
                              : '방을 선택해 기억을 배치하세요.'}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex overflow-hidden rounded-xl border border-slate-200">
                            <button
                              onClick={() => setViewMode('3d')}
                              className={`px-3 py-1.5 text-sm font-semibold transition ${
                                viewMode === '3d' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              3D
                            </button>
                            <button
                              onClick={() => setViewMode('2d')}
                              className={`px-3 py-1.5 text-sm font-semibold transition ${
                                viewMode === '2d' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              2D
                            </button>
                          </div>
                          {viewMode === '3d' && (
                            <div className="flex overflow-hidden rounded-xl border border-slate-200">
                              <button
                                onClick={() => setWorldStyle('voxel')}
                                className={`px-3 py-1.5 text-sm font-semibold transition ${
                                  worldStyle === 'voxel' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                VOXEL
                              </button>
                              <button
                                onClick={() => setWorldStyle('cinematic')}
                                className={`px-3 py-1.5 text-sm font-semibold transition ${
                                  worldStyle === 'cinematic' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                클래식
                              </button>
                            </div>
                          )}
                          {viewMode === '3d' && (
                            <div className="flex overflow-hidden rounded-xl border border-slate-200">
                              {[
                                { id: 'academy', label: '아카데미' },
                                { id: 'desert', label: '사막' },
                                { id: 'snow', label: '설원' },
                                { id: 'nether', label: '화염' },
                              ].map((biome) => (
                                <button
                                  key={biome.id}
                                  onClick={() => setBiomeMode(biome.id as BiomeMode)}
                                  className={`px-2.5 py-1.5 text-xs font-semibold transition ${
                                    biomeMode === biome.id ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {biome.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <Button variant="outline" onClick={() => void autoArrangeCurrentRoom()}>
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            자동 배치
                          </Button>
                          <Button variant="outline" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            내보내기
                          </Button>
                          <Button onClick={startReviewSession}>
                            <Play className="mr-2 h-4 w-4" />
                            회상 훈련 시작
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {viewMode === '3d' ? (
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                            {palaceRoomsFor3D.map((room, index: number) => {
                              const active = currentRoomIndex === index;
                              return (
                                <button
                                  key={room.id}
                                  type="button"
                                  onClick={() => setCurrentRoomIndex(index)}
                                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                    active
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-white text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {index + 1}. {room.name}
                                </button>
                              );
                            })}
                          </div>

                          <Suspense
                            fallback={
                              <div className="flex h-[600px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                                3D 뷰 로딩 중...
                              </div>
                            }
                          >
                            {activeRoom3D && (
                              <MemoryPalace3D
                                room={activeRoom3D}
                                styleMode={worldStyle}
                                biomeId={biomeMode}
                                roomIndex={currentRoomIndex}
                                roomCount={palaceRoomsFor3D.length}
                                onPortalNavigate={(direction) => {
                                  setCurrentRoomIndex((prev) => {
                                    const next = direction === 'prev' ? prev - 1 : prev + 1;
                                    return Math.max(0, Math.min(palaceRoomsFor3D.length - 1, next));
                                  });
                                  setSelectedItem(null);
                                }}
                                selectedItem={selectedItem}
                                onSelectItem={setSelectedItem}
                                onEditItem={(item) => setEditingItem(item)}
                                onUpdateItem={(itemId, data) => {
                                  const targetRoomId = selectedPalace.rooms?.[currentRoomIndex]?.id || activeRoom3D.id;
                                  void handleUpdateItem(targetRoomId, itemId, data);
                                }}
                              />
                            )}
                          </Suspense>

                          <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-sm text-slate-600">
                            더블클릭으로 항목 편집, 드래그로 위치 이동, Shift+드래그로 높이 조절이 가능합니다.
                            {worldStyle === 'voxel'
                              ? ' VOXEL 모드에서는 위치가 블록 격자에 스냅되어 동선 기억이 더 선명해집니다.'
                              : ' 클래식 모드에서는 자유 배치로 섬세한 공간 스토리텔링이 가능합니다.'}
                            {' '}탐험 ON이면 WASD + Space로 캐릭터를 직접 움직이며, 포털과 퀘스트로 RPG식 회상 동선을 진행할 수 있습니다.
                          </div>
                        </div>
                      ) : (
                        <MemoryPalaceVisualization
                          rooms={selectedPalace.rooms || []}
                          activeRoomId={currentRoom?.id}
                          onActiveRoomChange={handleSelectRoom}
                          onAddItem={(roomId, item) => {
                            void handleAddItem(roomId, item);
                          }}
                          onDeleteItem={(roomId, itemId) => {
                            void handleDeleteItem(roomId, itemId);
                          }}
                          onUpdateItem={(roomId, itemId, data) => {
                            void handleUpdateItem(roomId, itemId, data);
                          }}
                          onAddRoom={(room) => {
                            void handleAddRoom(room);
                          }}
                          onUpdateRoom={(roomId, data) => {
                            void handleUpdateRoom(roomId, data);
                          }}
                          onDeleteRoom={(roomId) => {
                            void handleDeleteRoom(roomId);
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-slate-200/70 bg-white/95 shadow-sm">
                    <CardHeader>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-amber-600" />
                            회상 훈련 모드
                          </CardTitle>
                          <CardDescription>
                            cue를 보고 답을 떠올린 뒤 채점하세요. `Space` 또는 `R`: 정답 보기, `1`: 기억남, `2`: 헷갈림
                            {adaptiveReviewEnabled ? ' · 오답 항목은 자동 재도전됩니다.' : ''}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex overflow-hidden rounded-xl border border-slate-200">
                            <button
                              onClick={() => setReviewOrder('path')}
                              className={`px-3 py-1.5 text-sm font-semibold transition ${
                                reviewOrder === 'path' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              경로순
                            </button>
                            <button
                              onClick={() => setReviewOrder('shuffle')}
                              className={`px-3 py-1.5 text-sm font-semibold transition ${
                                reviewOrder === 'shuffle' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              섞기
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdaptiveReviewEnabled((prev) => !prev)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              adaptiveReviewEnabled
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            적응형 재도전 {adaptiveReviewEnabled ? 'ON' : 'OFF'}
                          </button>
                          <Button variant="outline" onClick={startReviewSession}>
                            재시작
                          </Button>
                          <Button variant="outline" onClick={() => setWorkspaceMode('build')}>
                            설계로 돌아가기
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {reviewCard ? (
                        <>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                              <span>
                                진행도 {reviewIndex + 1} / {reviewQueue.length}
                              </span>
                              <span>
                                1차 기억남 {reviewFirstPassStats.correct}/{reviewUniqueTotal || reviewQueue.length} · 총 시도 {reviewStats.correct + reviewStats.wrong}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200">
                              <div
                                className="h-2 rounded-full bg-amber-500 transition-all"
                                style={{ width: `${reviewProgress}%` }}
                              />
                            </div>
                          </div>

                          <div
                            className="rounded-3xl border p-6"
                            style={{
                              borderColor: `${reviewCard.color}66`,
                              background: `linear-gradient(135deg, ${reviewCard.color}11 0%, #ffffff 65%)`,
                            }}
                          >
                            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">RECALL CUE</p>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900">{reviewCard.cue}</h3>
                            <p className="mt-1 text-sm text-slate-500">
                              방 {reviewCard.roomIndex + 1} · 항목 {reviewCard.itemIndex + 1}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              공간 힌트: {reviewCard.zoneLabel} · 랜드마크: {reviewCard.anchorHint}
                            </p>
                            {(reviewCard.retryCount || 0) > 0 && (
                              <p className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                <RefreshCcw className="mr-1 h-3 w-3" />
                                재도전 라운드
                              </p>
                            )}

                            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-5">
                              {!reviewRevealed ? (
                                <div className="text-center">
                                  <p className="text-sm text-slate-600">정답을 떠올린 후 공개하세요.</p>
                                  <p className="mt-3 text-5xl">{reviewCard.image || '🧠'}</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold tracking-[0.15em] text-slate-500">ANSWER</p>
                                  <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-900">{reviewCard.answer}</p>
                                </div>
                              )}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setReviewRevealed((prev) => !prev)}
                              >
                                {reviewRevealed ? (
                                  <>
                                    <EyeOff className="mr-2 h-4 w-4" />
                                    정답 숨기기
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-2 h-4 w-4" />
                                    정답 보기
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => void gradeReview(true)}
                                disabled={!reviewRevealed}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                기억남 (1)
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => void gradeReview(false)}
                                disabled={!reviewRevealed}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                헷갈림 (2)
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                          회상할 항목이 없습니다. 설계 모드에서 기억 항목을 먼저 추가하세요.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-slate-500">왼쪽 목록에서 궁전을 선택하세요.</CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {editingItem && (
          <EditItemModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(itemId, data) => {
              if (selectedPalace?.rooms?.[currentRoomIndex]) {
                void handleUpdateItem(selectedPalace.rooms[currentRoomIndex].id, itemId, {
                  ...data,
                  shape: data.shape as 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card' | undefined,
                  size: data.size as 'small' | 'medium' | 'large' | undefined,
                });
              }
              setEditingItem(null);
            }}
          />
        )}

        <Card className="border-amber-200/70 bg-gradient-to-r from-amber-50 to-rose-50">
          <CardHeader>
            <CardTitle className="text-lg">기억의 궁전 훈련 가이드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>1) 방마다 역할을 고정하세요: 정의/예시/함정/정리.</p>
            <p>2) 항목은 짧은 문장 + 강한 이미지(이모지) 조합으로 만드세요.</p>
            <p>3) 회상 훈련에서 헷갈린 항목은 색상/크기를 더 과장해 재배치하세요.</p>
            <p>4) 시험 전에는 경로순 회상 후, 섞기 모드로 최종 점검하세요.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
