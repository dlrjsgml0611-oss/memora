import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { ConceptVisualAsset } from '@/lib/db/models';
import { codedErrorResponse, notFoundResponse } from '@/lib/utils/response';

export const maxDuration = 60;

function coerceBinaryToBuffer(value: unknown): Buffer | null {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);

  if (typeof value === 'object') {
    const row = value as { buffer?: unknown; value?: () => unknown };
    if (Buffer.isBuffer(row.buffer)) return row.buffer;
    if (row.buffer instanceof Uint8Array) return Buffer.from(row.buffer);

    if (typeof row.value === 'function') {
      const resolved = row.value();
      if (Buffer.isBuffer(resolved)) return resolved;
      if (resolved instanceof Uint8Array) return Buffer.from(resolved);
    }
  }

  return null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ cacheKey: string }> }
) {
  try {
    await connectDB();

    const { cacheKey } = await context.params;
    if (!/^[a-f0-9]{64}$/i.test(cacheKey)) {
      return notFoundResponse('Visual asset');
    }

    const asset = await ConceptVisualAsset.findOne({ cacheKey })
      .select('data mimeType')
      .exec();

    if (!asset || Array.isArray(asset)) {
      return notFoundResponse('Visual asset');
    }

    const buffer = coerceBinaryToBuffer((asset as any).data);
    if (!buffer || buffer.byteLength === 0) {
      return notFoundResponse('Visual asset');
    }
    const mimeType = typeof (asset as any).mimeType === 'string' ? (asset as any).mimeType : 'image/webp';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (error) {
    console.error('Get concept visual asset error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to load visual asset', 500);
  }
}
