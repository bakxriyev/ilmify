import { ApiProperty } from '@nestjs/swagger';

class UnitDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  title: string;
  @ApiProperty()
  description?: string;
  @ApiProperty()
  unit_number?: number;
}

export class LevelResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [UnitDto], required: false })
  units?: UnitDto[];

  @ApiProperty({ example: 5 })
  units_count?: number;
}