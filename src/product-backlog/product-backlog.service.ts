import { Injectable } from '@nestjs/common';
import { CreateProductBacklogDto } from './dto/create-product-backlog.dto';
import { UpdateProductBacklogDto } from './dto/update-product-backlog.dto';

@Injectable()
export class ProductBacklogService {
  create(createProductBacklogDto: CreateProductBacklogDto) {
    return 'This action adds a new productBacklog';
  }

  findAll() {
    return `This action returns all productBacklog`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productBacklog`;
  }

  update(id: number, updateProductBacklogDto: UpdateProductBacklogDto) {
    return `This action updates a #${id} productBacklog`;
  }

  remove(id: number) {
    return `This action removes a #${id} productBacklog`;
  }
}
