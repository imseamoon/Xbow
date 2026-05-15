import {
  IsUrl,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  IsIn,
  IsString,
  IsNotEmpty,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthOptionsDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = false;

  @ApiPropertyOptional({ example: 'https://target.com/login' })
  @ValidateIf((o) => o.enabled)
  @IsString()
  @IsNotEmpty()
  loginUrl?: string;

  @ApiPropertyOptional({ example: 'admin' })
  @ValidateIf((o) => o.enabled)
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ApiPropertyOptional({ example: 'password' })
  @ValidateIf((o) => o.enabled)
  @IsString()
  @IsNotEmpty()
  password?: string;

  @ApiPropertyOptional({ example: 'input[name="username"]' })
  @IsOptional()
  @IsString()
  usernameSelector?: string;

  @ApiPropertyOptional({ example: 'input[name="password"]' })
  @IsOptional()
  @IsString()
  passwordSelector?: string;

  @ApiPropertyOptional({ example: 'button[type="submit"]' })
  @IsOptional()
  @IsString()
  submitSelector?: string;

  @ApiPropertyOptional({ default: 3000 })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(30000)
  postLoginWaitMs?: number = 3000;

  @ApiPropertyOptional({ example: '/dashboard' })
  @IsOptional()
  @IsString()
  successUrlContains?: string;
}

export class ScanOptionsDto {
  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  depth?: number = 3;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxParams?: number = 100;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  verifyExecution?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  wafBypass?: boolean = true;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxPayloadsPerParam?: number = 50;

  @ApiPropertyOptional({ default: 60000 })
  @IsOptional()
  @IsInt()
  @Min(5000)
  @Max(300000)
  timeout?: number = 60000;

  @ApiPropertyOptional({ default: ['html', 'json'] })
  @IsOptional()
  @IsArray()
  @IsIn(['html', 'json', 'pdf'], { each: true })
  reportFormat?: ('html' | 'json' | 'pdf')[] = ['html', 'json'];

  @ApiPropertyOptional({
    default: false,
    description:
      'When true, skip crawling and scan only the exact URL provided. ' +
      'Faster and cheaper — use for targeted single-page checks.',
  })
  @IsOptional()
  @IsBoolean()
  singlePage?: boolean = false;

  @ApiPropertyOptional({
    type: AuthOptionsDto,
    description:
      'Authentication configuration. When enabled, the scanner will ' +
      'log in using the provided credentials before crawling and testing.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthOptionsDto)
  auth?: AuthOptionsDto;
}

export class CreateScanDto {
  @ApiProperty({ example: 'https://target.com' })
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  options?: ScanOptionsDto;
}
