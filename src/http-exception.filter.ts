import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { isTransientDbError } from './prisma/db-errors';

const BUSY = 'Сервер временно недоступен. Подождите минуту и попробуйте снова.';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return res.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
    }

    if (isTransientDbError(exception)) {
      this.logger.warn(`Transient DB error: ${(exception as Error)?.message || exception}`);
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ statusCode: 503, message: BUSY });
    }

    this.logger.error(exception);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: BUSY });
  }
}
