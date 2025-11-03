export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  return {
    success: false,
    error: 'Unknown error',
    statusCode: 500,
  };
}
