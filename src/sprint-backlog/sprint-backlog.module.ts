import { Module } from '@nestjs/common';
import { SprintBacklogService } from './sprint-backlog.service';
import { SprintBacklogController } from './sprint-backlog.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sprint } from './entities/sprint.entity';
import { SprintBacklog } from './entities/sprint.backlog.entity';
import { SprintLogging } from './entities/sprint.logging.entity';

@Module({
  controllers: [SprintBacklogController],
  providers: [SprintBacklogService],
  imports: [TypeOrmModule.forFeature([Sprint, SprintBacklog, SprintLogging])],
  exports: [TypeOrmModule, SprintBacklogService],
})
export class SprintBacklogModule {}
