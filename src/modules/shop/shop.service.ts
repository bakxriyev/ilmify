import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ShopProductModel } from './entities/shop-product';
import { StudentShopProductModel } from './entities/student-shop-product';
import { StudentCoinsModel } from '../student-coins/entities/student-coin.entity';
import { Op } from 'sequelize';
import { CreateProductDto } from './dto/create-shop.dto';

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(ShopProductModel) private productRepo: typeof ShopProductModel,
    @InjectModel(StudentShopProductModel) private studentProductRepo: typeof StudentShopProductModel,
    @InjectModel(StudentCoinsModel) private studentCoinsRepo: typeof StudentCoinsModel,
  ) {}

  async createProduct(dto: CreateProductDto, photo: string) {
  return this.productRepo.create({
    name: dto.name,
    price_in_coins: dto.price_in_coins,
    quantity: dto.quantity,
    size: dto.size,
    description: dto.description,
    photo,
  });
}

  async updateProduct(id: number, dto: any) {
    const product = await this.productRepo.findByPk(id);
    if (!product) throw new NotFoundException('Product topilmadi');

    await product.update(dto);
    return product;
  }

  async getAllProducts() {
    return this.productRepo.findAll({
      order: [['id', 'ASC']],
    });
  }

  async getProductById(id: number) {
    const product = await this.productRepo.findByPk(id);
    if (!product) throw new NotFoundException('Product topilmadi');
    return product;
  }

  async deleteProduct(id: number) {
    const product = await this.productRepo.findByPk(id);
    if (!product) throw new NotFoundException('Product topilmadi');

    await product.destroy();
    return { message: 'Product o‘chirildi' };
  }

  async purchaseProduct(studentId: number, productId: number, quantity: number) {
    const product = await this.productRepo.findByPk(productId);
    if (!product) throw new NotFoundException('Product topilmadi');

    if (product.quantity < quantity)
      throw new BadRequestException('Mavjud miqdor yetarli emas');

    const wallet = await this.studentCoinsRepo.findOne({
      where: { student_id: studentId },
    });

    if (!wallet || wallet.coins < product.price_in_coins * quantity)
      throw new BadRequestException('Coin yetarli emas');

    await wallet.update({
      coins: wallet.coins - product.price_in_coins * quantity,
    });

    await product.update({
      quantity: product.quantity - quantity,
    });

    const existing = await this.studentProductRepo.findOne({
      where: { student_id: studentId, product_id: productId },
    });

    if (existing) {
      await existing.update({
        quantity: existing.quantity + quantity,
      });
    } else {
      await this.studentProductRepo.create({
        student_id: studentId,
        product_id: productId,
        quantity,
      });
    }

    return { message: 'Product muvaffaqiyatli sotib olindi' };
  }

  async getStudentProducts(studentId: number) {
    return this.studentProductRepo.findAll({
      where: { student_id: studentId },
      include: [{ model: ShopProductModel, as: 'product' }],
    });
  }

  async getAffordableProducts(studentId: number) {
    const wallet = await this.studentCoinsRepo.findOne({
      where: { student_id: studentId },
    });

    if (!wallet) throw new NotFoundException('Student wallet topilmadi');

    return this.productRepo.findAll({
      where: {
        quantity: { [Op.gt]: 0 },
        price_in_coins: { [Op.lte]: wallet.coins },
      },
    });
  }
}