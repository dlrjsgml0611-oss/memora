import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { generateWithOpenAI } from '@/lib/ai/openai';

// POST - Evaluate user's answer using OpenAI
export async function POST(req: NextRequest) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { question, correctAnswer, userAnswer } = body;

    if (!question || !correctAnswer || !userAnswer) {
      return NextResponse.json(
        { success: false, error: 'Question, correct answer, and user answer are required' },
        { status: 400 }
      );
    }

    // Call OpenAI to evaluate the answer
    const prompt = `당신은 학습 평가 전문가입니다. 학생의 답변을 평가하고 건설적인 피드백을 제공해주세요.

질문: ${question}

정답: ${correctAnswer}

학생 답변: ${userAnswer}

다음 JSON 형식으로 평가를 제공해주세요:
{
  "isCorrect": true/false (완전히 맞으면 true, 부분적으로 맞거나 틀리면 false),
  "score": 0-100 (점수),
  "recommendedRating": 1|2|3|4 (SRS 평가 추천. 1=Again, 2=Hard, 3=Good, 4=Easy),
  "confidence": 0-1 (평가 확신도),
  "feedback": "전체적인 피드백 (한국어, 2-3문장)",
  "strengths": ["잘한 점 1", "잘한 점 2"],
  "improvements": ["개선할 점 1", "개선할 점 2"],
  "rubric": {
    "coverage": 0-100,
    "accuracy": 0-100,
    "clarity": 0-100
  }
}

평가 기준:
1. 핵심 내용이 포함되어 있는가?
2. 정확한 표현을 사용했는가?
3. 논리적으로 설명했는가?
4. 불필요한 설명이나 오류가 있는가?

피드백은 긍정적이고 격려하는 톤으로 작성하되, 개선점은 명확히 지적해주세요.
JSON만 반환하고 다른 설명은 하지 마세요.`;

    const response = await generateWithOpenAI(prompt, { temperature: 0.7 });

    // Parse the JSON from response
    let evaluation;
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
      cleanedResponse = cleanedResponse.trim();

      // Try to find JSON object
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      evaluation = JSON.parse(jsonMatch[0]);
    } catch (parseError: any) {
      console.error('Failed to parse evaluation:', parseError);
      console.error('Response:', response);

      // Fallback evaluation
      evaluation = {
        isCorrect: false,
        score: 50,
        recommendedRating: 2,
        confidence: 0.2,
        feedback: '평가를 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.',
        strengths: [],
        improvements: ['답변을 다시 제출해주세요.'],
        rubric: {
          coverage: 50,
          accuracy: 50,
          clarity: 50,
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        evaluation: {
          isCorrect: evaluation.isCorrect || false,
          score: evaluation.score || 0,
          recommendedRating: [1, 2, 3, 4].includes(evaluation.recommendedRating)
            ? evaluation.recommendedRating
            : (evaluation.isCorrect ? 3 : 2),
          confidence: typeof evaluation.confidence === 'number'
            ? Math.max(0, Math.min(1, evaluation.confidence))
            : 0.5,
          feedback: evaluation.feedback || '평가를 생성할 수 없습니다.',
          strengths: evaluation.strengths || [],
          improvements: evaluation.improvements || [],
          rubric: {
            coverage: evaluation.rubric?.coverage ?? 0,
            accuracy: evaluation.rubric?.accuracy ?? 0,
            clarity: evaluation.rubric?.clarity ?? 0,
          },
        }
      }
    });

  } catch (error: any) {
    console.error('Evaluate answer error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to evaluate answer',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
