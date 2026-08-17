import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { isTransientDbError } from './db-errors';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (err) {
        if (!isTransientDbError(err)) throw err;
        this.logger.warn(`Retry ${params.model ?? 'query'}.${params.action} after DB hiccup`);
        try {
          await this.$connect();
        } catch {
          /* reconnect best-effort */
        }
        return next(params);
      }
    });
  }

  async onModuleInit() {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        this.logger.warn(`DB connect attempt ${attempt}/5 failed`);
        if (attempt === 5) throw err;
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
