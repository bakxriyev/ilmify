import { ApiProperty } from '@nestjs/swagger';

export class GetGroupAttendanceDto {
  @ApiProperty({ example: 21 })
  group_id: number;

  @ApiProperty({ example: '2026-02-18' })
  date: string;
}