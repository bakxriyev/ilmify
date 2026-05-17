// src/modules/notification/dto/create-notification.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ required: false, description: 'Bitta user uchun' })
  userId?: number;

  @ApiProperty({ required: false, description: 'Rolega yuborish' })
  role?: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  link?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  image?: any;
}