import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// export async function generateVideoWithOpenAI(prompt: string, options?: {
//   model?: string;
//   temperature?: number;
//   maxTokens?: number;
// }): Promise<void> {
//   try {
    
//     let video = await openai.videos.create({
//         model: 'sora-2',
//         prompt: "A video of the words 'Thank you' in sparkling letters",
//     });

//     console.log('Video generation started: ', video);
//     let progress = video.progress ?? 0;

//     while (video.status === 'in_progress' || video.status === 'queued') {
//         video = await openai.videos.retrieve(video.id);
//         progress = video.progress ?? 0;

//         // Display progress bar
//         const barLength = 30;
//         const filledLength = Math.floor((progress / 100) * barLength);
//         // Simple ASCII progress visualization for terminal output
//         const bar = '='.repeat(filledLength) + '-'.repeat(barLength - filledLength);
//         const statusText = video.status === 'queued' ? 'Queued' : 'Processing';

//         process.stdout.write(`${statusText}: [${bar}] ${progress.toFixed(1)}%`);

//         await new Promise((resolve) => setTimeout(resolve, 2000));
//     }

//     // Clear the progress line and show completion
//     process.stdout.write('\n');

//     if (video.status === 'failed') {
//         console.error('Video generation failed');
//         return;
//     }

//     console.log('Video generation completed: ', video);

//     console.log('Downloading video content...');

//     const content = await openai.videos.downloadContent(video.id);

//     const body = content.arrayBuffer();
//     const buffer = Buffer.from(await body);

//     require('fs').writeFileSync('video.mp4', buffer);

//     console.log('Wrote video.mp4');

    
//   } catch (error) {
//     console.error('OpenAI API error:', error);
//     throw new Error('Failed to generate content with OpenAI');
//   }
// }


// don't touch this.
export async function generateWithOpenAI(prompt: string, options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  try {
    const completion = await openai.responses.create({
      model: options?.model || 'gpt-5-mini',
      reasoning: {"effort": "minimal"},
      input: prompt,
      //temperature: options?.temperature || 0.7,
    });

    return completion.output_text || '';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate content with OpenAI');
  }
}

export async function generateCurriculumWithOpenAI(goal: string, subject: string, difficulty: string): Promise<any> {
  const prompt = `Create a concise learning curriculum for the following:

Goal: ${goal}
Subject: ${subject}
Difficulty Level: ${difficulty}

IMPORTANT: Create exactly 3-4 modules with 3-5 topics each. Keep it focused and concise.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "title": "Curriculum title in Korean",
  "description": "Brief description in Korean",
  "modules": [
    {
      "moduleId": "module-1",
      "title": "Module title in Korean",
      "order": 1,
      "estimatedHours": 8,
      "topics": [
        {
          "topicId": "topic-1-1",
          "title": "Topic title in Korean",
          "order": 1
        }
      ]
    }
  ]
}

Return ONLY the JSON object, nothing else.`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.7, maxTokens: 4000 });

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
      console.error('No JSON found in response:', cleanedResponse.substring(0, 500));
      throw new Error('No JSON object found in response');
    }

    let jsonStr = jsonMatch[0];

    // Try to fix incomplete JSON by finding the last complete object
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.log('Initial parse failed, trying to fix incomplete JSON...');

      // Find the last complete array closing bracket
      const lastModulesClose = jsonStr.lastIndexOf(']');
      if (lastModulesClose !== -1) {
        // Reconstruct the JSON by closing it properly
        const upToModules = jsonStr.substring(0, lastModulesClose + 1);
        jsonStr = upToModules + '\n}';
        parsed = JSON.parse(jsonStr);
      } else {
        throw parseError;
      }
    }

    // Validate structure
    if (!parsed.title || !parsed.modules || !Array.isArray(parsed.modules)) {
      throw new Error('Invalid curriculum structure');
    }

    return parsed;
  } catch (error: any) {
    console.error('Failed to parse curriculum:', error);
    console.error('Response preview:', response.substring(0, 500));
    throw new Error(`Failed to generate curriculum: ${error.message}`);
  }
}

export async function generateConceptWithOpenAI(
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

  return generateWithOpenAI(prompt, { temperature: 0.7, maxTokens: 3000 });
}

