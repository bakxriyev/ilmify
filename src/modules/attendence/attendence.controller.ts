import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendence.service'
import { MarkLessonAttendanceDto } from './dto/mark-attendance.dto'

@ApiTags('Attendances')
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('lesson')
  markLesson(@Body() dto: MarkLessonAttendanceDto) {
    return this.service.markLessonAttendance(dto);
  }

  @Get('group')
  getGroupAttendance(
    @Query('group_id') group_id: string,
    @Query('date') date: string,
  ) {
    return this.service.getGroupAttendance(Number(group_id), date);
  }

  @Get('stats')
  stats(
    @Query('group_id') group_id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.monthlyStats(
      Number(group_id),
      Number(year),
      Number(month),
    );
  }
}