import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TariffService } from './tariff.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@ApiTags('tariffs')
@Controller('tariffs')
export class TariffController {
  constructor(private readonly tariffService: TariffService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi tarif yaratish' })
  create(@Body() dto: CreateTariffDto) {
    return this.tariffService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha tariflar' })
  findAll() {
    return this.tariffService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tarif ma\'lumotlari' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tariffService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Tarifni yangilash' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTariffDto) {
    return this.tariffService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Tarifni o\'chirish' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tariffService.remove(id);
  }
}
