import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildCurriculumPrompt, parseCurriculumJsonResponse } from './curriculum';
import { requireServerEnv } from '@/lib/env/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function generateWithGemini(prompt: string, options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  requireServerEnv('GOOGLE_AI_API_KEY');
  try {
    const model = genAI.getGenerativeModel({
      model: options?.model || 'gemini-3-pro-preview',
    });

    const generationConfig = {
      temperature: options?.temperature || 0.7,
      maxOutputTokens: options?.maxTokens || 2000,
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    return result.response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate content with Gemini');
  }
}

export async function generateCurriculumWithGemini(goal: string, subject: string, difficulty: string): Promise<any> {
  const prompt = buildCurriculumPrompt(goal, subject, difficulty);
  const response = await generateWithGemini(prompt, { temperature: 0.6, maxTokens: 10000 });

  try {
    return parseCurriculumJsonResponse(response);
  } catch (error: any) {
    console.error('Failed to parse curriculum:', error);
    console.error('Response preview:', response.substring(0, 500));
    throw new Error(`Failed to generate curriculum: ${error.message}`);
  }
}

export async function generateConceptWithGemini(
  topicTitle: string,
  curriculumContext: string,
  mode: 'encyclopedia' | 'conversational' = 'conversational'
): Promise<string> {
  let prompt = '';

  if (mode === 'conversational') {
    prompt = `당신은 학습과 기억 전문가입니다. 학생이 이해하고 기억하기 쉽도록 다음 주제를 설명해주세요.

주제: ${topicTitle}
맥락: ${curriculumContext}

요구사항:
1. 마치 선생님이 학생에게 구술로 설명하듯이 자연스럽고 편안한 어조로 작성하세요
2. "~입니다", "~해요", "~죠" 같은 구어체를 자연스럽게 섞어서 사용하세요
3. 추상적인 개념은 일상생활의 구체적인 비유나 예시로 설명하세요
4. "이렇게 생각해보세요", "예를 들어", "쉽게 말하면" 같은 표현을 사용하여 친근하게 접근하세요
5. 핵심 개념 → 이해하기 쉬운 설명 → 실제 예시 → 기억하는 팁 → 정리 순서로 구성하세요
6. 학습자가 "아하!" 하는 순간을 만들 수 있도록 설명하세요
7. 불필요한 인사말("물론입니다", "설명해드리겠습니다" 등)은 생략하고 바로 본론으로 들어가주세요
8. 반드시 한국어로 작성하세요

개념 설명:`;
  } else {
    prompt = `당신은 백과사전 편집자입니다. 다음 주제에 대한 개념을 정확하고 형식적으로 정의해주세요.

주제: ${topicTitle}
맥락: ${curriculumContext}

요구사항:
1. 형식적이고 학술적인 문체를 사용하세요 ("~이다", "~하다" 형태)
2. 정확한 정의와 용어를 사용하세요
3. 객관적이고 중립적인 어조를 유지하세요
4. 체계적으로 분류하고 설명하세요
5. 필요한 경우 전문 용어를 사용하되, 간단히 설명을 덧붙이세요
6. 다음 내용을 포함하세요:
   - 명확한 정의와 개요
   - 핵심 개념과 원리
   - 분류 및 유형
   - 실제 예시
7. 불필요한 인사말은 생략하고 바로 본론으로 들어가주세요
8. 반드시 한국어로 작성하세요

개념 설명:`;
  }

  return generateWithGemini(prompt, { temperature: 0.7, maxTokens: 3000 });
}

export async function generateMultilingualContent(topic: string, language: string): Promise<string> {
  const prompt = `Explain the following topic in ${language}:

Topic: ${topic}

Provide a clear, comprehensive explanation in ${language} that is culturally appropriate and easy to understand.`;

  return generateWithGemini(prompt, { temperature: 0.7, maxTokens: 2000 });
}

export async function generateMnemonicWithGemini(
  subject: string,
  technique: string,
  content: string
): Promise<string> {
  const subjectPrompts = {
    history: '한국사 및 역사 학습에 최적화된',
    math: '수학 공식과 개념 학습에 특화된',
    science: '과학 원리와 실험 암기에 효과적인',
    english: '영어 단어와 문법 학습에 적합한',
    custom: '범용적으로 사용 가능한',
  };

  const techniquePrompts = {
    sequence: '순서대로 나열된 항목들을 스토리나 연상 고리로 연결하는 기억술',
    story: '정보를 생생하고 기억하기 쉬운 이야기로 변환하는 기억술',
    acronym: '각 항목의 첫 글자를 모아 단어나 문장을 만드는 기억술',
    association: '추상적 개념을 구체적이고 강렬한 이미지와 연결하는 기억술',
  };

  const prompt = `당신은 기억술 전문가입니다. 다음 내용을 ${subjectPrompts[subject as keyof typeof subjectPrompts] || '효과적인'} ${techniquePrompts[technique as keyof typeof techniquePrompts]}을 사용하여 암기하기 쉽게 만들어주세요.

암기할 내용:
${content}

다음 가이드라인을 따라주세요:
1. 생생하고 구체적인 이미지를 사용하세요
2. 감정적이고 인상적인 연결을 만드세요
3. 이해하기 쉽고 실용적이어야 합니다
4. 한국어로 자연스럽게 작성하세요
5. 불필요한 인사말이나 설명 없이 바로 기억술 내용을 제공하세요

기억술:`;

  return generateWithGemini(prompt, { temperature: 0.8, maxTokens: 2000 });
}

export default genAI;
