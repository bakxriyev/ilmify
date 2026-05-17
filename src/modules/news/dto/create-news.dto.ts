import { ApiProperty } from '@nestjs/swagger';

export class CreateNewsDto {
  @ApiProperty({ example: 'Breaking News', description: 'News title' })
  title: string;

  @ApiProperty({ example: 'News description here...', description: 'News description', required: false })
  description?: string;

  @ApiProperty({ example: '2026-02-23', description: 'Optional news date', required: false })
  news_date?: Date;

   @ApiProperty({ example: 'Media', description: 'News description' })
  media_url:string;
}