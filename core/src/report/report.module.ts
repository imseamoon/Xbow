import { Module, forwardRef } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { ScanModule } from '../scan/scan.module';
import { UserAuthModule } from '../userauth/userauth.module';

@Module({
  imports: [forwardRef(() => ScanModule), UserAuthModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
