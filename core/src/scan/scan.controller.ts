import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ScanService } from './scan.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanResultDto } from './dto/scan-result.dto';
import { ScanQueueProducer } from '../queue/scan.producer';
import { JwtAuthGuard } from '../userauth';

@ApiTags('scans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ScanController {
  constructor(
    private readonly scanService: ScanService,
    private readonly scanQueue: ScanQueueProducer,
  ) {}

  @Post('scan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'start a new scan' })
  @ApiResponse({ status: 201, type: ScanResultDto })
  async createScan(
    @Body() dto: CreateScanDto,
    @Req() req: Request,
  ): Promise<ScanResultDto> {
    const userId = (req as any).user?.id;
    try {
      const scan = await this.scanService.create(dto, userId);
      await this.scanQueue.enqueue(scan.id);
      return scan as unknown as ScanResultDto;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Invalid URL')) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Get('scan/:id')
  @ApiOperation({ summary: 'get scan status and results' })
  @ApiResponse({ status: 200, type: ScanResultDto })
  async getScan(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ScanResultDto> {
    const userId = (req as any).user?.id;
    const scan = await this.scanService.findOne(id, userId);
    const vulns = await this.scanService.getVulns(id);
    return { ...scan, vulns } as unknown as ScanResultDto;
  }

  @Delete('scan/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'cancel an active scan' })
  async cancelScan(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    const userId = (req as any).user?.id;
    await this.scanService.findOne(id, userId);
    await this.scanService.cancel(id);
  }

  @Delete('scans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'permanently delete a scan and its results' })
  async deleteScan(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    const userId = (req as any).user?.id;
    await this.scanService.findOne(id, userId);
    await this.scanService.deleteScan(id);
  }

  @Delete('scans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'delete all scans, results, and reports' })
  async deleteAllScans(): Promise<{ deleted: number }> {
    const count = await this.scanService.deleteAllScans();
    return { deleted: count };
  }

  @Get('scans')
  @ApiOperation({ summary: 'list all scans paginated' })
  async listScans(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Req() req: Request,
  ): Promise<ScanResultDto[]> {
    const userId = (req as any).user?.id;
    const all = await this.scanService.findAll(userId);
    const start = (Number(page) - 1) * Number(limit);
    const paged = all.slice(start, start + Number(limit));
    const results: ScanResultDto[] = [];
    for (const s of paged) {
      const vulns = await this.scanService.getVulns(s.id);
      results.push({ ...s, vulns } as unknown as ScanResultDto);
    }
    return results;
  }

  @Get('scan/:id/audit')
  @ApiOperation({ summary: 'get scan audit trail (crawl, payloads, injection points)' })
  async getAuditLogs(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    await this.scanService.findOne(id, userId);
    const logs = await this.scanService.getAuditLogs(id);
    return { scanId: id, logs };
  }

  @Get('scan/:id/report')
  @ApiOperation({ summary: 'get report for a completed scan' })
  async getReport(@Param('id') id: string): Promise<{ reportUrl: string }> {
    await this.scanService.findOne(id);
    return { reportUrl: `/reports/${id}.html` };
  }
}
