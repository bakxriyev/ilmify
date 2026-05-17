import { PartialType } from '@nestjs/mapped-types';
import { CreateUnitResultDto } from './create-unit_result.dto';

export class UpdateUnitResultDto extends PartialType(CreateUnitResultDto) {}
