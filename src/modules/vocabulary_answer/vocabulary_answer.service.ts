import { Injectable } from '@nestjs/common';
import { CreateVocabularyAnswerDto } from './dto/create-vocabulary_answer.dto';
import { UpdateVocabularyAnswerDto } from './dto/update-vocabulary_answer.dto';

@Injectable()
export class VocabularyAnswerService {
  create(createVocabularyAnswerDto: CreateVocabularyAnswerDto) {
    return 'This action adds a new vocabularyAnswer';
  }

  findAll() {
    return `This action returns all vocabularyAnswer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vocabularyAnswer`;
  }

  update(id: number, updateVocabularyAnswerDto: UpdateVocabularyAnswerDto) {
    return `This action updates a #${id} vocabularyAnswer`;
  }

  remove(id: number) {
    return `This action removes a #${id} vocabularyAnswer`;
  }
}
