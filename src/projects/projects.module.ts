import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Members } from './entities/members.entity';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  imports: [TypeOrmModule.forFeature([Project, Members])],
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}
