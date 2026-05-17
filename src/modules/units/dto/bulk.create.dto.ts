import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateUnitDto } from './unit.dto';

export class BulkCreateUnitDto {
  @ApiProperty({ description: 'Unitlar ro\'yxati', type: [CreateUnitDto] })
  @IsNotEmpty()
  units: CreateUnitDto[];
}