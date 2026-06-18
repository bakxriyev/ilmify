import { Controller, Post, Body, Get, Query, Param, ParseIntPipe, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
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

  @Get('group/:groupId/monthly')
  monthlyGrid(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.monthlyGrid(groupId, Number(year), Number(month));
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

  @Delete('by-center/:centerId')
  @ApiOperation({ summary: 'Markazdagi barcha davomatlarni tozalash' })
  @ApiParam({ name: 'centerId', type: Number })
  @ApiQuery({ name: 'group_id', required: false, type: Number, description: 'Agar berilsa, faqat shu guruhdagi davomatlar tozalanadi' })
  clearByCenter(
    @Param('centerId', ParseIntPipe) centerId: number,
    @Query('group_id') groupId?: string,
  ) {
    return this.service.clearAttendances(centerId, groupId ? Number(groupId) : undefined);
  }
}