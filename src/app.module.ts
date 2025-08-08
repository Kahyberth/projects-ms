import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { envs } from './config/envs';
import { Comments } from './issues/entities/comments.entity';
import { Epic } from './issues/entities/epic.entity';
import { Issue } from './issues/entities/issue.entity';
import { issuesModule } from './issues/issues.module';
import { IssueMetric } from './metrics/entities/issue-metric.entity';
import { ProjectMetric } from './metrics/entities/project-metric.entity';
import { SprintMetric } from './metrics/entities/sprint-metric.entity';
import { MetricsModule } from './metrics/metrics.module';
import { ProductBacklog } from './product-backlog/entities/product-backlog.entity';
import { ProductBacklogModule } from './product-backlog/product-backlog.module';
import { Members } from './projects/entities/members.entity';
import { Project } from './projects/entities/project.entity';
import { ProjectsModule } from './projects/projects.module';
import { SendInvitationService } from './send-invitation/send-invitation.service';
import { SprintBacklog } from './sprint-backlog/entities/sprint.backlog.entity';
import { Sprint } from './sprint-backlog/entities/sprint.entity';
import { SprintLogging } from './sprint-backlog/entities/sprint.logging.entity';
import { SprintBacklogModule } from './sprint-backlog/sprint-backlog.module';

@Module({
  controllers: [],
  providers: [SendInvitationService],
  imports: [
    ProjectsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: envs.DB_HOST,
      port: envs.DB_PORT,
      username: envs.DB_USERNAME,
      password: envs.DB_PASSWORD,
      database: envs.DB_DATABASE,
      entities: [
        Project,
        Comments,
        Epic,
        Issue,
        ProductBacklog,
        Members,
        Sprint,
        SprintBacklog,
        SprintLogging,
        SprintMetric,
        ProjectMetric,
        IssueMetric,
      ],
      synchronize: true,
    }),
    ProductBacklogModule,
    SprintBacklogModule,
    issuesModule,
    MetricsModule,
    AiAssistantModule,
  ],
})
export class AppModule {}
