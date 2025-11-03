'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EditItemModalProps {
  item: {
    id: string;
    content: string;
    image?: string;
  };
  onClose: () => void;
  onSave: (itemId: string, data: { content: string; image?: string }) => void;
}

const EMOJI_LIST = [
  '💡', '📚', '🎯', '🔬', '🎨', '💻', '🌟', '🚀', '🔥', '⚡',
  '🎓', '📝', '🧠', '💪', '🏆', '📊', '🔍', '🎭', '🎪', '🎬',
  '🌈', '🌸', '🌺', '🌻', '🌹', '🏵️', '🌷', '🌼', '🍀', '🌿',
  '⭐', '✨', '💫', '🌙', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌊',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
  '🏠', '🏢', '🏛️', '🏰', '🗿', '🗽', '⛪', '🕌', '🛕', '🕍',
];

export default function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const [content, setContent] = useState(item.content);
  const [selectedEmoji, setSelectedEmoji] = useState(item.image || '');
  const [customImage, setCustomImage] = useState('');

  const handleSave = () => {
    onSave(item.id, {
      content,
      image: selectedEmoji || customImage,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">기억 항목 편집</CardTitle>
          <CardDescription className="text-gray-600">기억 항목의 내용과 이미지를 수정하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 기억 내용 */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-gray-900">기억 내용</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="기억할 내용을 입력하세요"
              className="bg-white text-gray-900 border-gray-300 min-h-[100px]"
            />
          </div>

          {/* 이모지 선택 */}
          <div className="space-y-2">
            <Label className="text-gray-900">이모지 선택</Label>
            <div className="grid grid-cols-10 gap-2 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setSelectedEmoji(emoji);
                    setCustomImage('');
                  }}
                  className={`text-3xl p-2 rounded hover:bg-white transition ${
                    selectedEmoji === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* URL 입력 */}
          <div className="space-y-2">
            <Label htmlFor="customImage" className="text-gray-900">또는 이미지 URL 입력</Label>
            <Input
              id="customImage"
              value={customImage}
              onChange={(e) => {
                setCustomImage(e.target.value);
                setSelectedEmoji('');
              }}
              placeholder="https://example.com/image.png"
              className="bg-white text-gray-900 border-gray-300"
            />
            {customImage && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">미리보기:</p>
                <img
                  src={customImage}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* 미리보기 */}
          <div className="space-y-2">
            <Label className="text-gray-900">미리보기</Label>
            <div className="p-4 bg-gray-50 rounded-lg">
              {(selectedEmoji || customImage) && (
                <div className="mb-3 h-20 w-full rounded bg-white flex items-center justify-center">
                  {selectedEmoji ? (
                    <div className="text-5xl">{selectedEmoji}</div>
                  ) : customImage ? (
                    <img src={customImage} alt="" className="h-full object-contain rounded" />
                  ) : null}
                </div>
              )}
              <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                {content || '기억할 내용'}
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              저장
            </Button>
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
