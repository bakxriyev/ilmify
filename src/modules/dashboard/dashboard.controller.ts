import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Asosiy statistika' })
  getStats(@Req() req?: any) {
    return this.service.getStats(req?.center_id);
  }

  @Get('student-growth')
  @ApiOperation({ summary: "O'quvchilar o'sishi" })
  getStudentGrowth(@Req() req?: any) {
    return this.service.getStudentGrowth(req?.center_id);
  }

  @Get('group-distribution')
  @ApiOperation({ summary: 'Guruhlar taqsimoti' })
  getGroupDistribution(@Req() req?: any) {
    return this.service.getGroupDistribution(req?.center_id);
  }

  @Get('top-teachers-by-groups')
  @ApiOperation({ summary: "Eng ko'p guruhi bor o'qituvchilar" })
  @ApiQuery({ name: 'limit', required: false })
  getTopTeachersByGroups(@Query('limit') limit?: string, @Req() req?: any) {
    return this.service.getTopTeachersByGroups(Number(limit) || 5, req?.center_id);
  }

  @Get('top-teachers-by-students')
  @ApiOperation({ summary: "Eng ko'p o'quvchisi bor o'qituvchilar" })
  @ApiQuery({ name: 'limit', required: false })
  getTopTeachersByStudents(@Query('limit') limit?: string, @Req() req?: any) {
    return this.service.getTopTeachersByStudents(Number(limit) || 5, req?.center_id);
  }

  @Get('best-attendance')
  @ApiOperation({ summary: "Eng yaxshi davomatli o'quvchilar" })
  @ApiQuery({ name: 'limit', required: false })
  getBestAttendance(@Query('limit') limit?: string, @Req() req?: any) {
    return this.service.getBestAttendanceStudents(Number(limit) || 10, req?.center_id);
  }

  @Get('monthly-attendance')
  @ApiOperation({ summary: 'Oylik davomat' })
  getMonthlyAttendance(@Req() req?: any) {
    return this.service.getMonthlyAttendance(req?.center_id);
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'So\'nggi harakatlar' })
  @ApiQuery({ name: 'limit', required: false })
  getRecentActivities(@Query('limit') limit?: string, @Req() req?: any) {
    return this.service.getRecentActivities(Number(limit) || 10, req?.center_id);
  }
}
