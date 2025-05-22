import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateSprintBacklogDto } from './dto/create-sprint-backlog.dto';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { SprintBacklogService } from './sprint-backlog.service';

@Controller()
export class SprintBacklogController {
  constructor(private readonly sprintBacklogService: SprintBacklogService) {}

  @MessagePattern('sprints.create.sprint')
  async createSprint(@Payload() createSprintDto: CreateSprintDto) {
    return this.sprintBacklogService.createSprint(createSprintDto);
  }

  @MessagePattern('sprints.create.sprint_backlog')
  async createSprintBacklog(@Payload() createDto: CreateSprintBacklogDto) {
    return this.sprintBacklogService.createSprintBacklog(createDto);
  }

  @MessagePattern('sprints.start.sprint')
  async startSprint(@Payload() payload: { sprintId: string }) {
    return this.sprintBacklogService.startSprint(payload.sprintId);
  }

  @MessagePattern('sprints.complete.sprint')
  async completeSprint(@Payload() payload: string) {
    console.log("Sprint ID en el controller", payload);
    return this.sprintBacklogService.completeSprint(payload);
  }

  @MessagePattern('sprints.add.issues_to_sprint')
  async addIssuesToSprint(
    @Payload() payload: { sprintId: string; issueIds: string[] },
  ) {
    return this.sprintBacklogService.addIssuesToSprint(
      payload.sprintId,
      payload.issueIds,
    );
  }

  @MessagePattern('sprints.get.sprint_backlog_issues')
  async getSprintBacklogIssues(
    @Payload()
    payload: {
      sprintId: string;
      pagination?: { page?: number; limit?: number };
      filters?: { status?: string; type?: string };
    },
  ) {
    return this.sprintBacklogService.getSprintBacklogIssues(
      payload.sprintId,
      payload.pagination,
      payload.filters,
    );
  }

  // Endpoints relacionados con métricas

  @MessagePattern('sprints.get.sprint_metrics')
  async getSprintMetrics(
    @Payload() payload: { sprintId: string; metricType?: string },
  ) {
    return this.sprintBacklogService.getSprintMetrics(
      payload.sprintId,
      payload.metricType,
    );
  }

  @MessagePattern('sprints.get.project_metrics')
  async getProjectMetrics(
    @Payload() payload: { projectId: string; metricType?: string },
  ) {
    return this.sprintBacklogService.getProjectMetrics(
      payload.projectId,
      payload.metricType,
    );
  }

  @MessagePattern('sprints.generate.sprint_report')
  async generateSprintReport(@Payload() payload: { sprintId: string }) {
    return this.sprintBacklogService.generateSprintReport(payload.sprintId);
  }

  @MessagePattern('sprints.record.sprint_manual_metric')
  async recordSprintManualMetric(
    @Payload()
    payload: {
      sprintId: string;
      metricType: string;
      value: number;
      additionalData?: Record<string, any>;
    },
  ) {
    const sprint = await this.sprintBacklogService.getSprint(payload.sprintId);
    return this.sprintBacklogService.recordSprintMetric(
      sprint,
      payload.metricType,
      payload.value,
      payload.additionalData,
    );
  }

}
