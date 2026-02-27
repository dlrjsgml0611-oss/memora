'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeedback } from '@/components/ui/feedback';

interface EditNodeModalProps {
  node: {
    id: string;
    name: string;
    image?: string;
  };
  onClose: () => void;
  onSave: (nodeId: string, data: { name: string; image?: string }) => void;
  onDelete?: (nodeId: string) => void;
  canDelete?: boolean;
}

const EMOJI_LIST = [
  '💡', '📚', '🎯', '🔬', '🎨', '💻', '🌟', '🚀', '🔥', '⚡',
  '🎓', '📝', '🧠', '💪', '🏆', '📊', '🔍', '🎭', '🎪', '🎬',
  '🌈', '🌸', '🌺', '🌻', '🌹', '🏵️', '🌷', '🌼', '🍀', '🌿',
  '⭐', '✨', '💫', '🌙', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌊',
];

export default function EditNodeModal({ node, onClose, onSave, onDelete, canDelete = true }: EditNodeModalProps) {
  const feedback = useFeedback();
  const [name, setName] = useState(node.name);

  // Determine if initial image is emoji or URL
  const isInitialImageEmoji = node.image && node.image.length <= 2;
  const [selectedEmoji, setSelectedEmoji] = useState(isInitialImageEmoji ? node.image : '');
  const [customImage, setCustomImage] = useState(isInitialImageEmoji ? '' : (node.image || ''));

  // 키보드 단축키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      feedback.warning('노드 이름을 입력하세요.');
      return;
    }
    onSave(node.id, {
      name: name.trim(),
      image: selectedEmoji || customImage || undefined,
    });
    onClose();
  };

  const handleDelete = async () => {
    const confirmed = await feedback.confirm({
      title: '노드를 삭제할까요?',
      description: '하위 노드도 함께 삭제됩니다.',
      confirmText: '삭제',
      cancelText: '취소',
      destructive: true,
    });
    if (!confirmed) return;

    onDelete?.(node.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onKeyDown={handleKeyDown}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">노드 편집</CardTitle>
          <CardDescription className="text-gray-600">
            노드의 이름과 이미지를 수정하세요 (Ctrl+Enter: 저장, Esc: 취소)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 노드 이름 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-900">노드 이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="노드 이름을 입력하세요"
              className="bg-white text-gray-900 border-gray-300"
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
            <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-3">
              {(selectedEmoji || customImage) && (
                <div className="text-4xl">
                  {selectedEmoji ? (
                    selectedEmoji
                  ) : customImage ? (
                    <img src={customImage} alt="" className="w-12 h-12 object-cover rounded" />
                  ) : null}
                </div>
              )}
              <div className="font-semibold text-gray-900">{name || '노드 이름'}</div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              저장
            </Button>
            {canDelete && onDelete && (
              <Button variant="destructive" onClick={() => void handleDelete()}>
                삭제
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
