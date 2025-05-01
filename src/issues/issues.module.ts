import { Module } from '@nestjs/common';
import { issuesService } from './issues.service';
import { issuesController } from './issues.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comments } from './entities/comments.entity';
import { Epic } from './entities/epic.entity';
import { Issue } from './entities/issue.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from 'src/config/envs';

@Module({
  imports: [TypeOrmModule.forFeature([Comments, Epic, Issue]),
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
  controllers: [issuesController],
  providers: [issuesService],
  exports: [TypeOrmModule, issuesService],
})
export class issuesModule {}
