import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TasksAnswerService } from './tasks_answer.service';
import { CreateTasksAnswerDto } from './dto/create-tasks_answer.dto';
import { UpdateTasksAnswerDto } from './dto/update-tasks_answer.dto';

@Controller('tasks-answer')
export class TasksAnswerController {
  constructor(private readonly tasksAnswerService: TasksAnswerService) {}

  @Post()
  create(@Body() createTasksAnswerDto: CreateTasksAnswerDto) {
    return this.tasksAnswerService.create(createTasksAnswerDto);
  }

  @Get()
  findAll() {
    return this.tasksAnswerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksAnswerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTasksAnswerDto: UpdateTasksAnswerDto) {
    return this.tasksAnswerService.update(+id, updateTasksAnswerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksAnswerService.remove(+id);
  }
}