export async function generateFlashcardsWithOpenAI(conceptText: string, count: number = 5): Promise<Array<{ front: string; back: string; hint?: string }>> {
  const prompt = `Generate ${count} flashcards based on the following concept:

${conceptText}

Provide the flashcards in JSON format as an array:
[
  {
    "front": "Question or prompt",
    "back": "Answer or explanation",
    "hint": "Optional hint (can be empty string)"
  }
]

Make the flashcards focused on key concepts and facts.`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.7, maxTokens: 2000 });

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse flashcards JSON');
  } catch (error) {
    console.error('Failed to parse flashcards:', error);
    throw new Error('Failed to generate flashcards');
  }
}

export async function generateMindmapWithOpenAI(
  conceptTitle: string,
  conceptContent: string
): Promise<any> {
  const prompt = `다음 개념을 기반으로 마인드맵 구조를 생성해주세요.

개념 제목: ${conceptTitle}
개념 내용:
${conceptContent}

마인드맵은 중심 주제에서 시작하여 주요 개념들을 가지로 펼쳐나가는 구조입니다.
다음 JSON 형식으로 마인드맵 구조를 생성해주세요:

{
  "nodes": [
    {
      "id": "node-1",
      "label": "노드 레이블",
      "type": "central/main/sub",
      "color": "#3b82f6",
      "image": "이모지 또는 비워두기"
    }
  ],
  "connections": [
    {
      "from": "node-1",
      "to": "node-2",
      "label": "연결 레이블 (선택사항)"
    }
  ]
}

요구사항:
1. 중심 노드(central) 1개를 만드세요 (개념 제목)
2. 주요 개념(main) 3-5개를 만드세요
3. 각 주요 개념마다 하위 개념(sub) 2-3개씩 만드세요
4. 총 10-20개의 노드를 생성하세요
5. 각 노드는 짧고 명확한 레이블을 가져야 합니다
6. 노드 타입에 따라 다른 색상을 사용하세요 (central: #8b5cf6, main: #3b82f6, sub: #10b981)
7. 관련 이모지를 추가하면 더 좋습니다
8. 불필요한 설명 없이 JSON만 반환하세요

마인드맵 구조:`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.7, maxTokens: 3000 });

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

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error('Invalid mindmap structure');
    }

    return parsed;
  } catch (error: any) {
    console.error('Failed to parse mindmap:', error);
    console.error('Response preview:', response.substring(0, 500));
    throw new Error(`Failed to generate mindmap: ${error.message}`);
  }
}

export async function generateMemoryPalaceWithOpenAI(
  conceptTitle: string,
  conceptContent: string
): Promise<any> {
  const prompt = `다음 개념을 기반으로 기억의 궁전(Memory Palace) 구조를 생성해주세요.

개념 제목: ${conceptTitle}
개념 내용:
${conceptContent}

기억의 궁전은 공간적 기억을 활용하여 정보를 기억하는 기법입니다.
각 기억 항목은 3D 공간에 배치되며, 모양, 크기, 색상으로 시각화됩니다.

다음 JSON 형식으로 기억의 궁전을 생성해주세요:

{
  "description": "기억의 궁전 설명",
  "items": [
    {
      "content": "기억할 내용 (핵심 개념이나 사실)",
      "position": {
        "x": 20-80 사이의 숫자,
        "y": 20-80 사이의 숫자
      },
      "shape": "card/cube/sphere/pyramid",
      "size": "small/medium/large",
      "color": "#hex색상코드"
    }
  ]
}

요구사항:
1. 개념의 핵심 내용을 5-10개의 기억 항목으로 나누세요
2. 각 항목은 한 문장으로 간결하게 작성하세요
3. 위치는 겹치지 않게 배치하세요
4. 중요도에 따라 크기를 다르게 설정하세요 (중요: large, 보통: medium, 덜 중요: small)
5. 관련 있는 항목끼리는 비슷한 색상을 사용하세요
6. 모양은 내용의 특성에 맞게 선택하세요:
   - card: 일반적인 설명, 정의
   - cube: 견고한 사실, 법칙
   - sphere: 순환적 개념, 관계
   - pyramid: 계층 구조, 중요 원리
7. 불필요한 설명 없이 JSON만 반환하세요

기억의 궁전:`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.7, maxTokens: 3000 });

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

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid memory palace structure');
    }

    return parsed;
  } catch (error: any) {
    console.error('Failed to parse memory palace:', error);
    console.error('Response preview:', response.substring(0, 500));
    throw new Error(`Failed to generate memory palace: ${error.message}`);
  }
}

export async function generateMnemonicWithOpenAI(
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

  return generateWithOpenAI(prompt, { temperature: 0.8, maxTokens: 2000 });
}

export default openai;
