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
  const [imageUrl, setImageUrl] = useState('');

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

            {/* Type-specific help text */}
            {formData.type === 'cloze' && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Cloze 카드 사용법:</strong><br />
                앞면에 중괄호 2개를 사용하여 빈칸을 표시하세요.<br />
                예: 대한민국의 수도는 {`{{서울}}`}입니다.<br />
                뒷면에는 전체 문장을 입력하세요.
              </div>
            )}

            {formData.type === 'code' && (
              <div className="bg-purple-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>코드 카드 사용법:</strong><br />
                앞면에 질문이나 설명을 작성하고, 뒷면에 코드를 작성하세요.<br />
                코드는 자동으로 코드 블록 스타일로 표시됩니다.
              </div>
            )}

            {formData.type === 'image' && (
              <div className="bg-green-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>이미지 카드 사용법:</strong><br />
                이미지 URL을 입력하고, 앞면에 질문, 뒷면에 답변을 작성하세요.
              </div>
            )}

            {/* Image URL field for image type */}
            {formData.type === 'image' && (
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-gray-900">이미지 URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setFormData({ ...formData, front: `[IMG]${e.target.value}[/IMG]\n${formData.front.replace(/\[IMG\].*?\[\/IMG\]\n?/, '')}` });
                  }}
                  disabled={loading}
                  className="bg-white text-gray-900 border-gray-300"
                />
                {imageUrl && (
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600 mb-2">미리보기:</p>
                    <img src={imageUrl} alt="Preview" className="max-w-full h-32 object-contain rounded"
                      onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="front" className="text-gray-900">
                앞면 ({formData.type === 'cloze' ? '빈칸이 포함된 문장' : '질문'})
              </Label>
              <textarea
                id="front"
                className={`w-full min-h-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 ${
                  formData.type === 'code' ? 'font-mono' : ''
                }`}
                placeholder={
                  formData.type === 'cloze'
                    ? "예: 대한민국의 수도는 {{서울}}입니다."
                    : formData.type === 'code'
                    ? "함수의 시간복잡도는?"
                    : "질문이나 주제를 입력하세요"
                }
                value={formData.type === 'image' ? formData.front.replace(/\[IMG\].*?\[\/IMG\]\n?/, '') : formData.front}
                onChange={(e) => {
                  if (formData.type === 'image') {
                    setFormData({ ...formData, front: imageUrl ? `[IMG]${imageUrl}[/IMG]\n${e.target.value}` : e.target.value });
                  } else {
                    setFormData({ ...formData, front: e.target.value });
                  }
                }}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="back" className="text-gray-900">
                뒷면 ({formData.type === 'cloze' ? '완전한 문장' : formData.type === 'code' ? '코드' : '답변'})
              </Label>
              <textarea
                id="back"
                className={`w-full min-h-[150px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 ${
                  formData.type === 'code' ? 'font-mono' : ''
                }`}
                placeholder={
                  formData.type === 'cloze'
                    ? "예: 대한민국의 수도는 서울입니다."
                    : formData.type === 'code'
                    ? "function example() {\n  return O(n);\n}"
                    : "답변이나 설명을 입력하세요"
                }
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
