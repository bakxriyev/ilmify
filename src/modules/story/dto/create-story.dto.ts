// src/modules/story/dto/create-story.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  media_url?: string; 
}