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
    shape?: 'box' | 'sphere' | 'cylinder' | 'pyramid' | 'card';
    size?: 'small' | 'medium' | 'large';
    color?: string;
  };
  onClose: () => void;
  onSave: (itemId: string, data: { content: string; image?: string; shape?: string; size?: string; color?: string }) => void;
}

const EMOJI_LIST = [
  '💡', '📚', '🎯', '🔬', '🎨', '💻', '🌟', '🚀', '🔥', '⚡',
  '🎓', '📝', '🧠', '💪', '🏆', '📊', '🔍', '🎭', '🎪', '🎬',
  '🌈', '🌸', '🌺', '🌻', '🌹', '🏵️', '🌷', '🌼', '🍀', '🌿',
  '⭐', '✨', '💫', '🌙', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌊',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
  '🏠', '🏢', '🏛️', '🏰', '🗿', '🗽', '⛪', '🕌', '🛕', '🕍',
];

const COLOR_PRESETS = [
  { name: '파랑', value: '#3b82f6' },
  { name: '빨강', value: '#ef4444' },
  { name: '초록', value: '#10b981' },
  { name: '노랑', value: '#f59e0b' },
  { name: '보라', value: '#8b5cf6' },
  { name: '분홍', value: '#ec4899' },
  { name: '청록', value: '#14b8a6' },
  { name: '주황', value: '#f97316' },
];

