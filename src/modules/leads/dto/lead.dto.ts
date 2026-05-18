import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '../entities/lead.entity';

export class CreateLeadDto {
  @ApiProperty() first_name: string;
  @ApiProperty() last_name: string;
  @ApiProperty() phone_number: string;
  @ApiPropertyOptional() comment?: string;
  @ApiPropertyOptional() source_id?: number;
  @ApiPropertyOptional() source_platform?: string;
}

export class CreatePublicLeadDto {
  @ApiProperty() first_name: string;
  @ApiProperty() last_name: string;
  @ApiProperty() phone_number: string;
  @ApiPropertyOptional() comment?: string;
  @ApiPropertyOptional() source_id?: number;
  @ApiPropertyOptional() source_platform?: string;
  @ApiPropertyOptional() center_id?: number;
  @ApiPropertyOptional() token?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional() status?: LeadStatus;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() callback_date?: string;
  @ApiPropertyOptional() contacted_at?: string;
}

export class RegisterTrialDto {
  @ApiProperty() group_id: number;
  @ApiPropertyOptional() student_password?: string;
}
