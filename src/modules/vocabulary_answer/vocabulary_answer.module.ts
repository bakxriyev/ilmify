import { Module } from '@nestjs/common';
import { VocabularyAnswerService } from './vocabulary_answer.service';
import { VocabularyAnswerController } from './vocabulary_answer.controller';

@Module({
  controllers: [VocabularyAnswerController],
  providers: [VocabularyAnswerService],
})
export class VocabularyAnswerModule {}
