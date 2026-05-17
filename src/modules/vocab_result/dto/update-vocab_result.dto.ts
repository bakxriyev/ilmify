import { PartialType } from '@nestjs/mapped-types';
import { CreateVocabResultDto } from './create-vocab_result.dto';

export class UpdateVocabResultDto extends PartialType(CreateVocabResultDto) {}
