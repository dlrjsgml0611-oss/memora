import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateWithClaude(prompt: string, options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  try {
    const message = await claude.messages.create({
      model: options?.model || 'claude-sonnet-4-5-20250929',
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return '';
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate content with Claude');
  }
}

export async function generateCurriculumWithClaude(goal: string, subject: string, difficulty: string): Promise<any> {
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

  const response = await generateWithClaude(prompt, { temperature: 0.7, maxTokens: 4000 });

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

export async function generateConceptWithClaude(topicTitle: string, curriculumContext: string): Promise<string> {
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

  return generateWithClaude(prompt, { temperature: 0.7, maxTokens: 2000 });
}

export async function generateDeepAnalysis(topic: string, context: string): Promise<string> {
  const prompt = `Provide a deep, analytical explanation of the following topic:

Topic: ${topic}
Context: ${context}

Include:
1. Theoretical foundations
2. Historical context and development
3. Interconnections with related concepts
4. Real-world applications
5. Current trends and future directions

Make the analysis thorough and insightful.`;

  return generateWithClaude(prompt, { temperature: 0.7, maxTokens: 3000 });
}

export default claude;
