import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { UserEntity } from './user.entity';

export interface JwtPayload {
  sub: string;  // user id
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {
    const secret = config.get<string>('JWT_SECRET') ?? 'dev-jwt-secret-change-me';
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          let token: string | null = null;
          if (req?.cookies) {
            token = req.cookies['rs_token'] ?? null;
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<UserEntity> {
    const user = await this.userRepo.findOneBy({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
