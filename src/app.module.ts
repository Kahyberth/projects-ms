import { Module } from '@nestjs/common';
import { ProjectsModule } from './projects/projects.module';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './config/envs';
import { Project } from './projects/entities/project.entity';
import { ProductBacklogModule } from './product-backlog/product-backlog.module';
import { SprintBacklogModule } from './sprint-backlog/sprint-backlog.module';
import { issuesModule } from './issues/issues.module';
import { Comments } from './issues/entities/comments.entity';
import { Epic } from './issues/entities/epic.entity';
import { Issue } from './issues/entities/issue.entity';
import { ProductBacklog } from './product-backlog/entities/product-backlog.entity';
import { Members } from './projects/entities/members.entity';
import { Sprint } from './sprint-backlog/entities/sprint.entity';
import { SprintBacklog } from './sprint-backlog/entities/sprint.backlog.entity';
import { SprintLogging } from './sprint-backlog/entities/sprint.logging.entity';
import { SendInvitationService } from './send-invitation/send-invitation.service';

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
      entities: [Project, Comments, Epic, Issue, ProductBacklog, Members, Sprint, SprintBacklog, SprintLogging],
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
