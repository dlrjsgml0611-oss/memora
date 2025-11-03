import { NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse } from '@/types';

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
  return errorResponse(message, 401);
}

export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return errorResponse(message, 403);
}

export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return errorResponse(`${resource} not found`, 404);
}

export function conflictResponse(message: string): NextResponse {
  return errorResponse(message, 409);
}

export function validationErrorResponse(errors: any): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      details: errors,
    },
    { status: 400 }
  );
}
