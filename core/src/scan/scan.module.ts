import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { ScanGateway } from './scan.gateway';
import { QueueModule } from '../queue/queue.module';
import { UserAuthModule } from '../userauth/userauth.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { ScanEntity } from './entities/scan.entity';
import { VulnEntity } from './entities/vuln.entity';
import { ScanAuditEntity } from './entities/scan-audit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScanEntity, VulnEntity, ScanAuditEntity]),
    forwardRef(() => QueueModule),
    UserAuthModule,
    CrawlerModule,
  ],
  controllers: [ScanController],
  providers: [ScanService, ScanGateway],
  exports: [ScanService, ScanGateway, TypeOrmModule],
})
export class ScanModule {}
