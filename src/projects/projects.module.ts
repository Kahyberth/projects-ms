import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Members } from './entities/members.entity';
import { SendInvitationService } from 'src/send-invitation/send-invitation.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, SendInvitationService],
  imports: [
    TypeOrmModule.forFeature([Project, Members]),
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
