import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReceiptService } from './receipt.service';
import { PrintReceiptDto, ReprintReceiptDto } from './dto/create-receipt.dto';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/receipt-template.dto';

@ApiTags('Receipt')
@Controller('receipt')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post('print')
  @ApiOperation({ summary: 'Chek chop etish' })
  print(@Body() dto: PrintReceiptDto, @Req() req?: any) {
    return this.receiptService.print(dto, req?.center_id, req?.user?.id || req?.user?.sub, req?.ip);
  }

  @Post('reprint')
  @ApiOperation({ summary: 'Qayta chop etish' })
  reprint(@Body() dto: ReprintReceiptDto, @Req() req?: any) {
    return this.receiptService.reprint(dto, req?.center_id, req?.user?.id || req?.user?.sub, req?.ip);
  }

  @Get()
  @ApiOperation({ summary: 'Cheklar tarixi' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Req() req?: any) {
    return this.receiptService.findAll(req?.center_id, page ? +page : 1, limit ? +limit : 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta chek' })
  findOne(@Param('id') id: string, @Req() req?: any) {
    return this.receiptService.findOne(+id, req?.center_id);
  }

  // ---- Templates ----
  @Get('templates')
  @ApiOperation({ summary: 'Chek shablonlari' })
  findAllTemplates(@Req() req?: any) {
    return this.receiptService.findAllTemplates(req?.center_id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Shablon yaratish' })
  createTemplate(@Body() dto: CreateTemplateDto, @Req() req?: any) {
    return this.receiptService.createTemplate(dto, req?.center_id);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Shablonni tahrirlash' })
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @Req() req?: any) {
    return this.receiptService.updateTemplate(+id, dto, req?.center_id);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Shablonni o\'chirish' })
  deleteTemplate(@Param('id') id: string, @Req() req?: any) {
    return this.receiptService.deleteTemplate(+id, req?.center_id);
  }
}
