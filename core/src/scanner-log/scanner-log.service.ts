import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID as uuidv4 } from 'crypto';

export interface ScannerLogEntry {
  timestamp: string;
  phase: string;
  message: string;
  details?: Record<string, unknown>;
  durationMs?: number;
}

export interface ScannerLogFile {
  scanId: string;
  targetUrl: string;
  startedAt: string;
  completedAt?: string;
  status: string;
  entries: ScannerLogEntry[];
}

@Injectable()
export class ScannerLogService {
  private readonly logger = new Logger(ScannerLogService.name);
  private readonly logsDir = path.join(process.cwd(), 'scanner-logs');
  /** In-memory buffer per scan before flushing to disk */
  private readonly buffers = new Map<string, ScannerLogEntry[]>();

  constructor() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      this.logger.log(`scanner logs directory created: ${this.logsDir}`);
    }
  }

  /** Append an entry to the in-memory buffer for a scan */
  append(scanId: string, entry: ScannerLogEntry): void {
    if (!this.buffers.has(scanId)) {
      this.buffers.set(scanId, []);
    }
    this.buffers.get(scanId)!.push(entry);
  }

  /** Flush the buffer to disk as a JSON log file */
  flush(
    scanId: string,
    meta: {
      targetUrl: string;
      startedAt: Date;
      status: string;
    },
  ): string | null {
    const entries = this.buffers.get(scanId);
    if (!entries || entries.length === 0) {
      this.logger.warn(`no log entries to flush for scanId=${scanId}`);
      return null;
    }

    try {
      const logFile: ScannerLogFile = {
        scanId,
        targetUrl: meta.targetUrl,
        startedAt: meta.startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        status: meta.status,
        entries,
      };

      const filePath = path.join(this.logsDir, `${scanId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(logFile, null, 2), 'utf-8');
      this.buffers.delete(scanId);

      this.logger.log(`scanner log flushed for scanId=${scanId}: ${filePath}`);
      return filePath;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`failed to flush scanner log for scanId=${scanId}: ${detail}`);
      return null;
    }
  }

  /** Read a scanner log file for a scan */
  getLog(scanId: string): ScannerLogFile | null {
    const filePath = path.join(this.logsDir, `${scanId}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as ScannerLogFile;
    } catch {
      return null;
    }
  }

  /** Delete a scanner log file */
  deleteLog(scanId: string): void {
    const filePath = path.join(this.logsDir, `${scanId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    this.buffers.delete(scanId);
  }

  /** Delete all scanner logs */
  deleteAll(): void {
    if (fs.existsSync(this.logsDir)) {
      const files = fs.readdirSync(this.logsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.logsDir, file));
      }
    }
    this.buffers.clear();
  }

  /** Check if a scanner log exists on disk */
  exists(scanId: string): boolean {
    return fs.existsSync(path.join(this.logsDir, `${scanId}.json`));
  }
}
