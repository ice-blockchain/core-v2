export default class AppError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;

  constructor(message: string, statusCode = 500, errorCode = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace?.(this, AppError);
  }
}
