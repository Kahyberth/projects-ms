import { Test, TestingModule } from '@nestjs/testing';
import { SprintBacklogService } from './sprint-backlog.service';

describe('SprintBacklogService', () => {
  let service: SprintBacklogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SprintBacklogService],
    }).compile();

    service = module.get<SprintBacklogService>(SprintBacklogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
