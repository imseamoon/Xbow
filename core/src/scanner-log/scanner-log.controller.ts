import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ScannerLogService } from './scanner-log.service';
import { ScanService } from '../scan/scan.service';
import { JwtAuthGuard } from '../userauth/jwt-auth.guard';

@ApiTags('scanner-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scanner-logs')
export class ScannerLogController {
  constructor(
    private readonly scannerLog: ScannerLogService,
    private readonly scanService: ScanService,
  ) {}

  @Get(':scanId')
  @ApiOperation({ summary: 'get scanner log for a scan (crawl details, payloads, timings)' })
  async getLog(
    @Param('scanId') scanId: string,
    @Req() req: Request,
  ) {
    // Verify scan ownership first
    const userId = (req as any).user?.id;
    await this.scanService.findOne(scanId, userId);

    const log = this.scannerLog.getLog(scanId);
    if (!log) {
      throw new NotFoundException(`Scanner log not yet available for scan ${scanId} — scan may still be running`);
    }
    return log;
  }
}
