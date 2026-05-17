import { ApiProperty } from '@nestjs/swagger';
import { CreateLevelDto } from './create-level.dto';

export class BulkCreateLevelDto {
  @ApiProperty({ type: [CreateLevelDto] })
  levels: CreateLevelDto[];
}