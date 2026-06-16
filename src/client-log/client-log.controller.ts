import { Body, Controller, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller('client-log')
export class ClientLogController {
  private readonly logger = new Logger('ClientLog');

  @Post()
  receive(@Body() body: Record<string, unknown>, @Req() req: Request) {
    this.logger.warn(
      JSON.stringify({
        ...body,
        ip: req.ip,
        forwarded: req.headers['x-forwarded-for'],
      }),
    );
    return { ok: true };
  }
}
