import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@ApiTags('Expenses')
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly service: ExpenseService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi chiqim yaratish' })
  create(@Body() dto: CreateExpenseDto, @Req() req?: any) {
    return this.service.create(dto, req?.user, req?.center_id);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha chiqimlar' })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  findAll(
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Req() req?: any,
  ) {
    return this.service.findAll(req?.center_id, date_from, date_to);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Chiqimni o\'chirish' })
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.service.remove(Number(id), req?.user);
  }
}
