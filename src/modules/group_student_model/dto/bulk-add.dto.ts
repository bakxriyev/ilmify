import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsNumber, IsString } from 'class-validator';

export class BulkAddStudentsDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Array of student IDs',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  student_ids: number[];

   @ApiProperty({
    example: "2026-02-17",
    description: 'Data',
  })
  @IsString()
  joined_date: string;
}
