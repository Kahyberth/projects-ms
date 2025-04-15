import { PartialType } from '@nestjs/mapped-types';
import { CreateProductBacklogDto } from './create-product-backlog.dto';

export class UpdateProductBacklogDto extends PartialType(CreateProductBacklogDto) {
  id: number;
}
