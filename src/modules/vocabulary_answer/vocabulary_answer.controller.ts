import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VocabularyAnswerService } from './vocabulary_answer.service';
import { CreateVocabularyAnswerDto } from './dto/create-vocabulary_answer.dto';
import { UpdateVocabularyAnswerDto } from './dto/update-vocabulary_answer.dto';

@Controller('vocabulary-answer')
export class VocabularyAnswerController {
  constructor(private readonly vocabularyAnswerService: VocabularyAnswerService) {}

  @Post()
  create(@Body() createVocabularyAnswerDto: CreateVocabularyAnswerDto) {
    return this.vocabularyAnswerService.create(createVocabularyAnswerDto);
  }

  @Get()
  findAll() {
    return this.vocabularyAnswerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vocabularyAnswerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVocabularyAnswerDto: UpdateVocabularyAnswerDto) {
    return this.vocabularyAnswerService.update(+id, updateVocabularyAnswerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vocabularyAnswerService.remove(+id);
  }
}
