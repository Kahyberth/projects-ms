import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueMetric } from './entities/issue-metric.entity';
import { ProjectMetric } from './entities/project-metric.entity';
import { SprintMetric } from './entities/sprint-metric.entity';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SprintMetric, ProjectMetric, IssueMetric]),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
