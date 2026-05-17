// src/modules/notification/dto/update-notification.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  link?: string;

  @ApiProperty({ required: false })
  is_read?: boolean;
}