import {
  generateCurriculumWithOpenAI,
  generateConceptWithOpenAI,
  generateFlashcardsWithOpenAI,
} from './openai';
import {
  generateCurriculumWithClaude,
  generateConceptWithClaude,
  generateDeepAnalysis,
} from './claude';
import {
  generateCurriculumWithGemini,
  generateConceptWithGemini,
  generateMultilingualContent,
} from './gemini';

export type AIModel = 'openai' | 'claude' | 'gemini';

/**
 * Router for AI model selection
 * Automatically routes requests to the appropriate AI model
 */
export class AIRouter {
  private defaultModel: AIModel;

  constructor(defaultModel: AIModel = 'openai') {
    this.defaultModel = defaultModel;
  }

  /**
   * Generate a curriculum using the specified AI model
   */
  async generateCurriculum(
    goal: string,
    subject: string,
    difficulty: string,
    model?: AIModel
  ): Promise<any> {
    const selectedModel = model || this.defaultModel;

    switch (selectedModel) {
      case 'openai':
        return generateCurriculumWithOpenAI(goal, subject, difficulty);
      case 'claude':
        return generateCurriculumWithClaude(goal, subject, difficulty);
      case 'gemini':
        return generateCurriculumWithGemini(goal, subject, difficulty);
      default:
        throw new Error(`Unknown AI model: ${selectedModel}`);
    }
  }

  /**
   * Generate a concept explanation using the specified AI model
   */
  async generateConcept(
    topicTitle: string,
    curriculumContext: string,
    model?: AIModel,
    mode: 'encyclopedia' | 'conversational' = 'conversational'
  ): Promise<string> {
    const selectedModel = model || this.defaultModel;

    switch (selectedModel) {
      case 'openai':
        return generateConceptWithOpenAI(topicTitle, curriculumContext, mode);
      case 'claude':
        return generateConceptWithClaude(topicTitle, curriculumContext, mode);
      case 'gemini':
        return generateConceptWithGemini(topicTitle, curriculumContext, mode);
      default:
        throw new Error(`Unknown AI model: ${selectedModel}`);
    }
  }

  /**
   * Generate flashcards (OpenAI only for now)
   */
  async generateFlashcards(
    conceptText: string,
    count: number = 5
  ): Promise<Array<{ front: string; back: string; hint?: string }>> {
    return generateFlashcardsWithOpenAI(conceptText, count);
  }

  /**
   * Generate deep analysis (Claude only)
   */
  async generateDeepAnalysis(topic: string, context: string): Promise<string> {
    return generateDeepAnalysis(topic, context);
  }

  /**
   * Generate multilingual content (Gemini only)
   */
  async generateMultilingualContent(topic: string, language: string): Promise<string> {
    return generateMultilingualContent(topic, language);
  }

  /**
   * Automatically select the best model for a given task
   */
  selectBestModel(task: 'curriculum' | 'concept' | 'flashcard' | 'analysis' | 'multilingual'): AIModel {
    switch (task) {
      case 'curriculum':
        return 'openai'; // GPT-4 is great at structured output
      case 'concept':
        return 'claude'; // Claude excels at detailed explanations
      case 'flashcard':
        return 'openai'; // OpenAI for structured flashcard generation
      case 'analysis':
        return 'claude'; // Claude for deep analysis
      case 'multilingual':
        return 'gemini'; // Gemini for multilingual support
      default:
        return this.defaultModel;
    }
  }
}

// Export singleton instance
export const aiRouter = new AIRouter();
