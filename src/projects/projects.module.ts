import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductBacklog } from 'src/product-backlog/entities/product-backlog.entity';
import { SendInvitationService } from 'src/send-invitation/send-invitation.service';
import { Members } from './entities/members.entity';
import { Project } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
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
          servers: ['nats://localhost:4222'],
        },
      },
    ]),
  ],
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}
