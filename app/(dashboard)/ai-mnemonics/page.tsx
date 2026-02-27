'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFeedback } from '@/components/ui/feedback';
import { api } from '@/lib/api/client';

interface SavedMnemonic {
  _id: string;
  subject: 'history' | 'math' | 'science' | 'english' | 'custom';
  technique: 'sequence' | 'story' | 'acronym' | 'association';
  content: string;
  mnemonic: string;
  createdAt: string;
}

export default function AIMnemonicsPage() {
  const feedback = useFeedback();
  const [subject, setSubject] = useState<'history' | 'math' | 'science' | 'english' | 'custom'>('history');
  const [technique, setTechnique] = useState<'sequence' | 'story' | 'acronym' | 'association'>('sequence');
  const [content, setContent] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SavedMnemonic[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const subjectInfo = {
    history: {
      name: '한국사',
      icon: '📜',
      description: '연대기, 사건, 인물을 효과적으로 암기',
      example: '고려 건국 연도, 조선 왕조 순서 등',
    },
    math: {
      name: '수학',
      icon: '🔢',
      description: '공식, 정리, 개념을 시각화하여 기억',
      example: '삼각함수 공식, 미적분 정리 등',
    },
    science: {
      name: '과학',
      icon: '🔬',
      description: '원소, 법칙, 실험을 구조화하여 암기',
      example: '주기율표, 물리 법칙, 화학 반응식 등',
    },
    english: {
      name: '영어',
      icon: '🔤',
      description: '단어, 숙어, 문법을 연결하여 학습',
      example: '불규칙 동사, 관용 표현, 어원 등',
    },
    custom: {
      name: '기타',
      icon: '📝',
      description: '자유로운 주제로 맞춤 기억술',
      example: '자격증 시험, 면접 준비 등',
    },
  };

  const techniqueInfo = {
    sequence: {
      name: '순서 암기법',
      icon: '🔢',
      description: '순서대로 나열된 항목을 스토리나 연상으로 연결',
      example: '왕조 순서, 행성 순서, 화학 반응 단계',
    },
    story: {
      name: '이야기 기억법',
      icon: '📖',
      description: '정보를 생생한 이야기로 변환하여 기억',
      example: '역사적 사건을 드라마처럼 구성',
    },
    acronym: {
      name: '두문자 기억법',
      icon: '🔤',
      description: '각 항목의 첫 글자를 모아 단어나 문장 만들기',
      example: 'ROY G. BIV (무지개 색깔)',
    },
    association: {
      name: '연상 기억법',
      icon: '🔗',
      description: '추상적 개념을 구체적 이미지와 연결',
      example: '수학 공식을 실생활 상황과 연결',
    },
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const response: any = await api.getAIMnemonics(30);
      if (response.success) {
        setHistory(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load mnemonic history:', error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      feedback.warning('암기할 내용을 입력하세요.');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const response: any = await api.generateMnemonic({
        subject,
        technique,
        content,
        save: true,
      });
      if (response.success) {
        setResult(response.mnemonic || '');
        await loadHistory();
        feedback.success('새 기억술을 생성했습니다.');
      } else {
        feedback.error('기억술 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Failed to generate mnemonic:', error);
      const errorMessage = error.message || '기억술 생성 중 오류가 발생했습니다';
      if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
        feedback.error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        feedback.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFromHistory = (entry: SavedMnemonic) => {
    setSubject(entry.subject);
    setTechnique(entry.technique);
    setContent(entry.content);
    setResult(entry.mnemonic);
  };

  const handleDeleteHistory = async (id: string) => {
    const confirmed = await feedback.confirm({
      title: '기억술 기록을 삭제할까요?',
      description: '삭제 후에는 되돌릴 수 없습니다.',
      confirmText: '삭제',
      cancelText: '취소',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      setDeletingId(id);
      const response: any = await api.deleteAIMnemonic(id);
      if (response.success) {
        setHistory((prev) => prev.filter((item) => item._id !== id));
        feedback.success('기억술 기록을 삭제했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete mnemonic history:', error);
      feedback.error('삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-fuchsia-200/80 bg-gradient-to-r from-fuchsia-50 via-rose-50 to-orange-50 p-6 md:p-8 shadow-sm">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-fuchsia-300/30 blur-2xl" />
          <div className="absolute -left-8 -bottom-12 h-44 w-44 rounded-full bg-orange-300/30 blur-2xl" />
          <div className="relative">
            <p className="text-xs font-semibold tracking-[0.2em] text-fuchsia-700">MNEMONIC ENGINE</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">AI 기억술 생성기</h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">과목 특성에 맞춘 기억술을 생성하고, 기록을 재활용해 암기 효율을 높이세요.</p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                <p className="text-xs text-slate-500">최근 기록</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{history.length}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                <p className="text-xs text-slate-500">선택 방식</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{techniqueInfo[technique].name}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                <p className="text-xs text-slate-500">선택 과목</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{subjectInfo[subject].name}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            {/* Subject Selection */}
            <Card>
              <CardHeader>
                <CardTitle>1. 과목 선택</CardTitle>
                <CardDescription>학습할 과목을 선택하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(subjectInfo).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setSubject(key as any)}
                      className={`p-4 rounded-lg border-2 transition ${
                        subject === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{info.icon}</div>
                      <div className="font-semibold text-sm text-gray-900">{info.name}</div>
                    </button>
                  ))}
                </div>
                {subject && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{subjectInfo[subject].description}</p>
                    <p className="text-xs text-gray-500 mt-1">예: {subjectInfo[subject].example}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Technique Selection */}
            <Card>
              <CardHeader>
                <CardTitle>2. 기억술 방식 선택</CardTitle>
                <CardDescription>암기 방식을 선택하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(techniqueInfo).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setTechnique(key as any)}
                      className={`w-full p-3 rounded-lg border-2 transition text-left ${
                        technique === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{info.icon}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-900">{info.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{info.description}</div>
                          <div className="text-xs text-gray-500 mt-1">예: {info.example}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content Input */}
            <Card>
              <CardHeader>
                <CardTitle>3. 암기할 내용 입력</CardTitle>
                <CardDescription>기억하고 싶은 내용을 입력하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-gray-900">내용</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      subject === 'history'
                        ? "예: 고려왕조 순서\n태조 왕건, 혜종, 정종, 광종, 경종, 성종, 목종, 현종..."
                        : subject === 'math'
                        ? "예: 삼각함수 덧셈공식\nsin(A+B) = sinA cosB + cosA sinB"
                        : subject === 'science'
                        ? "예: 원소 주기율표 1-20번\n수소, 헬륨, 리튬, 베릴륨..."
                        : subject === 'english'
                        ? "예: 불규칙 동사\ngo-went-gone, eat-ate-eaten..."
                        : "암기할 내용을 입력하세요"
                    }
                    className="min-h-[200px] bg-white text-gray-900 border-gray-300"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={loading || !content.trim()}
                  className="w-full"
                >
                  {loading ? 'AI 생성 중... (최대 1분 소요)' : '🤖 AI 기억술 생성하기'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Result */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>생성된 기억술</CardTitle>
                <CardDescription>
                  {result ? 'AI가 생성한 맞춤 기억술입니다' : '기억술을 생성하려면 왼쪽 양식을 작성하세요'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="text-center space-y-3">
                      <div className="animate-spin text-4xl">🤖</div>
                      <p className="text-gray-600">AI가 기억술을 생성하고 있습니다...</p>
                    </div>
                  </div>
                ) : result ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {result}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(result);
                          feedback.success('기억술을 클립보드에 복사했습니다.');
                        }}
                      >
                        📋 복사
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setResult('')}
                      >
                        🗑️ 지우기
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-12 text-center">
                    <div className="space-y-2">
                      <div className="text-6xl mb-4">🧠</div>
                      <p className="text-gray-500">
                        과목과 기억술 방식을 선택하고<br />
                        내용을 입력한 후 생성 버튼을 클릭하세요
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">💡 AI 기억술이란?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700">
                <p>
                  AI가 각 과목의 특성을 분석하여 최적화된 기억술을 생성합니다.
                </p>
                <div className="bg-white/60 p-3 rounded-lg">
                  <p className="font-semibold mb-2">활용 팁:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>생성된 기억술을 플래시카드나 기억의 궁전에 추가하세요</li>
                    <li>여러 방식을 시도하여 자신에게 맞는 방법을 찾으세요</li>
                    <li>생성된 내용을 자신만의 스타일로 변형하세요</li>
                    <li>정기적으로 복습하여 장기 기억으로 전환하세요</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">최근 생성 기록</CardTitle>
                <CardDescription>클릭하면 현재 입력창과 결과에 불러옵니다</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <p className="text-sm text-gray-500">불러오는 중...</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-gray-500">아직 저장된 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div
                        key={entry._id}
                        className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => applyFromHistory(entry)}
                            className="text-left flex-1"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              {subjectInfo[entry.subject].name} · {techniqueInfo[entry.technique].name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {entry.content}
                            </p>
                            <p className="text-xs text-blue-700 mt-1 line-clamp-2">
                              {entry.mnemonic}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {new Date(entry.createdAt).toLocaleString('ko-KR')}
                            </p>
                          </button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteHistory(entry._id)}
                            disabled={deletingId === entry._id}
                          >
                            {deletingId === entry._id ? '삭제 중...' : '삭제'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
