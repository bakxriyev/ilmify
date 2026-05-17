import { PartialType } from '@nestjs/mapped-types';
import { CreateVocabAnswerDto } from './create-vocab_answer.dto';

export class UpdateVocabAnswerDto extends PartialType(CreateVocabAnswerDto) {}
