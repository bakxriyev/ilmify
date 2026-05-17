import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { shopMulterConfig } from './multer-shop.config';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CreateProductDto, UpdateProductDto, PurchaseProductDto } from './dto/create-shop.dto';

@ApiTags('Shop')
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('product')
  @ApiOperation({ summary: 'Create product with photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateProductDto,
  })
  @UseInterceptors(FileInterceptor('photo', shopMulterConfig))
  createProduct(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateProductDto,
  ) {
    return this.shopService.createProduct(dto, file?.filename);
  }

  @Patch('product/:id')
  updateProduct(
    @Param('id') id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.shopService.updateProduct(id, dto);
  }

  @Get('product')
  getAllProducts() {
    return this.shopService.getAllProducts();
  }

  @Get('product/:id')
  getProductById(@Param('id') id: number) {
    return this.shopService.getProductById(id);
  }

  @Delete('product/:id')
  deleteProduct(@Param('id') id: number) {
    return this.shopService.deleteProduct(id);
  }

  @Post('purchase')
  purchaseProduct(@Body() dto: PurchaseProductDto) {
    return this.shopService.purchaseProduct(
      dto.student_id,
      dto.product_id,
      dto.quantity,
    );
  }

  @Get('student/:studentId')
  getStudentProducts(@Param('studentId') studentId: number) {
    return this.shopService.getStudentProducts(studentId);
  }
}