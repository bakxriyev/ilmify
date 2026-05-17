import { Injectable } from '@nestjs/common';
import { CreateVocabResultDto } from './dto/create-vocab_result.dto';
import { UpdateVocabResultDto } from './dto/update-vocab_result.dto';

@Injectable()
export class VocabResultService {
  create(createVocabResultDto: CreateVocabResultDto) {
    return 'This action adds a new vocabResult';
  }

  findAll() {
    return `This action returns all vocabResult`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vocabResult`;
  }

  update(id: number, updateVocabResultDto: UpdateVocabResultDto) {
    return `This action updates a #${id} vocabResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} vocabResult`;
  }
}
