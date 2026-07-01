import { IsString, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class RegisterAgentDto {
  @IsString()
  agent_id: string;

  @IsString()
  agent_token: string;

  @IsNumber()
  center_id: number;

  @IsOptional()
  @IsNumber()
  branch_id?: number;

  @IsOptional()
  @IsString()
  computer_name?: string;

  @IsOptional()
  @IsString()
  windows_user?: string;

  @IsOptional()
  @IsString()
  os_version?: string;

  @IsOptional()
  @IsString()
  cpu_info?: string;

  @IsOptional()
  @IsString()
  memory_info?: string;

  @IsOptional()
  @IsString()
  local_ip?: string;

  @IsOptional()
  @IsString()
  public_ip?: string;

  @IsOptional()
  @IsString()
  installed_printers?: string;

  @IsOptional()
  @IsString()
  agent_version?: string;
}

export class HeartbeatDto {
  @IsString()
  agent_id: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  cpu_usage?: number;

  @IsOptional()
  @IsNumber()
  memory_usage?: number;

  @IsOptional()
  @IsBoolean()
  paper_out?: boolean;

  @IsOptional()
  @IsBoolean()
  cover_open?: boolean;

  @IsOptional()
  @IsString()
  connected_printer?: string;

  @IsOptional()
  @IsObject()
  printer_status?: object;

  @IsOptional()
  @IsString()
  last_error?: string;

  @IsOptional()
  @IsNumber()
  queue_size?: number;
}

export class CreateJobDto {
  @IsNumber()
  agent_id: number;

  @IsOptional()
  @IsNumber()
  payment_id?: number;

  @IsOptional()
  @IsNumber()
  receipt_id?: number;

  @IsOptional()
  @IsString()
  receipt_number?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  payload?: string;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  connected_printer?: string;

  @IsOptional()
  @IsString()
  printer_model?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
