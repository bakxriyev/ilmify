import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Notebook', description: 'Product nomi' })
  name: string;

  @ApiProperty({ example: 50, description: 'Coinlarda narxi' })
  price_in_coins: number;

  @ApiProperty({ example: 10, description: 'Mavjud miqdori' })
  quantity: number;

  @ApiProperty({ example: 'L', description: 'O‘lchami', required: false })
  size?: string;

  @ApiProperty({ example: 'Notebook for school', description: 'Tavsifi', required: false })
  description?: string;
}

export class UpdateProductDto {
  @ApiProperty({ example: 'Notebook Updated', description: 'Product nomi', required: false })
  name?: string;

  @ApiProperty({ example: 60, description: 'Coinlarda narxi', required: false })
  price_in_coins?: number;

  @ApiProperty({ example: 15, description: 'Mavjud miqdori', required: false })
  quantity?: number;

  @ApiProperty({ example: 'XL', description: 'O‘lchami', required: false })
  size?: string;

  @ApiProperty({ example: 'Updated notebook', description: 'Tavsifi', required: false })
  description?: string;
}

export class PurchaseProductDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  product_id: number;

  @ApiProperty({ example: 2, description: 'Nechta olish' })
  quantity: number;
}