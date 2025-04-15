import { Test, TestingModule } from '@nestjs/testing';
import { ProductBacklogController } from './product-backlog.controller';
import { ProductBacklogService } from './product-backlog.service';

describe('ProductBacklogController', () => {
  let controller: ProductBacklogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductBacklogController],
      providers: [ProductBacklogService],
    }).compile();

    controller = module.get<ProductBacklogController>(ProductBacklogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
