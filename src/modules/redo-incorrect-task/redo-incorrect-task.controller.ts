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
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { RedoIncorrectTaskService } from './redo-incorrect-task.service';
import { CreateRedoIncorrectTaskDto } from './dto/create-redo-incorrect-task.dto';
import { UpdateRedoIncorrectTaskDto } from './dto/update-redo-incorrect-task.dto';
import { QueryRedoIncorrectTaskDto } from './dto/query-redo';
import { RedoTaskSubmissionDto } from './dto/redo-task-submittion';
import { BulkRedoTasksDto } from './dto/bulk-redo';

@ApiTags('Redo Incorrect Tasks')
@Controller('redo-incorrect-tasks')
@ApiBearerAuth()
export class RedoIncorrectTaskController {
  constructor(private readonly redoIncorrectTaskService: RedoIncorrectTaskService) {}

  @Get()
  @ApiOperation({ summary: 'Get all redo incorrect task records' })
  @ApiResponse({ status: 200, description: 'List of redo task records' })
  findAll(@Query() queryDto: QueryRedoIncorrectTaskDto) {
    return this.redoIncorrectTaskService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get redo incorrect task record by ID' })
  @ApiResponse({ status: 200, description: 'Redo task record found' })
  @ApiResponse({ status: 404, description: 'Redo task record not found' })
  @ApiParam({ name: 'id', description: 'Redo task record ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('include') include?: string,
  ) {
    return this.redoIncorrectTaskService.findOne(id, include);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get all redo tasks by student' })
  @ApiResponse({ status: 200, description: 'List of student redo tasks' })
  findByStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.redoIncorrectTaskService.findByStudent(studentId);
  }

  @Get('exercise/:exerciseId')
  @ApiOperation({ summary: 'Get all redo tasks by exercise' })
  @ApiResponse({ status: 200, description: 'List of exercise redo tasks' })
  findByExercise(@Param('exerciseId', ParseIntPipe) exerciseId: number) {
    return this.redoIncorrectTaskService.findByExercise(exerciseId);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get all redo attempts for a specific task' })
  @ApiResponse({ status: 200, description: 'List of task redo attempts' })
  findByTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.redoIncorrectTaskService.findByTask(taskId);
  }

  @Get('student/:studentId/stats')
  @ApiOperation({ summary: 'Get student redo statistics' })
  @ApiResponse({ status: 200, description: 'Student redo statistics' })
  getStudentStats(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.redoIncorrectTaskService.getStudentRedoStats(studentId);
  }

  @Get('exercise/:exerciseId/stats')
  @ApiOperation({ summary: 'Get exercise redo statistics' })
  @ApiResponse({ status: 200, description: 'Exercise redo statistics' })
  getExerciseStats(@Param('exerciseId', ParseIntPipe) exerciseId: number) {
    return this.redoIncorrectTaskService.getExerciseRedoStats(exerciseId);
  }



  @Delete(':id')
  @ApiOperation({ summary: 'Delete redo incorrect task record' })
  @ApiResponse({ status: 200, description: 'Redo task record deleted successfully' })
  @ApiResponse({ status: 404, description: 'Redo task record not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.redoIncorrectTaskService.remove(id);
  }
}