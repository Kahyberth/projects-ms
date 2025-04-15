import { Test, TestingModule } from '@nestjs/testing';
import { ProductBacklogService } from './product-backlog.service';

describe('ProductBacklogService', () => {
  let service: ProductBacklogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductBacklogService],
    }).compile();

    service = module.get<ProductBacklogService>(ProductBacklogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
