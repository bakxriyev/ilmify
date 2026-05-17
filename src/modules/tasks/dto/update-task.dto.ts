// src/modules/tasks/dto/update-task.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional, IsString, IsNumber, IsBoolean, IsJSON } from 'class-validator';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsString()
  delete_photo?: string;

  @IsOptional()
  @IsString()
  delete_audio?: string;

  @IsOptional()
  @IsString()
  delete_video?: string;

  @IsOptional()
  @IsString()
  delete_media?: string;
}