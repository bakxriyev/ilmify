import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template nomi (ichki)', example: "To'lov eslatmasi" })
  name: string;

  @ApiProperty({ description: 'Sarlavha', example: "Hurmatli o'quvchi!" })
  title: string;

  @ApiPropertyOptional({ description: 'Matn', example: "To'lov muddati yaqinlashmoqda..." })
  description?: string;

  @ApiPropertyOptional({ description: 'Kategoriya', example: 'payment', enum: ['payment', 'holiday', 'event', 'other'] })
  category?: string;

  @ApiPropertyOptional({ description: 'Markaz ID' })
  center_id?: number;
}
