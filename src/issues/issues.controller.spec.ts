import { Test, TestingModule } from '@nestjs/testing';
import { issuesController } from './issues.controller';
import { issuesService } from './issues.service';

describe('issuesController', () => {
  let controller: issuesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [issuesController],
      providers: [issuesService],
    }).compile();

    controller = module.get<issuesController>(issuesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
