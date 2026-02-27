'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Shuffle, Clock, List } from 'lucide-react';

interface Flashcard {
  _id: string;
  front: string;
  back: string;
  hint?: string;
  type: string;
}

type PrintMode = 'due' | 'all' | 'random';

export default function PrintPage() {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PrintMode>('due');
  const [count, setCount] = useState(20);
  const [showAnswers, setShowAnswers] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchFlashcards = async () => {
    setLoading(true);
    try {
      const res: any = await api.getFlashcardsForPrint({ mode, count });
      if (res.success) {
        setFlashcards(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, [mode, count]);

  const handlePrint = () => {
    window.print();
  };

  const modeOptions: { value: PrintMode; label: string; icon: React.ReactNode }[] = [
    { value: 'due', label: '복습 예정', icon: <Clock className="w-4 h-4" /> },
    { value: 'all', label: '전체 (최신순)', icon: <List className="w-4 h-4" /> },
    { value: 'random', label: '랜덤', icon: <Shuffle className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 컨트롤 패널 (인쇄 시 숨김) */}
      <div className="print:hidden bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              돌아가기
            </button>
            <h1 className="text-xl font-bold">복습 문제지 출력</h1>
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              인쇄하기
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              {modeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    mode === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>{n}문제</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showAnswers}
                onChange={(e) => setShowAnswers(e.target.checked)}
                className="rounded"
              />
              정답 포함
            </label>
          </div>
        </div>
      </div>

      {/* 인쇄 영역 */}
      <div ref={printRef} className="max-w-4xl mx-auto p-8 print:p-4">
        {/* 헤더 */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-2xl font-bold mb-2">Memora 복습 문제지</h1>
          <p className="text-gray-500 text-sm">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}
            {flashcards.length}문제
          </p>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-gray-600">이름: __________________ 점수: ____ / {flashcards.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : flashcards.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            출력할 플래시카드가 없습니다.
          </div>
        ) : (
          <>
            {/* 문제 섹션 */}
            <div className="space-y-6 print:space-y-4">
              {flashcards.map((card, idx) => (
                <div key={card._id} className="border-b pb-6 print:pb-4 print:break-inside-avoid">
                  <div className="flex gap-4">
                    <span className="font-bold text-blue-600 shrink-0">{idx + 1}.</span>
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap">{card.front}</div>
                      {card.hint && (
                        <p className="text-sm text-gray-500 mt-1">💡 힌트: {card.hint}</p>
                      )}
                      {/* 답안 작성 공간 */}
                      <div className="mt-4 border border-dashed border-gray-300 rounded-lg p-4 min-h-[80px] print:min-h-[60px]">
                        <p className="text-xs text-gray-400">답안 작성</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 정답 섹션 */}
            {showAnswers && (
              <div className="mt-12 print:mt-8 print:break-before-page">
                <h2 className="text-xl font-bold mb-6 text-center border-b pb-4">정답</h2>
                <div className="space-y-4 print:space-y-2">
                  {flashcards.map((card, idx) => (
                    <div key={card._id} className="flex gap-4 print:break-inside-avoid">
                      <span className="font-bold text-blue-600 shrink-0 w-8">{idx + 1}.</span>
                      <div className="flex-1 whitespace-pre-wrap text-sm">{card.back}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 인쇄 스타일 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
