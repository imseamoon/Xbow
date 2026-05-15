import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { UserEntity } from './user.entity';
import type { Socket } from 'socket.io';
import type { JwtPayload } from './jwt.strategy';

export interface AuthenticatedSocket extends Socket {
  user?: UserEntity;
}

@Injectable()
export class WsAuthMiddleware {
  private readonly logger = new Logger(WsAuthMiddleware.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {
    this.jwtSecret =
      this.config.get<string>('JWT_SECRET') ?? 'dev-jwt-secret-change-me';
  }

  /**
   * Returns a Socket.IO-compatible middleware function.
   * Supports token in:
   *   1. handshake.auth.token  (programmatic clients)
   *   2. handshake.query.token (fallback query param)
   *   3. Cookie header with rs_token (browser clients sending httpOnly cookie)
   */
  create(): (socket: Socket, next: (err?: Error) => void) => Promise<void> {
    return async (socket: Socket, next: (err?: Error) => void) => {
      try {
        let token: string | null =
          (socket.handshake.auth?.token as string) ??
          (socket.handshake.query?.token as string) ??
          null;

        // Fallback: extract from Cookie header (browser httpOnly cookies)
        if (!token) {
          const cookieHeader = socket.handshake.headers?.cookie as string | undefined;
          if (cookieHeader) {
            const match = cookieHeader.match(/(?:^|;)\s*rs_token\s*=\s*([^;]+)/);
            if (match) {
              token = decodeURIComponent(match[1]);
            }
          }
        }

        if (!token) {
          this.logger.debug(`ws client ${socket.id} connected without token`);
          return next();
        }

        // Verify JWT
        try {
          const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
          const user = await this.userRepo.findOneBy({ id: payload.sub });
          if (user) {
            (socket as AuthenticatedSocket).user = user;
            this.logger.debug(`ws client ${socket.id} authenticated as ${user.email}`);
            return next();
          }
        } catch {
          this.logger.warn(`ws client ${socket.id} provided invalid token`);
          return next(new Error('Authentication failed'));
        }

        return next(new Error('Authentication failed'));
      } catch (err) {
        this.logger.error(`ws auth middleware error: ${err}`);
        return next(new Error('Authentication failed'));
      }
    };
  }
}
