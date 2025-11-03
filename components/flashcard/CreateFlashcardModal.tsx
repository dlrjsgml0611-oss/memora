'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CreateFlashcardModalProps {
  onClose: () => void;
  onSubmit: (data: {
    front: string;
    back: string;
    hint?: string;
    type: 'basic' | 'cloze' | 'image' | 'code';
  }) => Promise<void>;
}

export default function CreateFlashcardModal({ onClose, onSubmit }: CreateFlashcardModalProps) {
  const [formData, setFormData] = useState({
    front: '',
    back: '',
    hint: '',
    type: 'basic' as 'basic' | 'cloze' | 'image' | 'code',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to create flashcard:', error);
      alert('플래시카드 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">새 플래시카드 만들기</CardTitle>
          <CardDescription className="text-gray-600">학습할 내용을 플래시카드로 만드세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-gray-900">카드 유형</Label>
              <select
                id="type"
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                disabled={loading}
              >
                <option value="basic">기본 카드</option>
                <option value="cloze">Cloze 카드 (빈칸 채우기)</option>
                <option value="code">코드 카드</option>
                <option value="image">이미지 카드</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="front" className="text-gray-900">앞면 (질문)</Label>
              <textarea
                id="front"
                className="w-full min-h-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                placeholder="질문이나 주제를 입력하세요"
                value={formData.front}
                onChange={(e) => setFormData({ ...formData, front: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="back" className="text-gray-900">뒷면 (답변)</Label>
              <textarea
                id="back"
                className="w-full min-h-[150px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                placeholder="답변이나 설명을 입력하세요"
                value={formData.back}
                onChange={(e) => setFormData({ ...formData, back: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hint" className="text-gray-900">힌트 (선택사항)</Label>
              <Input
                id="hint"
                placeholder="어려울 때 참고할 힌트를 입력하세요"
                value={formData.hint}
                onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                disabled={loading}
                className="bg-white text-gray-900 border-gray-300 placeholder:text-gray-400"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? '생성 중...' : '플래시카드 만들기'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
