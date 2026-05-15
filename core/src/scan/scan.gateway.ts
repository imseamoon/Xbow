import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ScanPhase } from '../common/interfaces/scan.interface';
import { Vuln } from '../common/interfaces/vuln.interface';
import { WsAuthMiddleware, AuthenticatedSocket } from '../userauth/ws-auth.middleware';

export interface ProgressPayload {
  scanId: string;
  phase: ScanPhase;
  progress: number;
  message: string;
}

export interface FindingPayload {
  scanId: string;
  vuln: Partial<Vuln>;
}

export interface CompletePayload {
  scanId: string;
  summary: {
    totalParams: number;
    paramsTested: number;
    vulnsFound: number;
    durationMs: number;
  };
  reportUrl?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class ScanGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ScanGateway.name);

  constructor(private readonly wsAuth: WsAuthMiddleware) {}

  afterInit(server: Server) {
    server.use(this.wsAuth.create());
    this.logger.log('WebSocket auth middleware registered');
  }

  handleConnection(client: Socket) {
    const authed = (client as AuthenticatedSocket).user
      ? `user=${(client as AuthenticatedSocket).user!.email}`
      : 'unauthenticated';
    this.logger.log(`client connected: ${client.id} (${authed})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`client disconnected: ${client.id}`);
  }

  emitProgress(payload: ProgressPayload): void {
    this.server.emit('scan:progress', payload);
  }

  emitFinding(payload: FindingPayload): void {
    this.server.emit('scan:finding', payload);
  }

  emitComplete(payload: CompletePayload): void {
    this.server.emit('scan:complete', payload);
  }

  emitError(scanId: string, message: string): void {
    this.server.emit('scan:error', { scanId, message });
  }
}
