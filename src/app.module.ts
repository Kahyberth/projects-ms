import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './config/envs';
import { Comments } from './issues/entities/comments.entity';
import { Epic } from './issues/entities/epic.entity';
import { Issue } from './issues/entities/issue.entity';
import { issuesModule } from './issues/issues.module';
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
      database: envs.DB_NAME,
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
      ],
      synchronize: true,
      extra: {
        ssl: true
      },
    }),
    ProductBacklogModule,
    SprintBacklogModule,
    issuesModule,
  ],
})
export class AppModule {}
