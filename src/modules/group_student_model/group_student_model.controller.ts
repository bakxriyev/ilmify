import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GroupStudentService } from './group_student_model.service';
import { CreateGroupStudentDto } from './dto';
import { UpdateGroupStudentDto } from './dto';
import { QueryGroupStudentDto } from './dto';
import {BulkAddStudentsDto} from './dto/bulk-add.dto'
@ApiTags('Group Students')
@Controller('group-students')
export class GroupStudentController {
  constructor(private readonly groupStudentService: GroupStudentService) {}

  @Post()
  @ApiOperation({ summary: 'Add student to group' })
  @ApiResponse({ status: 201, description: 'Student successfully added to group' })
  @ApiResponse({ status: 409, description: 'Student is already in this group' })
  create(@Body() createGroupStudentDto: CreateGroupStudentDto) {
    return this.groupStudentService.create(createGroupStudentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all group-student relations' })
  @ApiResponse({ status: 200, description: 'List of group-student relations' })
  findAll(@Query() queryDto: QueryGroupStudentDto) {
    return this.groupStudentService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group-student relation by ID' })
  @ApiResponse({ status: 200, description: 'Group-student relation found' })
  @ApiResponse({ status: 404, description: 'Group-student relation not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupStudentService.findOne(id);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get all students in a group' })
  @ApiResponse({ status: 200, description: 'List of students in the group' })
  findByGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupStudentService.findByGroupId(groupId);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get all groups of a student' })
  @ApiResponse({ status: 200, description: 'List of groups the student belongs to' })
  findByStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.groupStudentService.findByStudentId(studentId);
  }

  @Get('group/:groupId/stats')
  @ApiOperation({ summary: 'Get group statistics' })
  @ApiResponse({ status: 200, description: 'Group statistics' })
  getGroupStats(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupStudentService.getGroupStats(groupId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group-student relation' })
  @ApiResponse({ status: 200, description: 'Group-student relation updated' })
  @ApiResponse({ status: 404, description: 'Group-student relation not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupStudentDto: UpdateGroupStudentDto,
  ) {
    return this.groupStudentService.update(id, updateGroupStudentDto);
  }

  @Get('trial/all')
  @ApiOperation({ summary: 'Barcha probniy (trial) studentlarni olish' })
  findAllTrial() {
    return this.groupStudentService.findAllTrial();
  }

  @Patch(':id/confirm-trial')
  @ApiOperation({ summary: 'Probniy studentni to\'liq studentga aylantirish (is_trial=false)' })
  confirmTrial(@Param('id', ParseIntPipe) id: number) {
    return this.groupStudentService.confirmTrial(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove student from group by relation ID' })
  @ApiResponse({ status: 200, description: 'Student removed from group' })
  @ApiResponse({ status: 404, description: 'Group-student relation not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupStudentService.remove(id);
  }

  @Delete('group/:groupId/student/:studentId')
  @ApiOperation({ summary: 'Remove student from group by IDs' })
  @ApiResponse({ status: 200, description: 'Student removed from group' })
  @ApiResponse({ status: 404, description: 'Group-student relation not found' })
  removeByIds(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.groupStudentService.removeByGroupAndStudent(groupId, studentId);
  }
@Post('group/:groupId/bulk-add')
@ApiOperation({ summary: 'Add multiple students to a group' })
@ApiResponse({ status: 201, description: 'Students added to group' })
bulkAddStudents(
  @Param('groupId', ParseIntPipe) groupId: number,
  @Body() dto: BulkAddStudentsDto, 
) {
  return this.groupStudentService.bulkAddStudentsToGroup(
    groupId,
    dto.student_ids,
    dto.joined_date
  );
}



  @Delete('group/:groupId/bulk-remove')
  @ApiOperation({ summary: 'Remove multiple students from a group' })
  @ApiResponse({ status: 200, description: 'Students removed from group' })
  bulkRemoveStudents(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() body: { studentIds: number[] },
  ) {
    return this.groupStudentService.bulkRemoveStudentsFromGroup(groupId, body.studentIds);
  }
}