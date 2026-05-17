// src/modules/levels/levels.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LevelController } from './level.controller';
import { LevelService } from './level.service';
import { LevelModel } from './model/level.entity';
import { UnitModel } from '../units/model'; 
import { UnitModule } from '../units';

@Module({
  imports: [
    SequelizeModule.forFeature([LevelModel, UnitModel])],
  controllers: [LevelController],
  providers: [LevelService],
  exports: [LevelService], 
})
export class LevelModule {}