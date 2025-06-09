import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AIAssistantService } from './ai-assistant.service';

@Controller()
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AIAssistantService) {}

  @MessagePattern('get-ai-response')
  getAIResponse(@Payload() payload: { query: string; userId: string }) {
    console.log('Received payload:', payload);
    if (!payload || !payload.query) {
      throw new Error('Query is required');
    }
    return this.aiAssistantService.getAIResponse(payload.query, payload.userId);
  }
}
