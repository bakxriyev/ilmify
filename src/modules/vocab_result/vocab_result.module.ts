import { Module } from '@nestjs/common';
import { VocabResultService } from './vocab_result.service';
import { VocabResultController } from './vocab_result.controller';

@Module({
  controllers: [VocabResultController],
  providers: [VocabResultService],
})
export class VocabResultModule {}
