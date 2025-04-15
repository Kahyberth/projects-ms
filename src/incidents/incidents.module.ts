import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comments } from './entities/comments.entity';
import { Epic } from './entities/epic.entity';
import { Incident } from './entities/incident.entity';

@Module({
  controllers: [IncidentsController],
  providers: [IncidentsService],
  imports: [TypeOrmModule.forFeature([Comments, Epic, Incident])],
  exports: [TypeOrmModule, IncidentsService],
})
export class IncidentsModule {}
