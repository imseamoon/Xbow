import { IsUrl, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestAuthDto {
  @ApiProperty({ description: 'URL of the login page', example: 'https://target.com/login' })
  @IsUrl({ require_tld: false })
  loginUrl!: string;

  @ApiProperty({ description: 'Username or email for login' })
  @IsString()
  username!: string;

  @ApiProperty({ description: 'Password for login' })
  @IsString()
  password!: string;

  @ApiPropertyOptional({ description: 'CSS selector for the username input', example: 'input[name="username"]' })
  @IsOptional()
  @IsString()
  usernameSelector?: string;

  @ApiPropertyOptional({ description: 'CSS selector for the password input', example: 'input[type="password"]' })
  @IsOptional()
  @IsString()
  passwordSelector?: string;

  @ApiPropertyOptional({ description: 'CSS selector for the submit button', example: 'button[type="submit"]' })
  @IsOptional()
  @IsString()
  submitSelector?: string;

  @ApiPropertyOptional({ description: 'Milliseconds to wait after submit', default: 3000 })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(30000)
  postLoginWaitMs?: number;

  @ApiPropertyOptional({ description: 'URL fragment expected after successful login', example: '/dashboard' })
  @IsOptional()
  @IsString()
  successUrlContains?: string;
}
