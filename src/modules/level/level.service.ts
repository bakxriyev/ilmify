import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { LevelModel } from './model/level.entity';
import { UnitModel } from '../units/model/unit.entity';
import {
  CreateLevelDto,
  UpdateLevelDto,
  LevelQueryDto,
  BulkCreateLevelDto,
} from './dto';
import { CreateUnitDto } from '../units/dto/unit.dto';

@Injectable()
export class LevelService {
  constructor(
    @InjectModel(LevelModel) private levelModel: typeof LevelModel,
    @InjectModel(UnitModel) private unitModel: typeof UnitModel,
  ) {}

  async create(createDto: CreateLevelDto) {
    // name bo‘yicha unikallikni tekshirish
    const existingLevel = await this.levelModel.findOne({
      where: { name: createDto.name.trim() },
    });
    if (existingLevel) {
      throw new ConflictException('Bu nom bilan level allaqachon mavjud');
    }

    const level = await this.levelModel.create({ ...createDto });
    return this.findOne(level.id);
  }

  async bulkCreate(bulkCreateDto: BulkCreateLevelDto) {
    const createdLevels = [];
    const errors = [];

    for (let i = 0; i < bulkCreateDto.levels.length; i++) {
      try {
        const level = await this.create(bulkCreateDto.levels[i]);
        createdLevels.push(level);
      } catch (error) {
        errors.push({
          index: i,
          level: bulkCreateDto.levels[i],
          error: error.message || 'Noma\'lum xato',
        });
      }
    }

    return {
      success_count: createdLevels.length,
      error_count: errors.length,
      created_levels: createdLevels,
      errors,
    };
  }

  async findAll(queryDto: LevelQueryDto) {
    const {
      page = 1,
      limit = 10,
      sort_by = 'name',
      sort_order = 'ASC',
      name,
      description,
    } = queryDto;

    const offset = (page - 1) * limit;

    const whereClause: any = {};

    if (name) {
      whereClause.name = { [Op.iLike]: `%${name}%` };
    }
    if (description) {
      whereClause.description = { [Op.iLike]: `%${description}%` };
    }

    const { count, rows } = await this.levelModel.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [[sort_by, sort_order]],
      distinct: true,
    });

    const levelsWithCounts = await Promise.all(
      rows.map(async (level) => {
        const unitsCount = await this.unitModel.count({ where: { level_id: level.id } });
        return {
          ...level.toJSON(),
          units_count: unitsCount,
        };
      }),
    );

    return {
      data: levelsWithCounts,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  async findOne(id: number, includeRelations: boolean = true) {
    const includeOptions = includeRelations
      ? [
          {
            model: UnitModel,
            required: false,
            attributes: ['id', 'title', 'description', 'unit_number'],
          },
        ]
      : [];

    const level = await this.levelModel.findByPk(id, { include: includeOptions });

    if (!level) {
      throw new NotFoundException('Level topilmadi');
    }

    const unitsCount = await this.unitModel.count({ where: { level_id: id } });

    return {
      ...level.toJSON(),
      units_count: unitsCount,
    };
  }

  async update(id: number, updateDto: UpdateLevelDto) {
    const level = await this.levelModel.findByPk(id);

    if (!level) {
      throw new NotFoundException('Level topilmadi');
    }

    if (updateDto.name && updateDto.name.trim() !== level.name) {
      const existing = await this.levelModel.findOne({
        where: {
          name: updateDto.name.trim(),
          id: { [Op.ne]: id },
        },
      });

      if (existing) {
        throw new ConflictException('Bu nom bilan boshqa level mavjud');
      }
    }

    await level.update(updateDto);
    return this.findOne(id, false);
  }

  async remove(id: number) {
    const level = await this.findOne(id, false);

    const unitsCount = await this.unitModel.count({ where: { level_id: id } });

    if (unitsCount > 0) {
      throw new ConflictException(`Level o'chirib bo'lmaydi. Bog'langan: ${unitsCount} unit`);
    }

    await level.destroy();

    return { message: 'Level muvaffaqiyatli o\'chirildi', id };
  }

  async getLevelWithUnits(id: number, page: number = 1, limit: number = 10) {
    const level = await this.levelModel.findByPk(id);

    if (!level) {
      throw new NotFoundException(`Level ID ${id} topilmadi`);
    }

    const offset = (page - 1) * limit;

    const { count: totalUnits, rows: units } = await this.unitModel.findAndCountAll({
      where: { level_id: id },
      attributes: ['id', 'unit_number', 'title', 'description'],
      limit,
      offset,
      order: [['id', 'ASC']],
      distinct: true,
    });

    return {
      level: {
        id: level.id,
        name: level.name,
        description: level.description || null,
        units_count: totalUnits,
      },
      units: units.map((u) => u.toJSON()),
      pagination: {
        total: totalUnits,
        page,
        limit,
        total_pages: Math.ceil(totalUnits / limit),
      },
    };
  }

  async addUnitToLevel(levelId: number, createUnitDto: CreateUnitDto): Promise<UnitModel> {
    const level = await this.levelModel.findByPk(levelId);
    if (!level) {
      throw new NotFoundException(`Level ID ${levelId} topilmadi`);
    }

    const newUnit = await this.unitModel.create({
      ...createUnitDto,
      level_id: levelId,
    });

    return newUnit;
  }
}