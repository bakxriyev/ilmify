import { PartialType } from '@nestjs/swagger';
import { CreateTasksAnswerDto } from './create-tasks_answer.dto';

export class UpdateTasksAnswerDto extends PartialType(CreateTasksAnswerDto) {}
