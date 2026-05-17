// dto/update-redo-incorrect-task.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateRedoIncorrectTaskDto } from './create-redo-incorrect-task.dto';

export class UpdateRedoIncorrectTaskDto extends PartialType(CreateRedoIncorrectTaskDto) {}
