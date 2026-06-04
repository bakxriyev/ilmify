import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsArray, IsOptional, IsString, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class AttendanceItem {
  @ApiProperty({ example: 30 })
  @IsNumber()
  student_id: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  is_present: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class MarkLessonAttendanceDto {
  @ApiProperty({ example: 562 })
  @IsNumber()
  lesson_id: number;

  @ApiProperty({ type: [AttendanceItem] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItem)
  attendance: AttendanceItem[];
}