import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class SendSmsDto {
  @ApiProperty({ description: 'Telefon raqam (+998901234567)' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'SMS matni' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: "Jo'natuvchi nomi" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Markaz ID' })
  @IsOptional()
  @IsNumber()
  center_id?: number;

  @ApiPropertyOptional({ description: 'Kim yuborgan (admin ID)' })
  @IsOptional()
  @IsNumber()
  created_by?: number;
}

export class SendBulkSmsDto {
  @ApiProperty({ description: 'SMS xabarlar ro\'yxati', type: [Object], example: [{ phone: '+998901234567', message: 'Salom', from: '4546' }] })
  messages: Array<{ phone: string; message: string; from?: string }>;

  @ApiPropertyOptional({ description: 'Markaz ID' })
  @IsOptional()
  @IsNumber()
  center_id?: number;

  @ApiPropertyOptional({ description: 'Kim yuborgan' })
  @IsOptional()
  @IsNumber()
  created_by?: number;
}

export class SendOtpDto {
  @ApiProperty({ description: 'Telefon raqam' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Markaz ID' })
  @IsOptional()
  @IsNumber()
  center_id?: number;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'Telefon raqam' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Tasdiqlash kodi (6 raqam)' })
  @IsString()
  code: string;
}

export class SmsReportQueryDto {
  @ApiPropertyOptional({ description: 'Boshlanish sana (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'Tugash sana (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Holat' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Sahifa' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Limit' })
  @IsOptional()
  limit?: number;
}

export class CreateSmsTemplateDto {
  @ApiProperty({ description: 'Kategoriya' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Shablon sarlavhasi' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Shablon matni' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'O\'zgaruvchilar ro\'yxati' })
  @IsOptional()
  variables?: string[];

  @ApiPropertyOptional({ description: 'Markaz ID' })
  @IsOptional()
  @IsNumber()
  center_id?: number;
}

export class UpdateSmsTemplateDto {
  @ApiPropertyOptional({ description: 'Kategoriya' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Shablon sarlavhasi' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Shablon matni' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'O\'zgaruvchilar ro\'yxati' })
  @IsOptional()
  variables?: string[];
}

export class TestEskizConnectionDto {
  @ApiProperty({ description: 'Eskiz email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Eskiz password' })
  @IsString()
  password: string;
}
