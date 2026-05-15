import { Module, forwardRef } from '@nestjs/common';
import { ScannerLogService } from './scanner-log.service';
import { ScannerLogController } from './scanner-log.controller';
import { ScanModule } from '../scan/scan.module';
import { UserAuthModule } from '../userauth/userauth.module';

@Module({
  imports: [forwardRef(() => ScanModule), UserAuthModule],
  controllers: [ScannerLogController],
  providers: [ScannerLogService],
  exports: [ScannerLogService],
})
export class ScannerLogModule {}
