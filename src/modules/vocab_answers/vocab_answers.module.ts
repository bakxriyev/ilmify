// src/modules/vocab_answers/vocab-answer.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StudentModel } from '../students/model/student.entity';
import { UnitModel } from '../units/model';
import { VocabAnswerModel } from './model';
import { VocabAnswersController } from './vocab_answers.controller';
import { VocabAnswersService } from './vocab_answers.service';
import { VocabModel } from '../vocabulary';

@Module({
  imports: [
    SequelizeModule.forFeature([VocabAnswerModel]),
  ],
  controllers: [VocabAnswersController],
  providers: [VocabAnswersService],
  exports: [VocabAnswersService], 
})
export class VocabAnswerModule {}