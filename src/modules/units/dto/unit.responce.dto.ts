import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';


export class UnitResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description?: string;

   @ApiProperty()
  level_id?: number;

  @ApiProperty({ required: false })
  exercises?: any[];

  @ApiProperty({ required: false })
  vocabs?: any[];

  @ApiProperty({ required: false })
  student_answers?: any[];

  @ApiProperty({ required: false })
  exercise_results?: any[];

  @ApiProperty({ required: false })
  unit_results?: any[];

  @ApiProperty({ required: false })
  vocab_results?: any[];

  @ApiProperty({ required: false })
  exercises_count?: number;

  @ApiProperty({ required: false })
  vocabs_count?: number;

  @ApiProperty({ required: false })
  students_count?: number;
}
