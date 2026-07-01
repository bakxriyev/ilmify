import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrinterService } from './printer.service';
import { CreatePrinterDto, UpdatePrinterDto, TestPrinterDto } from './dto/printer.dto';

@ApiTags('Printer')
@Controller('printer')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Post()
  @ApiOperation({ summary: 'Printer qo\'shish' })
  create(@Body() dto: CreatePrinterDto, @Req() req?: any) {
    return this.printerService.create(dto, req?.center_id);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha printerlar' })
  findAll(@Req() req?: any) {
    return this.printerService.findAll(req?.center_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta printer' })
  findOne(@Param('id') id: string, @Req() req?: any) {
    return this.printerService.findOne(+id, req?.center_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Printerni tahrirlash' })
  update(@Param('id') id: string, @Body() dto: UpdatePrinterDto, @Req() req?: any) {
    return this.printerService.update(+id, dto, req?.center_id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Printerni o\'chirish' })
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.printerService.remove(+id, req?.center_id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Printerni test qilish' })
  test(@Body() dto: TestPrinterDto, @Req() req?: any) {
    return this.printerService.testPrinter(dto.printer_id, req?.center_id);
  }
}
