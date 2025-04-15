import { Module } from '@nestjs/common';
import { ProductBacklogService } from './product-backlog.service';
import { ProductBacklogController } from './product-backlog.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductBacklog } from './entities/product-backlog.entity';

@Module({
  controllers: [ProductBacklogController],
  providers: [ProductBacklogService],
  imports: [TypeOrmModule.forFeature([ProductBacklog])],
  exports: [TypeOrmModule, ProductBacklogService],
})
export class ProductBacklogModule {}
