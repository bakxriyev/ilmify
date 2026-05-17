import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VocabResultService } from './vocab_result.service';
import { CreateVocabResultDto } from './dto/create-vocab_result.dto';
import { UpdateVocabResultDto } from './dto/update-vocab_result.dto';

@Controller('vocab-result')
export class VocabResultController {
  constructor(private readonly vocabResultService: VocabResultService) {}

  @Post()
  create(@Body() createVocabResultDto: CreateVocabResultDto) {
    return this.vocabResultService.create(createVocabResultDto);
  }

  @Get()
  findAll() {
    return this.vocabResultService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vocabResultService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVocabResultDto: UpdateVocabResultDto) {
    return this.vocabResultService.update(+id, updateVocabResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vocabResultService.remove(+id);
  }
}
