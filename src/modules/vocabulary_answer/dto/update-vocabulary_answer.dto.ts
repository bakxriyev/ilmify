import { PartialType } from '@nestjs/swagger';
import { CreateVocabularyAnswerDto } from './create-vocabulary_answer.dto';

export class UpdateVocabularyAnswerDto extends PartialType(CreateVocabularyAnswerDto) {}
