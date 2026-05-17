// dto/redo-task-submission.dto.ts
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedoTaskSubmissionDto {
  @ApiProperty({ description: 'Old answer ID (incorrect answer)', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  old_answer_id: number;

  @ApiProperty({ description: 'New answer text', example: 'The corrected answer' })
  @IsString()
  @IsNotEmpty()
  new_answer_text: string;
}