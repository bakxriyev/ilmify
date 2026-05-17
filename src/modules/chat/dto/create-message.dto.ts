import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { MessageType } from "../entities/chat-message.entity";

export class CreateMessageDto {
  @ApiProperty({ description: "Xabar matni" })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  message_type?: MessageType;
}

export class UploadFileDto {
  @ApiPropertyOptional({ description: "Xabar matni (ixtiyoriy)" })
  @IsOptional()
  @IsString()
  text?: string;
}

export class MarkReadDto {
  @ApiProperty({ description: "Oxirgi o'qilgan xabar ID" })
  @IsNumber()
  last_message_id: number;
}
