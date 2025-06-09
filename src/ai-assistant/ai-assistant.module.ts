import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AIAssistantService } from './ai-assistant.service';
import { ProjectsModule } from '../projects/projects.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  controllers: [AiAssistantController],
  providers: [AIAssistantService],
  imports: [ProjectsModule, MetricsModule],
})
export class AiAssistantModule {}
