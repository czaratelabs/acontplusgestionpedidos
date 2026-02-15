import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global exception filter so API always returns JSON with a "message" field.
 * - HttpException (and subclasses): use its status and message.
 * - Other errors: 500 and expose exception.message so the frontend can show it (e.g. contact save).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    if (isHttpException) {
      const payload = exception.getResponse();
      message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? Array.isArray((payload as { message: unknown }).message)
            ? (payload as { message: string[] }).message[0] ?? exception.message
            : String((payload as { message: string }).message)
          : exception.message;
    } else {
      message =
        exception instanceof Error ? exception.message : 'Internal server error';
      this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    }

    res.status(status).json({ message });
  }
}
