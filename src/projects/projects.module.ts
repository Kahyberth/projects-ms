import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductBacklog } from '../product-backlog/entities/product-backlog.entity';
import { SendInvitationService } from '../send-invitation/send-invitation.service';
import { Members } from './entities/members.entity';
import { Project } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { envs } from '../config/envs';
@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, SendInvitationService],
  imports: [
    TypeOrmModule.forFeature([Project, Members, ProductBacklog]),
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
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}
