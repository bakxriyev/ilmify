import {
  Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe, Req,
  UseInterceptors, UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TeacherAttendanceService } from './teacher-attendance.service';
import {
  UpdateTeacherAttendanceLocationDto,
  TeacherCheckInDto,
  TeacherCheckOutDto,
  AdminAttendanceQueryDto,
} from './dto';
import { multerOptions } from '../../config/multer.config';

@ApiTags('Teacher Attendance')
@Controller('teacher-attendance')
export class TeacherAttendanceController {
  constructor(private readonly service: TeacherAttendanceService) {}

  @Get('center-location')
  @ApiOperation({ summary: "O'quv markazi lokatsiyasini olish" })
  @ApiBearerAuth()
  async getCenterLocation(@Req() req?: any) {
    return this.service.getOrCreateLocation(req?.center_id);
  }

  @Patch('center-location')
  @ApiOperation({ summary: "O'quv markazi lokatsiyasini yangilash" })
  @ApiBearerAuth()
  async updateCenterLocation(
    @Body() dto: UpdateTeacherAttendanceLocationDto,
    @Req() req?: any,
  ) {
    return this.service.updateLocation(req?.center_id, dto);
  }

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "O'qituvchi check-in qilishi (selfie bilan)" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        selfie: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('selfie', multerOptions))
  async checkIn(
    @Body() dto: TeacherCheckInDto,
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: any,
  ) {
    const teacher_id = req?.user?.id || req?.teacher_id;
    const selfie = file ? file.filename : undefined;
    return this.service.checkIn(teacher_id, { latitude: dto.latitude, longitude: dto.longitude }, selfie);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "O'qituvchi check-out qilishi" })
  @ApiBearerAuth()
  async checkOut(
    @Body() dto: TeacherCheckOutDto,
    @Req() req?: any,
  ) {
    const teacher_id = req?.user?.id || req?.teacher_id;
    return this.service.checkOut(teacher_id, { latitude: dto.latitude, longitude: dto.longitude });
  }

  @Get('my-center-location')
  @ApiOperation({ summary: "O'qituvchi o'z markazi lokatsiyasini olish" })
  @ApiBearerAuth()
  async getMyCenterLocation(@Req() req?: any) {
    const teacher_id = req?.user?.id || req?.teacher_id;
    return this.service.getMyCenterLocation(teacher_id);
  }

  @Get('my-records')
  @ApiOperation({ summary: "O'qituvchi o'z davomat yozuvlarini olish" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiBearerAuth()
  async getMyRecords(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Req() req?: any,
  ) {
    const teacher_id = req?.user?.id || req?.teacher_id;
    return this.service.getMyRecords(teacher_id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      start_date,
      end_date,
    });
  }

  @Get('records')
  @ApiOperation({ summary: 'Admin: barcha davomat yozuvlari' })
  @ApiBearerAuth()
  async findAllRecords(
    @Query() query: AdminAttendanceQueryDto,
    @Req() req?: any,
  ) {
    return this.service.findAllRecords(req?.center_id, query);
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Admin: bitta davomat yozuvi' })
  @ApiBearerAuth()
  async findOneRecord(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneRecord(id);
  }
}
