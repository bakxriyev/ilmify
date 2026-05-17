import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ExerciseService } from './exercises.service';
import { CreateExerciseDto, UpdateExerciseDto, ExerciseQueryDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Exercises')
@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi mashq yaratish' })
  @ApiResponse({ status: 201, description: 'Mashq yaratildi' })
  @ApiResponse({ status: 404, description: 'Unit topilmadi' })
  async create(@Body(new ValidationPipe({ transform: true })) dto: CreateExerciseDto) {
    return this.exerciseService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha mashqlar (pagination, filter, sort bilan)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sort_by', required: false })
  @ApiQuery({ name: 'sort_order', enum: ['ASC', 'DESC'], required: false })
  @ApiQuery({ name: 'include_relations', required: false })
  @ApiQuery({ name: 'unit_id', required: false })
  @ApiQuery({ name: 'type', enum: ['reading', 'gap_fill', 'speaking', 'writing', 'listening', 'test', 'vocabulary', 'grammar'], required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Mashqlar ro‘yxati' })
  async findAll(@Query(new ValidationPipe({ transform: true })) query: ExerciseQueryDto) {
    return this.exerciseService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta mashqni olish' })
  @ApiQuery({ name: 'withRelations', required: false })
  @ApiResponse({ status: 200, description: 'Mashq topildi' })
  @ApiResponse({ status: 404, description: 'Mashq topilmadi' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('withRelations') withRelations?: string,
  ) {
    return this.exerciseService.findOne(id, withRelations === 'true');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mashqni yangilash' })
  @ApiResponse({ status: 200, description: 'Mashq yangilandi' })
  @ApiResponse({ status: 404, description: 'Mashq topilmadi' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true })) dto: UpdateExerciseDto,
  ) {
    return this.exerciseService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Mashqni o‘chirish' })
  @ApiResponse({ status: 200, description: 'Mashq o‘chirildi' })
  @ApiResponse({ status: 404, description: 'Mashq topilmadi' })
  @ApiResponse({ status: 409, description: 'Bog‘langan ma‘lumotlar mavjud' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.exerciseService.delete(id);
  }

  @Get('unit/:unitId')
  @ApiOperation({ summary: 'Unit bo‘yicha mashqlar ro‘yxati' })
  @ApiResponse({ status: 200, description: 'Mashqlar topildi' })
  @ApiResponse({ status: 404, description: 'Unit topilmadi' })
  async getByUnit(@Param('unitId', ParseIntPipe) unitId: number) {
    return this.exerciseService.getExercisesByUnit(unitId);
  }
}