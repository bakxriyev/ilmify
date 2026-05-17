import { ApiProperty } from '@nestjs/swagger';

class AttendanceItem {
  @ApiProperty({ example: 30 })
  student_id: number;

  @ApiProperty({ example: true })
  is_present: boolean;

  @ApiProperty({ required: false })
  reason?: string;
}

export class MarkLessonAttendanceDto {
  @ApiProperty({ example: 562 })
  lesson_id: number;

  @ApiProperty({ type: [AttendanceItem] })
  attendance: AttendanceItem[];
}