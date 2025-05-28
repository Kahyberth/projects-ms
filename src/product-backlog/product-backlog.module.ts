import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Epic } from '../issues/entities/epic.entity';
import { Issue } from '../issues/entities/issue.entity';
import { Project } from '../projects/entities/project.entity';
import { Sprint } from '../sprint-backlog/entities/sprint.entity';
import { ProductBacklog } from './entities/product-backlog.entity';
import { ProductBacklogController } from './product-backlog.controller';
import { ProductBacklogService } from './product-backlog.service';
import { SprintBacklog } from '../sprint-backlog/entities/sprint.backlog.entity';
@Module({
  controllers: [ProductBacklogController],
  providers: [ProductBacklogService],
  imports: [
    TypeOrmModule.forFeature([ProductBacklog, Issue, Sprint, Epic, Project, SprintBacklog]),
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
  exports: [TypeOrmModule, ProductBacklogService],
})
export class ProductBacklogModule {}
