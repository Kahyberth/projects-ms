import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @MessagePattern('calculate_daily_metrics')
  async calculateDailyMetrics() {
    return this.metricsService.calculateDailyMetricsForAllSprints();
  }
}
