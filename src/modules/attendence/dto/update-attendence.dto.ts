import { IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  is_present?: boolean;
}