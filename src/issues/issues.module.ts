import { Module } from '@nestjs/common';
import { issuesService } from './issues.service';
import { issuesController } from './issues.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from './entities/issue.entity';
import { Comments } from './entities/comments.entity';
import { Epic } from './entities/epic.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from 'src/config/envs';
import { EpicsService } from './epics.service';
import { EpicsController } from './epics.controller';
import { ProductBacklog } from 'src/product-backlog/entities/product-backlog.entity';
import { Members } from 'src/projects/entities/members.entity';
import { Project } from 'src/projects/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Issue, Comments, Epic, ProductBacklog, Members, Project]),
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: envs.NATS_SERVERS,
        },
      },
    ]),
  ],
  controllers: [issuesController, EpicsController],
  providers: [issuesService, EpicsService],
  exports: [TypeOrmModule, issuesService, EpicsService],
})
export class issuesModule {}
