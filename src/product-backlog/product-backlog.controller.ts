import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductBacklogService } from './product-backlog.service';
import { CreateProductBacklogDto } from './dto/create-product-backlog.dto';
import { UpdateProductBacklogDto } from './dto/update-product-backlog.dto';

@Controller()
export class ProductBacklogController {
  constructor(private readonly productBacklogService: ProductBacklogService) {}

  @MessagePattern('createProductBacklog')
  create(@Payload() createProductBacklogDto: CreateProductBacklogDto) {
    return this.productBacklogService.create(createProductBacklogDto);
  }

  @MessagePattern('findAllProductBacklog')
  findAll() {
    return this.productBacklogService.findAll();
  }

  @MessagePattern('findOneProductBacklog')
  findOne(@Payload() id: number) {
    return this.productBacklogService.findOne(id);
  }

  @MessagePattern('updateProductBacklog')
  update(@Payload() updateProductBacklogDto: UpdateProductBacklogDto) {
    return this.productBacklogService.update(updateProductBacklogDto.id, updateProductBacklogDto);
  }

  @MessagePattern('removeProductBacklog')
  remove(@Payload() id: number) {
    return this.productBacklogService.remove(id);
  }
}
