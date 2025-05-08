import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from 'src/issues/entities/issue.entity';
import { Sprint } from 'src/sprint-backlog/entities/sprint.entity';
import { ProductBacklog } from './entities/product-backlog.entity';
import { ProductBacklogController } from './product-backlog.controller';
import { ProductBacklogService } from './product-backlog.service';
@Module({
  controllers: [ProductBacklogController],
  providers: [ProductBacklogService],
  imports: [
    TypeOrmModule.forFeature([ProductBacklog, Issue, Sprint]),
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
