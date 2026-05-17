import { Injectable } from '@nestjs/common';
import { CreateVocabAnswerDto } from './dto/create-vocab_answer.dto';
import { UpdateVocabAnswerDto } from './dto/update-vocab_answer.dto';

@Injectable()
export class VocabAnswersService {
  create(createVocabAnswerDto: CreateVocabAnswerDto) {
    return 'This action adds a new vocabAnswer';
  }

  findAll() {
    return `This action returns all vocabAnswers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vocabAnswer`;
  }

  update(id: number, updateVocabAnswerDto: UpdateVocabAnswerDto) {
    return `This action updates a #${id} vocabAnswer`;
  }

  remove(id: number) {
    return `This action removes a #${id} vocabAnswer`;
  }
}
