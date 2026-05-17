import { Table, Model, Column, DataType } from 'sequelize-typescript';
import { HasMany } from 'sequelize-typescript';
import { StudentShopProductModel } from './student-shop-product';
@Table({ tableName: 'shop_products', timestamps: true })
export class ShopProductModel extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  price_in_coins: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  quantity: number;
    
  @Column({ type: DataType.STRING, allowNull: true })
  photo: string;

  @Column({ type: DataType.STRING, allowNull: true })
  size: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @HasMany(() => StudentShopProductModel, 'product_id')
  studentPurchases: StudentShopProductModel[];
}