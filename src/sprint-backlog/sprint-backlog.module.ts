import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from 'src/issues/entities/issue.entity';
import { MetricsModule } from 'src/metrics/metrics.module';
import { Project } from 'src/projects/entities/project.entity';
import { SprintBacklog } from './entities/sprint.backlog.entity';
import { Sprint } from './entities/sprint.entity';
import { SprintLogging } from './entities/sprint.logging.entity';
import { SprintBacklogController } from './sprint-backlog.controller';
import { SprintBacklogService } from './sprint-backlog.service';
import { IssueTransition } from './entities/issue-transition.entity';

@Module({
  controllers: [SprintBacklogController],
  providers: [SprintBacklogService],
  imports: [
    TypeOrmModule.forFeature([
      Sprint,
      SprintBacklog,
      Project,
      Issue,
      SprintLogging,
      IssueTransition, 
    ]),
    MetricsModule,
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: ['nats://localhost:4222'],
        },
      },
    ]),
  ],
  exports: [SprintBacklogService],
})
export class SprintBacklogModule {}
