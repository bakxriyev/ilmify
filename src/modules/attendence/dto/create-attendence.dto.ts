import { ApiProperty } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiProperty({ example: 21 })
  group_id: number;

  @ApiProperty({ example: 30 })
  student_id: number;

  @ApiProperty({ example: 562 })
  lesson_id: number;

  @ApiProperty({ example: true })
  is_present: boolean;

  @ApiProperty({ example: 'Sick', required: false })
  reason?: string;
}