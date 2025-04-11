import { Module } from '@nestjs/common';
import { ProjectsModule } from './projects/projects.module';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './config/envs';
import { Project } from './projects/entities/project.entity';

@Module({
  controllers: [],
  providers: [],
  imports: [
    ProjectsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: envs.DB_HOST,
      port: envs.DB_PORT,
      username: envs.DB_USERNAME,
      password: envs.DB_PASSWORD,
      database: envs.DB_NAME,
      entities: [Project],
      synchronize: true,
      extra: {
        ssl: true
      },
    }),
  ],
})
export class AppModule {}
