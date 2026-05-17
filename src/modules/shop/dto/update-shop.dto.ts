import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-shop.dto';

export class UpdateShopDto extends PartialType(CreateProductDto) {}
