import { Test, TestingModule } from '@nestjs/testing';
import { SprintBacklogController } from './sprint-backlog.controller';
import { SprintBacklogService } from './sprint-backlog.service';

describe('SprintBacklogController', () => {
  let controller: SprintBacklogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SprintBacklogController],
      providers: [SprintBacklogService],
    }).compile();

    controller = module.get<SprintBacklogController>(SprintBacklogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
