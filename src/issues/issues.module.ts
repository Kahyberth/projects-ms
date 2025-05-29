import { Module } from '@nestjs/common';
import { issuesService } from './issues.service';
import { issuesController } from './issues.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comments } from './entities/comments.entity';
import { Epic } from './entities/epic.entity';
import { Issue } from './entities/issue.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from '../config/envs';
import { EpicsService } from './epics.service';
import { EpicsController } from './epics.controller';
import { Project } from '../projects/entities/project.entity';
import { ProductBacklog } from '../product-backlog/entities/product-backlog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comments, Epic, Issue, Project, ProductBacklog]),
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
