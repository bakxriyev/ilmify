import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    example: 'Hoodie Black',
  })
  name: string;

  @ApiProperty({
    example: 120,
  })
  price_in_coins: number;

  @ApiProperty({
    example: 10,
  })
  quantity: number;

  @ApiPropertyOptional({
    example: 'L',
  })
  size?: string;

  @ApiPropertyOptional({
    example: 'Premium hoodie',
  })
  description?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  photo: any;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  price_in_coins?: number;

  @ApiPropertyOptional()
  quantity?: number;

  @ApiPropertyOptional()
  size?: string;

  @ApiPropertyOptional()
  description?: string;
}

export class PurchaseProductDto {
  @ApiProperty()
  student_id: number;

  @ApiProperty()
  product_id: number;

  @ApiProperty()
  quantity: number;
}