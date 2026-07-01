import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { ExpenseModel } from './entities/expense.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../../services/cache.module';

@Module({
  imports: [
    SequelizeModule.forFeature([ExpenseModel, EducationCenterModel]),
    AuditModule,
    CacheModule,
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
