// unit.controller.ts
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
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UnitService } from './units.service';
import { 
  CreateUnitDto, 
  UpdateUnitDto, 
  UnitQueryDto,
  UnitResponseDto,
  UnitStatisticsDto,
  BulkCreateUnitDto
} from './dto';
import { JwtAuthGuard } from './../../guards/jwt-auth.guard'

@ApiTags('Units')
@Controller('units')
// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi unit yaratish' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Unit yaratildi', type: UnitResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Noto\'g\'ri ma\'lumotlar' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Unit nomi allaqachon mavjud' })
  async create(@Body() createUnitDto: CreateUnitDto) {
    return await this.unitService.create(createUnitDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bir nechta unit yaratish' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Unitlar yaratildi' })
  async bulkCreate(@Body() bulkCreateDto: BulkCreateUnitDto) {
    return await this.unitService.bulkCreate(bulkCreateDto);
  }

  // @Post(':id/duplicate')
  // @ApiOperation({ summary: 'Unitni nusxalash' })
  // @ApiResponse({ status: HttpStatus.CREATED, description: 'Unit nusxalandi' })
  // async duplicateUnit(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() body: { new_title: string }
  // ) {
  //   return await this.unitService.duplicateUnit(id, body.new_title);
  // }

  @Get()
  @ApiOperation({ summary: 'Barcha unitlarni olish' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unitlar ro\'yxati' })
  async findAll(@Query() query: UnitQueryDto) {
    return await this.unitService.findAll(query);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Unit statistikasini olish' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unit statistikasi', type: UnitStatisticsDto })
  async getUnitStatistics(@Param('id', ParseIntPipe) id: number) {
    return await this.unitService.getUnitStatistics(id);
  }

  @Get(':id/exercises')
@ApiOperation({ summary: 'Unit exerciselarini olish' })
@ApiResponse({ status: HttpStatus.OK, description: 'Unit exerciselari' })
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
async getUnitExercises(
  @Param('id', ParseIntPipe) id: number,
  @Query('page') page?: string,
  @Query('limit') limit?: string
) {
  const pageNumber = page ? parseInt(page, 10) : 1;
  const limitNumber = limit ? parseInt(limit, 10) : 10;

  return await this.unitService.getUnitExercises(id, pageNumber, limitNumber);
}


  // @Get(':id/vocabs')
  // @ApiOperation({ summary: 'Unit vocablarini olish' })
  // @ApiResponse({ status: HttpStatus.OK, description: 'Unit vocablari' })
  // @ApiQuery({ name: 'page', required: false, type: Number })
  // @ApiQuery({ name: 'limit', required: false, type: Number })
  // async getUnitVocabs(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Query('page', ParseIntPipe) page: number = 1,
  //   @Query('limit', ParseIntPipe) limit: number = 10
  // ) {
  //   return await this.unitService.getUnitVocabs(id, page, limit);
  // }

  // @Get(':id/progress')
  // @ApiOperation({ summary: 'Unit bo\'yicha studentlar progressini olish' })
  // @ApiResponse({ status: HttpStatus.OK, description: 'Unit progressi' })
  // async getUnitProgress(@Param('id', ParseIntPipe) id: number) {
  //   return await this.unitService.getUnitProgress(id);
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta unitni olish' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unit topildi', type: UnitResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Unit topilmadi' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.unitService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Unitni yangilash' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unit yangilandi', type: UnitResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Unit topilmadi' })
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateUnitDto: UpdateUnitDto
  ) {
    return await this.unitService.update(id, updateUnitDto);
  }


}