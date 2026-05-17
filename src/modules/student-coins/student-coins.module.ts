import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StudentCoinsModel } from './entities/student-coin.entity';
import { TeacherCoinLogModel } from './entities/teacher-coin-log.entity';
import { TaskCoinLogModel } from './entities/task-coin-log.entity';
import { StudentCoinsController } from './student-coins.controller';
import { StudentCoinsService } from './student-coins.service';
@Module({
  imports: [
    SequelizeModule.forFeature([
      StudentCoinsModel,
      TeacherCoinLogModel,
      TaskCoinLogModel,
    ]),
  ],
  controllers: [StudentCoinsController],
  providers: [StudentCoinsService],
  exports: [StudentCoinsService], // boshqa moduldan chaqirish uchun
})
export class CoinsModule {}