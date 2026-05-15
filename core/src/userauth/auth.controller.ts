import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID as uuidv4 } from 'crypto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { UserEntity } from './user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { TestAuthDto } from './dto/test-auth.dto';

const SALT_ROUNDS = 12;
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'register a new account' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const existing = await this.userRepo.findOneBy({ email: dto.email });
    if (existing) {
      return res.status(HttpStatus.CONFLICT).json({
        message: 'An account with this email already exists',
      });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = this.userRepo.create({
      id,
      email: dto.email,
      name: dto.name,
      password: passwordHash,
    });
    await this.userRepo.save(user);

    const token = this.jwt.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get<string>('JWT_SECRET') ?? 'dev-jwt-secret-change-me',
        expiresIn: '7d',
      },
    );

    res.cookie('rs_token', token, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'log in with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.userRepo.findOneBy({ email: dto.email });
    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid email or password',
      });
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid email or password',
      });
    }

    const token = this.jwt.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get<string>('JWT_SECRET') ?? 'dev-jwt-secret-change-me',
        expiresIn: '7d',
      },
    );

    res.cookie('rs_token', token, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'log out — clears auth cookie' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('rs_token', '', {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  async me(@Req() req: Request) {
    const user = req.user as UserEntity;
    return {
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  @Post('test-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'test target website login credentials' })
  @ApiResponse({ status: 200, description: 'Login test result' })
  async testLogin(@Body() dto: TestAuthDto) {
    const result = await this.authService.login({
      enabled: true,
      loginUrl: dto.loginUrl,
      username: dto.username,
      password: dto.password,
      usernameSelector: dto.usernameSelector,
      passwordSelector: dto.passwordSelector,
      submitSelector: dto.submitSelector,
      postLoginWaitMs: dto.postLoginWaitMs ?? 3000,
      successUrlContains: dto.successUrlContains,
    });

    if (result.success) {
      return {
        success: true,
        cookies: result.session.storageState.cookies.length,
        cookieHeader: result.session.cookieHeader.slice(0, 80) + '...',
        createdAt: result.session.createdAt,
        message: `Login successful — ${result.session.storageState.cookies.length} cookies captured`,
      };
    }

    return {
      success: false,
      error: result.error,
      message: result.error,
    };
  }
}
