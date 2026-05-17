import { Table, Model, Column, DataType, BelongsTo } from 'sequelize-typescript';
import { ShopProductModel } from './shop-product';

@Table({ tableName: 'student_shop_products', timestamps: true })
export class StudentShopProductModel extends Model {
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @Column({ type: DataType.BIGINT, allowNull: false })
  product_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  quantity: number;

  @BelongsTo(() => ShopProductModel, 'product_id')
  product: ShopProductModel;
}