export default function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const [content, setContent] = useState(item.content);
  const [selectedEmoji, setSelectedEmoji] = useState(item.image || '');
  const [customImage, setCustomImage] = useState('');
  const [shape, setShape] = useState(item.shape || 'card');
  const [size, setSize] = useState(item.size || 'medium');
  const [color, setColor] = useState(item.color || '#3b82f6');

  const handleSave = () => {
    onSave(item.id, {
      content,
      image: selectedEmoji || customImage,
      shape,
      size,
      color,
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

          {/* 3D 형태 선택 */}
          <div className="space-y-2">
            <Label className="text-gray-900">3D 형태</Label>
            <div className="grid grid-cols-5 gap-3">
              {[
                { value: 'card', label: '카드', icon: '📄' },
                { value: 'box', label: '박스', icon: '📦' },
                { value: 'sphere', label: '구체', icon: '⚪' },
                { value: 'cylinder', label: '원기둥', icon: '🥫' },
                { value: 'pyramid', label: '피라미드', icon: '🔺' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setShape(s.value as any)}
                  className={`p-3 rounded-lg border-2 transition ${
                    shape === s.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xs text-gray-900">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 크기 선택 */}
          <div className="space-y-2">
            <Label className="text-gray-900">크기</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'small', label: '작게' },
                { value: 'medium', label: '중간' },
                { value: 'large', label: '크게' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSize(s.value as any)}
                  className={`p-3 rounded-lg border-2 transition ${
                    size === s.value
                      ? 'border-blue-500 bg-blue-50 text-gray-900'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 색상 선택 */}
          <div className="space-y-2">
            <Label className="text-gray-900">색상</Label>
            <div className="grid grid-cols-4 gap-3">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`p-3 rounded-lg border-2 transition ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  style={{
                    backgroundColor: c.value,
                    borderColor: color === c.value ? c.value : '#e5e7eb',
                  }}
                >
                  <div className="text-xs text-white font-medium drop-shadow">{c.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          <div className="space-y-2">
            <Label className="text-gray-900">미리보기</Label>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="mb-3 h-32 w-full rounded bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center perspective-[1000px]">
                <div
                  className="relative"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: 'rotateX(15deg) rotateY(15deg)',
                  }}
                >
                  {/* 3D Shape Preview */}
                  {shape === 'box' && (
                    <div
                      className="relative"
                      style={{
                        width: size === 'small' ? '60px' : size === 'large' ? '100px' : '80px',
                        height: size === 'small' ? '60px' : size === 'large' ? '100px' : '80px',
                      }}
                    >
                      <div
                        className="absolute inset-0 rounded-lg flex items-center justify-center shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                          transform: 'translateZ(20px)',
                        }}
                      >
                        {(selectedEmoji || customImage) && (
                          selectedEmoji ? (
                            <span className="text-2xl">{selectedEmoji}</span>
                          ) : (
                            <img src={customImage} alt="" className="w-8 h-8 object-contain" />
                          )
                        )}
                      </div>
                      <div
                        className="absolute inset-0 rounded-lg opacity-60"
                        style={{
                          background: `linear-gradient(90deg, ${color}99 0%, ${color}66 100%)`,
                          transform: 'rotateY(90deg) translateZ(20px)',
                        }}
                      />
                    </div>
                  )}

                  {shape === 'sphere' && (
                    <div
                      className="rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        width: size === 'small' ? '60px' : size === 'large' ? '100px' : '80px',
                        height: size === 'small' ? '60px' : size === 'large' ? '100px' : '80px',
                        background: `radial-gradient(circle at 30% 30%, ${color}ff, ${color}99, ${color}66)`,
                      }}
                    >
                      {(selectedEmoji || customImage) && (
                        selectedEmoji ? (
                          <span className="text-2xl">{selectedEmoji}</span>
                        ) : (
                          <img src={customImage} alt="" className="w-8 h-8 object-contain" />
                        )
                      )}
                    </div>
                  )}

                  {shape === 'cylinder' && (
                    <div className="relative flex flex-col items-center">
                      <div
                        className="rounded-full shadow-md"
                        style={{
                          width: size === 'small' ? '60px' : size === 'large' ? '100px' : '80px',
                          height: size === 'small' ? '20px' : size === 'large' ? '30px' : '25px',
                          background: `radial-gradient(ellipse, ${color}ff, ${color}cc)`,
                          transform: 'rotateX(60deg)',
                        }}
                      />
                      <div
                        className="flex items-center justify-center shadow-lg"
                        style={{
                          width: size === 'small' ? '60px' : size === 'large' ? '100px' : '80px',
                          height: size === 'small' ? '70px' : size === 'large' ? '110px' : '90px',
                          background: `linear-gradient(90deg, ${color}99, ${color}ff, ${color}99)`,
                          marginTop: '-10px',
                        }}
                      >
                        {(selectedEmoji || customImage) && (
                          selectedEmoji ? (
                            <span className="text-2xl">{selectedEmoji}</span>
                          ) : (
                            <img src={customImage} alt="" className="w-8 h-8 object-contain" />
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {shape === 'pyramid' && (
                    <div className="relative flex items-end justify-center">
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: size === 'small' ? '40px solid transparent' : size === 'large' ? '60px solid transparent' : '50px solid transparent',
                          borderRight: size === 'small' ? '40px solid transparent' : size === 'large' ? '60px solid transparent' : '50px solid transparent',
                          borderBottom: `${size === 'small' ? '80px' : size === 'large' ? '120px' : '100px'} solid ${color}`,
                          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
                          position: 'relative',
                        }}
                      >
                        <span
                          className="absolute text-2xl"
                          style={{
                            bottom: size === 'small' ? '20px' : size === 'large' ? '40px' : '30px',
                          }}
                        >
                          {selectedEmoji || (customImage && '🖼️')}
                        </span>
                      </div>
                    </div>
                  )}

                  {shape === 'card' && (
                    <div
                      className="rounded-lg p-4 flex items-center justify-center shadow-lg"
                      style={{
                        width: size === 'small' ? '80px' : size === 'large' ? '120px' : '100px',
                        height: size === 'small' ? '100px' : size === 'large' ? '140px' : '120px',
                        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                        border: `3px solid ${color}`,
                      }}
                    >
                      {(selectedEmoji || customImage) && (
                        selectedEmoji ? (
                          <span className="text-3xl">{selectedEmoji}</span>
                        ) : (
                          <img src={customImage} alt="" className="w-10 h-10 object-contain" />
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap break-words text-center">
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
