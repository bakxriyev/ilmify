import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VocabAnswersService } from './vocab_answers.service';
import { CreateVocabAnswerDto } from './dto/create-vocab_answer.dto';
import { UpdateVocabAnswerDto } from './dto/update-vocab_answer.dto';

@Controller('vocab-answers')
export class VocabAnswersController {
  constructor(private readonly vocabAnswersService: VocabAnswersService) {}

  @Post()
  create(@Body() createVocabAnswerDto: CreateVocabAnswerDto) {
    return this.vocabAnswersService.create(createVocabAnswerDto);
  }

  @Get()
  findAll() {
    return this.vocabAnswersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vocabAnswersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVocabAnswerDto: UpdateVocabAnswerDto) {
    return this.vocabAnswersService.update(+id, updateVocabAnswerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vocabAnswersService.remove(+id);
  }
}
