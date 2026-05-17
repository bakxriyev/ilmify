// dto/bulk-redo-tasks.dto.ts
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RedoTaskSubmissionDto } from './redo-task-submittion';

export class BulkRedoTasksDto {
  @ApiProperty({ 
    description: 'Array of task redos',
    type: [RedoTaskSubmissionDto]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RedoTaskSubmissionDto)
  redos: RedoTaskSubmissionDto[];
}
