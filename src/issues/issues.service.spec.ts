import { Test, TestingModule } from '@nestjs/testing';
import { issuesService } from './issues.service';

describe('issuesService', () => {
  let service: issuesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [issuesService],
    }).compile();

    service = module.get<issuesService>(issuesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
