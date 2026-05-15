import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScanModule } from './scan/scan.module';
import { ReportModule } from './report/report.module';
import { HealthModule } from './health/health.module';
import { UserAuthModule } from './userauth/userauth.module';
import { ScannerLogModule } from './scanner-log/scanner-log.module';
import { ScanEntity } from './scan/entities/scan.entity';
import { VulnEntity } from './scan/entities/vuln.entity';
import { UserEntity } from './userauth/user.entity';
import { ScanAuditEntity } from './scan/entities/scan-audit.entity';
import { InitialSchema1709420400000 } from './migrations/1709420400000-InitialSchema';
import { AddUsersAndApiKeys1710000000000 } from './migrations/1710000000000-AddUsersAndApiKeys';
import { AddScanUserIdAndAuditLog1720000000000 } from './migrations/1720000000000-AddScanUserIdAndAuditLog';
import { BackfillScanOwner1730000000000 } from './migrations/1730000000000-BackfillScanOwner';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get('NODE_ENV') === 'production';
        const url = config.get<string>('DATABASE_URL');

        const base = url
          ? { url }
          : {
              host: config.get<string>('DB_HOST') ?? 'localhost',
              port: config.get<number>('DB_PORT') ?? 5432,
              username: config.get<string>('DB_USER') ?? 'rs',
              password: config.get<string>('DB_PASS') ?? 'rs',
              database: config.get<string>('DB_NAME') ?? 'redsentinel',
            };

        return {
          type: 'postgres' as const,
          ...base,
          entities: [ScanEntity, VulnEntity, UserEntity, ScanAuditEntity],
          migrations: [
            InitialSchema1709420400000,
            AddUsersAndApiKeys1710000000000,
            AddScanUserIdAndAuditLog1720000000000,
            BackfillScanOwner1730000000000,
          ],
          migrationsRun: true,
          migrationsTableName: 'typeorm_migrations',
          synchronize: !isProd,
          logging: !isProd,
        };
      },
    }),
    UserAuthModule,
    ScannerLogModule,
    ScanModule,
    ReportModule,
    HealthModule,
  ],
})
export class AppModule {}
