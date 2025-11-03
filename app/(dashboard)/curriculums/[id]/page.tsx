'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

export default function CurriculumDetailPage() {
  const params = useParams();
  const [curriculum, setCurriculum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingConcept, setGeneratingConcept] = useState<string | null>(null);
  const [generatingFlashcards, setGeneratingFlashcards] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<{ [key: string]: any }>({});
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    loadCurriculum();
  }, [params.id]);

  const loadCurriculum = async () => {
    try {
      const response: any = await api.getCurriculum(params.id as string);
      if (response.success) {
        setCurriculum(response.data);
      }
    } catch (error) {
      console.error('Failed to load curriculum:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateConcept = async (topicId: string, topicTitle: string) => {
    setGeneratingConcept(topicId);

    try {
      const response = await fetch('/api/concepts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`,
        },
        body: JSON.stringify({
          curriculumId: curriculum._id,
          topicTitle,
          aiModel: curriculum.aiModel,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 생성된 개념을 state에 저장
        setConcepts(prev => ({
          ...prev,
          [topicId]: data.data
        }));
        // 자동으로 확장
        setExpandedTopic(topicId);
      } else {
        alert('개념 생성에 실패했습니다: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('Failed to generate concept:', error);
      alert('개념 생성에 실패했습니다');
    } finally {
      setGeneratingConcept(null);
    }
  };

  const handleGenerateFlashcards = async (conceptId: string) => {
    setGeneratingFlashcards(conceptId);

    try {
      const response = await fetch(`/api/concepts/${conceptId}/flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`,
        },
        body: JSON.stringify({ count: 5 }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`${data.data.count}개의 플래시카드가 생성되었습니다!`);
      }
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
      alert('플래시카드 생성에 실패했습니다');
    } finally {
      setGeneratingFlashcards(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-gray-500">커리큘럼을 불러오는 중...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!curriculum) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-gray-500">커리큘럼을 찾을 수 없습니다</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">{curriculum.title}</h1>
          <p className="text-gray-600 mt-2">{curriculum.description}</p>
          <div className="flex gap-2 mt-4">
            <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
              {curriculum.subject}
            </span>
            <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
              {curriculum.difficulty === 'beginner' && '초급'}
              {curriculum.difficulty === 'intermediate' && '중급'}
              {curriculum.difficulty === 'advanced' && '고급'}
            </span>
            <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full">
              {curriculum.aiModel}
            </span>
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle>학습 진도</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>전체 진행률</span>
                <span className="font-semibold">{curriculum.progress.overallPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${curriculum.progress.overallPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">학습 모듈</h2>

          {curriculum.structure.map((module: any, moduleIndex: number) => (
            <Card key={module.moduleId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                    {moduleIndex + 1}
                  </span>
                  {module.title}
                </CardTitle>
                <CardDescription>
                  예상 학습 시간: {module.estimatedHours}시간
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {module.topics.map((topic: any, topicIndex: number) => (
                    <div key={topic.topicId} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm text-gray-500">
                            {moduleIndex + 1}.{topicIndex + 1}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{topic.title}</div>
                            {curriculum.progress.completedTopics.includes(topic.topicId) && (
                              <span className="text-xs text-green-600">✓ 완료</span>
                            )}
                            {concepts[topic.topicId] && (
                              <span className="text-xs text-blue-600 ml-2">💡 개념 생성됨</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {concepts[topic.topicId] && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedTopic(expandedTopic === topic.topicId ? null : topic.topicId)}
                            >
                              {expandedTopic === topic.topicId ? '접기 ▲' : '보기 ▼'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateConcept(topic.topicId, topic.title)}
                            disabled={generatingConcept === topic.topicId}
                          >
                            {generatingConcept === topic.topicId ? '생성 중...' : concepts[topic.topicId] ? '재생성' : '개념 설명'}
                          </Button>
                        </div>
                      </div>

                      {/* 개념 내용 표시 영역 */}
                      {expandedTopic === topic.topicId && concepts[topic.topicId] && (
                        <div className="p-6 bg-white border-t border-gray-200">
                          <div className="prose max-w-none">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              {concepts[topic.topicId].title}
                            </h3>
                            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {concepts[topic.topicId].content.text}
                            </div>
                            {concepts[topic.topicId].content.code && (
                              <pre className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
                                <code>{concepts[topic.topicId].content.code}</code>
                              </pre>
                            )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex gap-2 text-xs text-gray-500">
                              <span>AI 모델: {concepts[topic.topicId].aiGenerated?.model}</span>
                              <span>•</span>
                              <span>생성 시각: {new Date(concepts[topic.topicId].aiGenerated?.generatedAt || concepts[topic.topicId].createdAt).toLocaleString('ko-KR')}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle>빠른 시작</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button className="h-20">
                모든 토픽의 개념 설명 생성
              </Button>
              <Button variant="outline" className="h-20">
                전체 플래시카드 생성
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
