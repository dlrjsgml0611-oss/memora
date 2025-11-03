import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWithOpenAI(prompt: string, options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: options?.model || 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2000,
    });

    return completion.choices[0].message.content || '';
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

export async function generateConceptWithOpenAI(topicTitle: string, curriculumContext: string): Promise<string> {
  const prompt = `Explain the following topic in detail:

Topic: ${topicTitle}
Context: ${curriculumContext}

Provide a comprehensive explanation including:
1. Clear definition and overview
2. Key concepts and principles
3. Practical examples
4. Common misconceptions
5. Tips for understanding and remembering

Write in a clear, educational style suitable for learning.`;

  return generateWithOpenAI(prompt, { temperature: 0.7, maxTokens: 2000 });
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

export default openai;
