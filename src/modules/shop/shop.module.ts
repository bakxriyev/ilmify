import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ShopProductModel } from './entities/shop-product';
import { StudentShopProductModel } from './entities/student-shop-product';
import { StudentCoinsModel } from '../student-coins/entities/student-coin.entity';

@Module({
  imports: [SequelizeModule.forFeature([ShopProductModel, StudentShopProductModel, StudentCoinsModel])],
  providers: [ShopService],
  controllers: [ShopController],
})
export class ShopModule {}