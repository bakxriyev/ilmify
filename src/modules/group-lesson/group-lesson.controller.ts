import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { GroupLessonService } from './group-lesson.service';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { CreateGroupLessonDto } from './dto/create-group-lesson.dto';

@ApiTags('Group Lessons')
@Controller('lessons')
export class GroupLessonController {
  constructor(private readonly lessonService: GroupLessonService) {}

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Guruhdagi barcha darslar (unit bilan)' })
  async getGroupLessons(
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.lessonService.findAllByGroup(groupId);
  }

  @Post()
  @ApiOperation({ summary: 'Lesson yaratish' })
  async createLesson(
    @Body()
    body: CreateGroupLessonDto,
  ) {
    return this.lessonService.createLesson(
      body.group_id,
      body.unit_id,
      new Date(body.date),
      body.time,
      body.parity,
      body.room_id,
      body.start_time,
      body.end_time,
    );
  }

  // single attach
  @Patch(':lessonId/unit')
  @ApiOperation({ summary: 'Lesson ga unit biriktirish' })
  async attachUnit(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() body: { unit_id: number },
  ) {
    return this.lessonService.attachUnitToLesson(
      lessonId,
      body.unit_id,
    );
  }

  // bulk attach
  @Post('bulk-attach-units')
  @ApiOperation({ summary: 'Bir nechta lessonlarga unit biriktirish' })
  async bulkAttachUnits(
    @Body()
    body: { lesson_id: number; unit_id: number }[],
  ) {
    return this.lessonService.bulkAttachUnits(body);
  }

  // YANGI endpoint
  @Post('auto-assign-units-by-level')
  @ApiOperation({
    summary:
      'Level ichidagi unitlarni avtomatik ravishda dars kunlariga taqsimlash',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        group_id: { type: 'number', example: 21 },
        level_id: { type: 'number', example: 2 },
      },
    },
  })
  async autoAssignUnits(
    @Body()
    body: {
      group_id: number;
      level_id: number;
    },
  ) {
    return this.lessonService.autoAssignUnitsByLevel(
      body.group_id,
      body.level_id,
    );
  }

  @Delete(':lessonId')
  async deleteLesson(
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ) {
    return this.lessonService.removeLesson(lessonId);
  }

  @Delete('group/:groupId')
  @ApiOperation({ summary: 'Guruhdagi barcha darslarni o\'chirish' })
  async deleteAllGroupLessons(
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.lessonService.removeAllByGroup(groupId);
  }
}
