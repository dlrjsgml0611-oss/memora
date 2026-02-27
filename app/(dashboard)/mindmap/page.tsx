'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MindMapVisualization from '@/components/mindmap/MindMapVisualization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFeedback } from '@/components/ui/feedback';
import { api } from '@/lib/api/client';
import { hierarchyToMindmapV2 } from '@/lib/mindmap/v2';
import type { LegacyMindMapNode, MindmapDocumentV2 } from '@/types';
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Play,
  Plus,
  Shuffle,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';

interface MindMapNode extends LegacyMindMapNode {}

type WorkspaceMode = 'build' | 'recall';
type RecallOrder = 'path' | 'depth' | 'shuffle';

interface MindmapRecallCard {
  id: string;
  name: string;
  image?: string;
  depth: number;
  ancestorPath: string[];
  parentName?: string;
  childCount: number;
  isLeaf: boolean;
  retryCount?: number;
}

interface MindmapRecallSummary {
  totalUnique: number;
  correctFirstPass: number;
  wrongFirstPass: number;
  accuracy: number;
  attemptsTotal: number;
  durationSec: number;
  weakCards: Array<{
    id: string;
    name: string;
    misses: number;
    parentName?: string;
  }>;
}

const countNodes = (node: MindMapNode): number => {
  if (!node) return 0;
  let count = 1;
  if (node.children) {
    node.children.forEach((child) => {
      count += countNodes(child);
    });
  }
  return count;
};

function shuffleArray<T>(source: T[]): T[] {
  const cloned = [...source];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function formatDuration(durationSec: number) {
  if (!durationSec) return '0분';
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  if (minutes === 0) return `${seconds}초`;
  return `${minutes}분 ${seconds}초`;
}

function collectRecallCards(root?: MindMapNode | null): MindmapRecallCard[] {
  if (!root) return [];

  const cards: MindmapRecallCard[] = [];

  const traverse = (node: MindMapNode, ancestorPath: string[], depth: number) => {
    if (depth > 0) {
      cards.push({
        id: node.id,
        name: node.name,
        image: node.image,
        depth,
        ancestorPath,
        parentName: ancestorPath[ancestorPath.length - 1],
        childCount: node.children?.length || 0,
        isLeaf: (node.children?.length || 0) === 0,
      });
    }

    (node.children || []).forEach((child) => {
      traverse(child, [...ancestorPath, node.name], depth + 1);
    });
  };

  traverse(root, [], 0);
  return cards;
}

function buildRecallQueue(cards: MindmapRecallCard[], order: RecallOrder): MindmapRecallCard[] {
  if (order === 'shuffle') {
    return shuffleArray(cards).map((card) => ({ ...card, retryCount: 0 }));
  }

  if (order === 'depth') {
    return [...cards]
      .sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        return b.childCount - a.childCount;
      })
      .map((card) => ({ ...card, retryCount: 0 }));
  }

  return cards.map((card) => ({ ...card, retryCount: 0 }));
}

