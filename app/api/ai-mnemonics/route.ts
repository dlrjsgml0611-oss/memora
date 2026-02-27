import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { generateMnemonicWithClaude } from '@/lib/ai/claude';
import { generateMnemonicWithOpenAI } from '@/lib/ai/openai';
import { generateMnemonicWithGemini } from '@/lib/ai/gemini';
import connectDB from '@/lib/db/mongodb';
import { AIMnemonic } from '@/lib/db/models';
import { attachRateLimitHeaders, consumeUserRateLimit } from '@/lib/rate-limit';
import { rateLimitResponse } from '@/lib/utils/response';

// Increase timeout for AI generation (5 minutes)
export const maxDuration = 300;
const AI_GENERATION_RATE_LIMIT = {
  routeKey: 'ai:mnemonic',
  maxPerMinute: 10,
  maxPerDay: 100,
} as const;

const validSubjects = ['history', 'math', 'science', 'english', 'custom'] as const;
const validTechniques = ['sequence', 'story', 'acronym', 'association'] as const;

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = Number(searchParams.get('limit') || 30);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 30;

    const entries = await AIMnemonic.find({ userId: authUser.userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: entries,
    });
  } catch (error: any) {
    console.error('Error getting mnemonics:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get mnemonics' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { subject, technique, content, save = true } = body;

    if (
      !content ||
      typeof content !== 'string' ||
      !subject ||
      !technique ||
      !validSubjects.includes(subject) ||
      !validTechniques.includes(technique)
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const rateLimit = consumeUserRateLimit(authUser.userId, AI_GENERATION_RATE_LIMIT);
    if (!rateLimit.allowed) {
      console.info('[ai.generate]', {
        route: '/api/ai-mnemonics',
        userId: authUser.userId,
        costType: 'mnemonic',
        result: 'deny',
      });
      const blocked = rateLimitResponse(
        'AI mnemonic generation limit exceeded. Please try again later.',
        rateLimit.retryAfterSec
      );
      return attachRateLimitHeaders(blocked, rateLimit.headers);
    }

    // Try providers in order: OpenAI -> Claude -> Gemini
    let mnemonic: string | null = null;
    let provider: 'openai' | 'claude' | 'gemini' | null = null;
    let lastError: any = null;


    // Try OpenAI first
    if (process.env.OPENAI_API_KEY) {
      try {
        mnemonic = await generateMnemonicWithOpenAI(subject, technique, content);
        provider = 'openai';
      } catch (error) {
        console.error('OpenAI failed:', error);
        lastError = error;
      }
    }

    // Fallback to Anthropic
    if (!mnemonic && process.env.ANTHROPIC_API_KEY) {
      try {
        mnemonic = await generateMnemonicWithClaude(subject, technique, content);
        provider = 'claude';
      } catch (error) {
        console.error('Claude failed:', error);
        lastError = error;
      }
    }

    // Fallback to Gemini
    if (!mnemonic && process.env.GOOGLE_AI_API_KEY) {
      try {
        mnemonic = await generateMnemonicWithGemini(subject, technique, content);
        provider = 'gemini';
      } catch (error) {
        console.error('Gemini failed:', error);
        lastError = error;
      }
    }

    if (!mnemonic) {
      throw lastError || new Error('No AI provider available');
    }

    let entry = null;
    if (save) {
      entry = await AIMnemonic.create({
        userId: authUser.userId,
        subject,
        technique,
        content,
        mnemonic,
        provider: provider || undefined,
      });
    }

    console.info('[ai.generate]', {
      route: '/api/ai-mnemonics',
      userId: authUser.userId,
      costType: 'mnemonic',
      result: 'allow',
    });

    const response = NextResponse.json({
      success: true,
      mnemonic,
      data: entry,
      provider,
    });
    return attachRateLimitHeaders(response, rateLimit.headers);
  } catch (error: any) {
    console.error('Error generating mnemonic:', error);
    const status =
      typeof error?.message === 'string' && error.message.startsWith('Missing required environment variable:')
        ? 400
        : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate mnemonic' },
      { status }
    );
  }
}
