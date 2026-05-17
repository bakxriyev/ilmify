import { Injectable } from '@nestjs/common';
import { CreateTasksAnswerDto } from './dto/create-tasks_answer.dto';
import { UpdateTasksAnswerDto } from './dto/update-tasks_answer.dto';

@Injectable()
export class TasksAnswerService {
  create(createTasksAnswerDto: CreateTasksAnswerDto) {
    return 'This action adds a new tasksAnswer';
  }

  findAll() {
    return `This action returns all tasksAnswer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tasksAnswer`;
  }

  update(id: number, updateTasksAnswerDto: UpdateTasksAnswerDto) {
    return `This action updates a #${id} tasksAnswer`;
  }

  remove(id: number) {
    return `This action removes a #${id} tasksAnswer`;
  }
}
