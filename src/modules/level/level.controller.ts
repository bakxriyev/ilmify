import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { LevelService } from './level.service';
import {
  CreateLevelDto,
  UpdateLevelDto,
  LevelQueryDto,
  LevelResponseDto,
  BulkCreateLevelDto,
} from './dto';
import { CreateUnitDto } from '../units/dto/unit.dto';

@ApiTags('levels')
@Controller('levels')
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi level yaratish' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Level yaratildi', type: LevelResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Level nomi allaqachon mavjud' })
  async create(@Body() createLevelDto: CreateLevelDto) {
    return this.levelService.create(createLevelDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bir nechta level yaratish' })
  async bulkCreate(@Body() bulkCreateDto: BulkCreateLevelDto) {
    return this.levelService.bulkCreate(bulkCreateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha levellarni olish (pagination va filter bilan)' })
  async findAll(@Query() query: LevelQueryDto) {
    return this.levelService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta levelni olish (unitlar soni bilan)' })
  @ApiParam({ name: 'id', type: Number, description: 'Level ID' })
  @ApiResponse({ status: 200, description: 'Level ma\'lumotlari', type: LevelResponseDto })
  @ApiResponse({ status: 404, description: 'Level topilmadi' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.levelService.findOne(id, true);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Levelni yangilash' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLevelDto: UpdateLevelDto,
  ) {
    return this.levelService.update(id, updateLevelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Levelni o\'chirish (agar unitlari bo\'lmasa)' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.levelService.remove(id);
  }

  @Get(':id/units')
  @ApiOperation({
    summary: 'Level ma\'lumotlari va uning unitlarini sahifalash bilan olish',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Level ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Sahifa raqami (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Har sahifadagi unitlar soni (default: 10)' })
  @ApiResponse({ status: 200, description: 'Level + unitlar + pagination' })
  @ApiResponse({ status: 404, description: 'Level topilmadi' })
  async getLevelWithUnits(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.levelService.getLevelWithUnits(id, page, limit);
  }

  @Post(':id/units')
  @ApiOperation({ summary: 'Ma\'lum levelga yangi unit qo\'shish' })
  @ApiParam({ name: 'id', type: Number, description: 'Level ID' })
  @ApiBody({ type: CreateUnitDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Unit muvaffaqiyatli qo\'shildi' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Level topilmadi' })
  async addUnitToLevel(
    @Param('id', ParseIntPipe) id: number,
    @Body() createUnitDto: CreateUnitDto,
  ) {
    return this.levelService.addUnitToLevel(id, createUnitDto);
  }
}