export default function MindmapPage() {
  const feedback = useFeedback();
  const [mindmaps, setMindmaps] = useState<MindmapDocumentV2[]>([]);
  const [selectedMindmap, setSelectedMindmap] = useState<MindmapDocumentV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState('');
  const [deletingMindmapId, setDeletingMindmapId] = useState<string | null>(null);
  const visualizationContainerRef = useRef<HTMLDivElement>(null);
  const [visualizationWidth, setVisualizationWidth] = useState(980);

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('build');
  const [recallOrder, setRecallOrder] = useState<RecallOrder>('path');
  const [adaptiveRetryEnabled, setAdaptiveRetryEnabled] = useState(true);
  const [recallQueue, setRecallQueue] = useState<MindmapRecallCard[]>([]);
  const [recallIndex, setRecallIndex] = useState(0);
  const [recallRevealed, setRecallRevealed] = useState(false);
  const [recallAttemptStats, setRecallAttemptStats] = useState({ correct: 0, wrong: 0 });
  const [recallFirstPassStats, setRecallFirstPassStats] = useState({ correct: 0, wrong: 0 });
  const [recallStartedAt, setRecallStartedAt] = useState<number | null>(null);
  const [recallUniqueTotal, setRecallUniqueTotal] = useState(0);
  const [recallMissedCounts, setRecallMissedCounts] = useState<Record<string, number>>({});
  const [recallFirstOutcome, setRecallFirstOutcome] = useState<Record<string, boolean>>({});
  const [recallFinalOutcome, setRecallFinalOutcome] = useState<Record<string, boolean>>({});
  const [recallCardCatalog, setRecallCardCatalog] = useState<Record<string, MindmapRecallCard>>({});
  const [lastRecallSummary, setLastRecallSummary] = useState<MindmapRecallSummary | null>(null);

  useEffect(() => {
    loadMindmaps();
  }, []);

  useEffect(() => {
    if (!visualizationContainerRef.current || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width || 980;
      setVisualizationWidth(Math.max(340, Math.floor(width) - 24));
    });

    observer.observe(visualizationContainerRef.current);
    return () => observer.disconnect();
  }, [selectedMindmap]);

  const selectedStructure = selectedMindmap?.structure as MindMapNode | undefined;
  const recallBaseCards = useMemo(() => collectRecallCards(selectedStructure), [selectedStructure]);

  const selectedNodeCount = selectedMindmap?.structure ? countNodes(selectedMindmap.structure) : 0;
  const recentRecallAccuracy = lastRecallSummary?.accuracy ?? null;

  const structureInsights = useMemo(() => {
    const root = selectedStructure;
    const rootChildren = root?.children || [];
    const underdevelopedTopBranches = rootChildren
      .filter((child) => (child.children?.length || 0) < 2)
      .map((child) => child.name)
      .slice(0, 4);

    const leafCount = recallBaseCards.filter((card) => card.isLeaf).length;
    const deepLeafCount = recallBaseCards.filter((card) => card.isLeaf && card.depth >= 3).length;

    return {
      topBranchCount: rootChildren.length,
      leafCount,
      deepLeafCount,
      underdevelopedTopBranches,
    };
  }, [selectedStructure, recallBaseCards]);

  const resetRecallState = (clearSummary = false) => {
    setRecallQueue([]);
    setRecallIndex(0);
    setRecallRevealed(false);
    setRecallAttemptStats({ correct: 0, wrong: 0 });
    setRecallFirstPassStats({ correct: 0, wrong: 0 });
    setRecallStartedAt(null);
    setRecallUniqueTotal(0);
    setRecallMissedCounts({});
    setRecallFirstOutcome({});
    setRecallFinalOutcome({});
    setRecallCardCatalog({});
    if (clearSummary) {
      setLastRecallSummary(null);
    }
  };

  useEffect(() => {
    setWorkspaceMode('build');
    resetRecallState(true);
  }, [selectedMindmap?._id]);

  const loadMindmaps = async () => {
    try {
      const response = await api.getMindmaps();
      if (response.success) {
        setMindmaps(response.data || []);
        if (response.data && response.data.length > 0) {
          setSelectedMindmap(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load mindmaps:', error);
      feedback.error('마인드맵 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const createSampleMindmap = async () => {
    if (!newMapTitle.trim()) {
      feedback.warning('마인드맵 제목을 입력하세요.');
      return;
    }

    const sampleData: MindMapNode = {
      id: 'root',
      name: newMapTitle,
      children: [
        {
          id: 'concept-1',
          name: '핵심 원리',
          children: [
            { id: 'concept-1-1', name: '정의' },
            { id: 'concept-1-2', name: '직관적 예시' },
          ],
        },
        {
          id: 'concept-2',
          name: '문제 해결',
          children: [
            { id: 'concept-2-1', name: '자주 틀리는 포인트' },
            { id: 'concept-2-2', name: '체크리스트' },
          ],
        },
        {
          id: 'concept-3',
          name: '기억 연결고리',
          children: [
            { id: 'concept-3-1', name: '연상 이미지' },
            { id: 'concept-3-2', name: '암기 문장' },
          ],
        },
      ],
    };

    try {
      const response = await api.createMindmap({
        title: newMapTitle,
        structure: sampleData,
        mindmap: hierarchyToMindmapV2(sampleData),
      });

      if (response.success && response.data) {
        setMindmaps((prev) => [response.data!, ...prev]);
        setSelectedMindmap(response.data);
        setShowCreateForm(false);
        setNewMapTitle('');
        feedback.success('새 마인드맵이 생성되었습니다.');
      }
    } catch (error) {
      console.error('Failed to create mindmap:', error);
      feedback.error('마인드맵 생성에 실패했습니다.');
    }
  };

  const deleteMindmap = async (id: string) => {
    const confirmed = await feedback.confirm({
      title: '마인드맵을 삭제할까요?',
      description: '삭제한 마인드맵은 복구할 수 없습니다.',
      confirmText: '삭제',
      cancelText: '취소',
      destructive: true,
    });

    if (!confirmed) return;

    try {
      setDeletingMindmapId(id);
      await api.deleteMindmap(id);
      const newMindmaps = mindmaps.filter((m) => m._id !== id);
      setMindmaps(newMindmaps);
      if (selectedMindmap?._id === id) {
        setSelectedMindmap(newMindmaps.length > 0 ? newMindmaps[0] : null);
      }
      feedback.success('마인드맵을 삭제했습니다.');
    } catch (error) {
      feedback.error('삭제에 실패했습니다.');
    } finally {
      setDeletingMindmapId(null);
    }
  };

  const updateMindmapBackend = async (updatedStructure: MindMapNode) => {
    if (!selectedMindmap) return false;

    try {
      const response = await api.updateMindmap(selectedMindmap._id, {
        structure: updatedStructure,
        mindmap: hierarchyToMindmapV2(updatedStructure),
      });

      if (response.success && response.data) {
        const updatedMindmap = response.data;
        const updatedMindmaps = mindmaps.map((map) =>
          map._id === selectedMindmap._id ? updatedMindmap : map
        );
        setMindmaps(updatedMindmaps);
        setSelectedMindmap(updatedMindmap);
        return true;
      }

      feedback.error('마인드맵 업데이트에 실패했습니다.');
      return false;
    } catch (error) {
      console.error('Failed to update mindmap:', error);
      feedback.error('마인드맵 업데이트에 실패했습니다.');
      return false;
    }
  };

  const handleNodeUpdate = async (nodeId: string, data: { name: string; image?: string }) => {
    if (!selectedMindmap) return;

    const updateNodeRecursive = (node: MindMapNode): MindMapNode => {
      if (node.id === nodeId) {
        return { ...node, ...data };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodeRecursive),
        };
      }
      return node;
    };

    const updatedStructure = updateNodeRecursive(selectedMindmap.structure);
    await updateMindmapBackend(updatedStructure);
  };

  const handleNodeDelete = async (nodeId: string) => {
    if (!selectedMindmap) return;

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
          children: filteredChildren.length > 0 ? filteredChildren : undefined,
        };
      }

      return node;
    };

    const updatedStructure = deleteNodeRecursive(selectedMindmap.structure);
    if (updatedStructure) {
      await updateMindmapBackend(updatedStructure);
    }
  };

  const handleNodeAdd = async (parentId: string, nodeName: string) => {
    if (!selectedMindmap) return;

    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      name: nodeName,
    };

    const addNodeRecursive = (node: MindMapNode): MindMapNode => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNode],
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(addNodeRecursive),
        };
      }
      return node;
    };

    const updatedStructure = addNodeRecursive(selectedMindmap.structure);
    await updateMindmapBackend(updatedStructure);
  };

  const handlePositionUpdate = async (updatedStructure: MindMapNode) => {
    await updateMindmapBackend(updatedStructure);
  };

  const generateMindmapText = (node: MindMapNode, level = 0): string => {
    const indent = '  '.repeat(level);
    let text = `${indent}- ${node.name}`;
    if (node.image) {
      text += ` ${node.image}`;
    }
    text += '\n';

    if (node.children) {
      node.children.forEach((child) => {
        text += generateMindmapText(child, level + 1);
      });
    }

    return text;
  };

  const handleExport = () => {
    if (!selectedMindmap) return;

    const exportText = generateMindmapText(selectedMindmap.structure);
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedMindmap.title}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    feedback.success('마인드맵을 텍스트 파일로 내보냈습니다.');
  };

  const startRecallSession = () => {
    if (!selectedMindmap?.structure) {
      feedback.warning('먼저 마인드맵을 선택하세요.');
      return;
    }

    const queue = buildRecallQueue(recallBaseCards, recallOrder);
    if (queue.length === 0) {
      feedback.warning('인출 훈련을 시작하려면 루트 외 노드가 필요합니다.');
      return;
    }

    const catalog = Object.fromEntries(queue.map((card) => [card.id, card]));

    setWorkspaceMode('recall');
    setRecallQueue(queue);
    setRecallCardCatalog(catalog);
    setRecallUniqueTotal(queue.length);
    setRecallIndex(0);
    setRecallRevealed(false);
    setRecallAttemptStats({ correct: 0, wrong: 0 });
    setRecallFirstPassStats({ correct: 0, wrong: 0 });
    setRecallMissedCounts({});
    setRecallFirstOutcome({});
    setRecallFinalOutcome({});
    setRecallStartedAt(Date.now());
    setLastRecallSummary(null);
  };

  const finishRecallSession = (payload: {
    attemptStats: { correct: number; wrong: number };
    firstOutcome: Record<string, boolean>;
    finalOutcome: Record<string, boolean>;
    missedCounts: Record<string, number>;
  }) => {
    const durationSec = recallStartedAt
      ? Math.max(1, Math.round((Date.now() - recallStartedAt) / 1000))
      : 0;

    const uniqueTotal = recallUniqueTotal || Object.keys(payload.firstOutcome).length;
    const correctFirstPass = Object.values(payload.firstOutcome).filter(Boolean).length;
    const wrongFirstPass = Math.max(uniqueTotal - correctFirstPass, 0);
    const accuracy = uniqueTotal > 0 ? Math.round((correctFirstPass / uniqueTotal) * 100) : 0;

    const weakCards = Object.entries(payload.missedCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, misses]) => ({
        id,
        misses,
        name: recallCardCatalog[id]?.name || '이름 없음',
        parentName: recallCardCatalog[id]?.parentName,
      }));

    const summary: MindmapRecallSummary = {
      totalUnique: uniqueTotal,
      correctFirstPass,
      wrongFirstPass,
      accuracy,
      attemptsTotal: payload.attemptStats.correct + payload.attemptStats.wrong,
      durationSec,
      weakCards,
    };

    setLastRecallSummary(summary);
    setRecallQueue([]);
    setRecallIndex(0);
    setRecallRevealed(false);
    setRecallStartedAt(null);

    const recoveredAfterRetry = Object.entries(payload.firstOutcome).filter(
      ([id, firstPassCorrect]) => !firstPassCorrect && payload.finalOutcome[id]
    ).length;

    feedback.success(
      `인출 훈련 완료: 1차 정답률 ${accuracy}% (${correctFirstPass}/${uniqueTotal}) · 재회상 복구 ${recoveredAfterRetry}개`
    );
  };

  const gradeRecallCard = (correct: boolean) => {
    if (recallQueue.length === 0) return;

    const currentCard = recallQueue[recallIndex];
    if (!currentCard) return;

    const nextAttemptStats = {
      correct: recallAttemptStats.correct + (correct ? 1 : 0),
      wrong: recallAttemptStats.wrong + (correct ? 0 : 1),
    };
    setRecallAttemptStats(nextAttemptStats);

    let nextFirstOutcome = recallFirstOutcome;
    let nextFirstPassStats = recallFirstPassStats;
    if (typeof recallFirstOutcome[currentCard.id] === 'undefined') {
      nextFirstOutcome = {
        ...recallFirstOutcome,
        [currentCard.id]: correct,
      };
      nextFirstPassStats = {
        correct: recallFirstPassStats.correct + (correct ? 1 : 0),
        wrong: recallFirstPassStats.wrong + (correct ? 0 : 1),
      };
      setRecallFirstOutcome(nextFirstOutcome);
      setRecallFirstPassStats(nextFirstPassStats);
    }

    const nextFinalOutcome = {
      ...recallFinalOutcome,
      [currentCard.id]: correct || Boolean(recallFinalOutcome[currentCard.id]),
    };
    setRecallFinalOutcome(nextFinalOutcome);

    let nextMissedCounts = recallMissedCounts;
    if (!correct) {
      nextMissedCounts = {
        ...recallMissedCounts,
        [currentCard.id]: (recallMissedCounts[currentCard.id] || 0) + 1,
      };
      setRecallMissedCounts(nextMissedCounts);
    }

    let nextQueue = recallQueue;
    if (adaptiveRetryEnabled && !correct && (currentCard.retryCount || 0) < 1) {
      const retryCard = {
        ...currentCard,
        retryCount: (currentCard.retryCount || 0) + 1,
      };
      nextQueue = [...recallQueue, retryCard];
      setRecallQueue(nextQueue);
    }

    const isLast = recallIndex >= nextQueue.length - 1;
    if (isLast) {
      finishRecallSession({
        attemptStats: nextAttemptStats,
        firstOutcome: nextFirstOutcome,
        finalOutcome: nextFinalOutcome,
        missedCounts: nextMissedCounts,
      });
      return;
    }

    setRecallIndex((prev) => prev + 1);
    setRecallRevealed(false);
  };

  useEffect(() => {
    if (workspaceMode !== 'recall') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (recallQueue.length === 0) return;

      if (event.key === ' ' || event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setRecallRevealed((prev) => !prev);
      }

      if (!recallRevealed) return;

      if (event.key === '1') {
        event.preventDefault();
        gradeRecallCard(true);
      }

      if (event.key === '2') {
        event.preventDefault();
        gradeRecallCard(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [workspaceMode, recallRevealed, recallQueue, recallIndex, recallAttemptStats, recallFirstPassStats, recallOrder, adaptiveRetryEnabled]);

  const recallCard = recallQueue[recallIndex] || null;
  const recallProgress = recallQueue.length > 0
    ? Math.round(((recallIndex + 1) / recallQueue.length) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-r from-sky-50 via-cyan-50 to-emerald-50 p-6 md:p-8 shadow-sm">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-200/30 blur-2xl" />
          <div className="absolute -left-8 -bottom-12 h-40 w-40 rounded-full bg-sky-300/30 blur-2xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-sky-700">VISUAL LEARNING + ACTIVE RECALL</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">마인드맵 스튜디오</h1>
              <p className="mt-2 text-sm text-slate-600 md:text-base">
                구조화(연결)와 인출(회상)을 한 화면에서 반복해, 실제 시험형 암기로 전환합니다.
              </p>
            </div>
            <Button onClick={() => setShowCreateForm((prev) => !prev)}>
              <Plus className="mr-2 h-4 w-4" />
              새 마인드맵
            </Button>
          </div>

          <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs text-slate-500">총 마인드맵</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{mindmaps.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs text-slate-500">선택된 노드 수</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{selectedNodeCount}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs text-slate-500">최근 인출 정답률</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {recentRecallAccuracy !== null ? `${recentRecallAccuracy}%` : '-'}
              </p>
            </div>
          </div>
        </section>

        {showCreateForm && (
          <Card className="border-sky-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Sparkles className="h-5 w-5 text-sky-600" />
                새 마인드맵 만들기
              </CardTitle>
              <CardDescription>주제명으로 시작해 기본 구조를 바로 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  placeholder="예: 운영체제 핵심 개념"
                  value={newMapTitle}
                  onChange={(event) => setNewMapTitle(event.target.value)}
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
            <CardContent className="p-12 text-center text-slate-500">마인드맵을 불러오는 중...</CardContent>
          </Card>
        ) : mindmaps.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 p-12 text-center">
              <Brain className="mx-auto h-10 w-10 text-sky-500" />
              <h3 className="text-xl font-semibold text-slate-900">아직 마인드맵이 없습니다</h3>
              <p className="text-slate-600">첫 마인드맵을 만들고 개념 연결을 시작하세요.</p>
              <Button onClick={() => setShowCreateForm(true)}>마인드맵 만들기</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
            <div className="space-y-4 xl:col-span-1">
              <Card className="border-slate-200/70 bg-white/90">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">내 마인드맵</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mindmaps.map((map) => {
                    const isSelected = selectedMindmap?._id === map._id;
                    return (
                      <div
                        key={map._id}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-sky-300 bg-sky-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedMindmap(map)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedMindmap(map);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{map.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{countNodes(map.structure)}개 노드</p>
                            <p className="text-[11px] text-slate-400">
                              {map.createdAt ? new Date(map.createdAt).toLocaleDateString('ko-KR') : '날짜 없음'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteMindmap(map._id);
                            }}
                            className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label="마인드맵 삭제"
                            disabled={deletingMindmapId === map._id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-slate-200/70 bg-white/95">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-sky-600" />
                    구조 빈틈 분석
                  </CardTitle>
                  <CardDescription>연결 밀도가 낮은 가지를 우선 보강하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-xl bg-sky-50 p-3">
                    <p className="text-xs text-slate-500">최상위 가지 수</p>
                    <p className="text-lg font-semibold text-slate-900">{structureInsights.topBranchCount}개</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs text-slate-500">말단 노드</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {structureInsights.leafCount}개
                      <span className="ml-2 text-xs text-slate-500">(깊은 말단 {structureInsights.deepLeafCount}개)</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-700">확장 부족 상위 가지</p>
                    {structureInsights.underdevelopedTopBranches.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-600">상위 가지 확장이 균형적입니다.</p>
                    ) : (
                      <div className="mt-1 space-y-1">
                        {structureInsights.underdevelopedTopBranches.map((branch) => (
                          <p key={branch} className="text-xs text-slate-700">• {branch}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="xl:col-span-3 border-slate-200/70 bg-white/95 shadow-sm" ref={visualizationContainerRef}>
              {selectedMindmap ? (
                <>
                  <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <CardTitle>{selectedMindmap.title}</CardTitle>
                        <CardDescription>
                          {workspaceMode === 'build'
                            ? '노드 클릭: 선택 · 우측 액션 버튼으로 추가/편집/삭제 · (옵션) 우클릭으로 하위 노드 추가'
                            : '경로 단서를 보고 노드명을 떠올린 뒤 채점하세요. Space/R: 공개, 1: 기억남, 2: 헷갈림'}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <button
                            onClick={() => setWorkspaceMode('build')}
                            className={`px-3 py-1.5 text-sm font-semibold transition ${
                              workspaceMode === 'build' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            설계
                          </button>
                          <button
                            onClick={startRecallSession}
                            className={`px-3 py-1.5 text-sm font-semibold transition ${
                              workspaceMode === 'recall' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            인출 훈련
                          </button>
                        </div>

                        {workspaceMode === 'build' ? (
                          <Button variant="outline" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            텍스트 내보내기
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={startRecallSession}>
                            <Play className="mr-2 h-4 w-4" />
                            재시작
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {workspaceMode === 'build' ? (
                      <>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3">
                          <MindMapVisualization
                            data={selectedMindmap.mindmap || selectedMindmap.structure}
                            width={visualizationWidth}
                            height={620}
                            onNodeUpdate={handleNodeUpdate}
                            onNodeDelete={handleNodeDelete}
                            onNodeAdd={handleNodeAdd}
                            onPositionUpdate={handlePositionUpdate}
                          />
                        </div>
                        <div className="mt-1 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 p-4 text-sm text-slate-600">
                          연결이 비어 있는 노드는 회상 실패 확률이 높습니다. 하위 가지를 2개 이상 확장하고, 각 가지에 예시/반례를 붙여 기억 고리를 강화하세요.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <button
                              onClick={() => setRecallOrder('path')}
                              className={`px-3 py-1.5 text-xs font-semibold transition ${
                                recallOrder === 'path' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              경로순
                            </button>
                            <button
                              onClick={() => setRecallOrder('depth')}
                              className={`px-3 py-1.5 text-xs font-semibold transition ${
                                recallOrder === 'depth' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              핵심우선
                            </button>
                            <button
                              onClick={() => setRecallOrder('shuffle')}
                              className={`px-3 py-1.5 text-xs font-semibold transition ${
                                recallOrder === 'shuffle' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <Shuffle className="mr-1 inline h-3 w-3" />
                              섞기
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setAdaptiveRetryEnabled((prev) => !prev)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              adaptiveRetryEnabled
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            적응형 재도전 {adaptiveRetryEnabled ? 'ON' : 'OFF'}
                          </button>
                        </div>

                        {recallCard ? (
                          <>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                                <span>진행도 {recallIndex + 1} / {recallQueue.length}</span>
                                <span>
                                  1차 기억남 {recallFirstPassStats.correct} · 시도 {recallAttemptStats.correct + recallAttemptStats.wrong}회
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-200">
                                <div
                                  className="h-2 rounded-full bg-sky-500 transition-all"
                                  style={{ width: `${recallProgress}%` }}
                                />
                              </div>
                            </div>

                            <div className="rounded-3xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-white p-6">
                              <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">RECALL CUE</p>
                              <h3 className="mt-2 text-2xl font-bold text-slate-900">{recallCard.parentName || selectedMindmap.title} 아래 개념</h3>
                              <p className="mt-2 text-sm text-slate-600">
                                경로: {recallCard.ancestorPath.length > 0 ? recallCard.ancestorPath.join(' → ') : selectedMindmap.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                깊이 {recallCard.depth} · 하위 가지 {recallCard.childCount}개
                                {(recallCard.retryCount || 0) > 0 ? ' · 재도전 라운드' : ''}
                              </p>

                              <div className="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-5">
                                {!recallRevealed ? (
                                  <div className="text-center">
                                    <p className="text-sm text-slate-600">노드명을 떠올린 뒤 정답을 공개하세요.</p>
                                    <p className="mt-3 text-5xl">{recallCard.image || '🧠'}</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-xs font-semibold tracking-[0.15em] text-slate-500">ANSWER</p>
                                    <p className="text-2xl font-bold text-slate-900">{recallCard.name}</p>
                                    <p className="text-sm text-slate-600">
                                      답을 확인한 뒤 이 개념의 예시/반례를 1개씩 말해보면 장기 기억 전이에 더 유리합니다.
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="mt-5 flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => setRecallRevealed((prev) => !prev)}>
                                  {recallRevealed ? (
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
                                <Button onClick={() => gradeRecallCard(true)} disabled={!recallRevealed}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  기억남 (1)
                                </Button>
                                <Button variant="outline" onClick={() => gradeRecallCard(false)} disabled={!recallRevealed}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  헷갈림 (2)
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : lastRecallSummary ? (
                          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h4 className="text-lg font-bold text-slate-900">인출 훈련 요약</h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                              <div className="rounded-xl bg-white p-3">
                                <p className="text-xs text-slate-500">1차 정답률</p>
                                <p className="text-xl font-bold text-slate-900">{lastRecallSummary.accuracy}%</p>
                              </div>
                              <div className="rounded-xl bg-white p-3">
                                <p className="text-xs text-slate-500">고유 노드</p>
                                <p className="text-xl font-bold text-slate-900">{lastRecallSummary.totalUnique}개</p>
                              </div>
                              <div className="rounded-xl bg-white p-3">
                                <p className="text-xs text-slate-500">총 시도</p>
                                <p className="text-xl font-bold text-slate-900">{lastRecallSummary.attemptsTotal}회</p>
                              </div>
                              <div className="rounded-xl bg-white p-3">
                                <p className="text-xs text-slate-500">소요 시간</p>
                                <p className="text-xl font-bold text-slate-900">{formatDuration(lastRecallSummary.durationSec)}</p>
                              </div>
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                              <p className="text-sm font-semibold text-amber-800">약점 노드 TOP 5</p>
                              {lastRecallSummary.weakCards.length === 0 ? (
                                <p className="mt-1 text-xs text-slate-600">이번 세션에서 반복 오답 노드가 없습니다.</p>
                              ) : (
                                <div className="mt-2 space-y-1">
                                  {lastRecallSummary.weakCards.map((card) => (
                                    <p key={card.id} className="text-xs text-slate-700">
                                      • {card.name}
                                      {card.parentName ? ` (${card.parentName} 하위)` : ''}
                                      <span className="ml-1 text-rose-600">오답 {card.misses}회</span>
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>

                            <Button onClick={startRecallSession}>
                              <Play className="mr-2 h-4 w-4" />
                              다시 훈련하기
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                            인출 훈련을 시작해 주세요.
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </>
              ) : (
                <CardContent className="p-12 text-center text-slate-500">왼쪽 목록에서 마인드맵을 선택하세요.</CardContent>
              )}
            </Card>
          </div>
        )}

        <Card className="border-sky-200/70 bg-gradient-to-r from-sky-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-lg">마인드맵 암기 가이드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>1) 상위 가지마다 최소 2개의 하위 연결(예시/반례)을 넣어 기억 단서를 늘리세요.</p>
            <p>2) 설계 모드에서 연결을 다듬고, 인출 훈련 모드에서 노드명을 직접 떠올리세요.</p>
            <p>3) 오답이 반복된 노드는 문장 길이를 줄이고 이모지 단서를 붙여 재학습하세요.</p>
            <p>4) 경로순 훈련 후 섞기 훈련으로 전환하면 실제 시험 회상에 더 강해집니다.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
