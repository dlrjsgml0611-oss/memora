import { NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse } from '@/types';

type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };

  return NextResponse.json(response, { status });
}

export function errorResponse(
  error: string,
  status: number = 400
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
    message: error,
  };

  return NextResponse.json(response, { status });
}

export function codedErrorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  const response: ApiResponse = {
    success: false,
    code,
    error: message,
    message,
    details,
  };
  return NextResponse.json(response, { status });
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };

  return NextResponse.json(response);
}

export function createdResponse<T>(
  data: T,
  message?: string
): NextResponse {
  return successResponse(data, message, 201);
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return codedErrorResponse('UNAUTHORIZED', message, 401);
}

export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return codedErrorResponse('FORBIDDEN', message, 403);
}

export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return codedErrorResponse('NOT_FOUND', `${resource} not found`, 404);
}

export function conflictResponse(message: string): NextResponse {
  return codedErrorResponse('CONFLICT', message, 409);
}

export function validationErrorResponse(errors: any): NextResponse {
  return codedErrorResponse('VALIDATION_ERROR', 'Validation failed', 400, errors);
}

export function rateLimitResponse(
  message: string,
  retryAfterSec: number,
  details?: unknown
): NextResponse {
  const response = codedErrorResponse('RATE_LIMITED', message, 429, details);
  response.headers.set('Retry-After', String(retryAfterSec));
  return response;
}
