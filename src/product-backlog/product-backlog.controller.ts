import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateIssueDto } from 'src/issues/dto/create-issue.dto';
import { UpdateIssueDto } from 'src/issues/dto/update-issue.dto';
import { Issue } from 'src/issues/entities/issue.entity';
import { ProductBacklog } from './entities/product-backlog.entity';
import { ProductBacklogService } from './product-backlog.service';

@Controller()
export class ProductBacklogController {
  constructor(private readonly productBacklogService: ProductBacklogService) {}


  @MessagePattern('product-backlog.getProductBacklogByProjectId')
  async getProductBacklogByProjectId(
    @Payload() payload: { projectId: string },
  ): Promise<ProductBacklog> {
    return this.productBacklogService.getProductBacklogByProjectId(
      payload.projectId,
    );
  }


  @MessagePattern('product-backlog.getBacklogIssues')
  async getBacklogIssues(
    @Payload() payload: { backlogId: string; filters?: { page?: number; limit?: number } },
  ): Promise<{ issues: Issue[]; total: number }> {
    console.log("Controller received payload:", payload);
    return this.productBacklogService.getBacklogIssues(
      payload.backlogId,
      payload.filters,
    );
  }


  @MessagePattern('product-backlog.searchIssues')
  async searchIssues(
    @Payload()
    payload: {
      backlogId: string;
      criteria: { epicId?: string; type?: string };
    },
  ): Promise<Issue[]> {
    return this.productBacklogService.searchIssues(
      payload.backlogId,
      payload.criteria,
    );
  }

  @MessagePattern('product-backlog.moveIssueToSprint')
  async moveIssueToSprint(
    @Payload() payload: { issueId: string; sprintId: string },
  ): Promise<Issue> {
    return this.productBacklogService.moveIssueToSprint(
      payload.issueId,
      payload.sprintId,
    );
  }

  @MessagePattern('product-backlog.removeIssueFromBacklog')
  async removeIssueFromBacklog(
    @Payload() payload: { issueId: string },
  ): Promise<Issue> {
    return this.productBacklogService.removeIssueFromBacklog(payload.issueId);
  }

  @MessagePattern('product-backlog.getProjectStats')
  async getProjectStats(
    @Payload() payload: { projectId: string },
  ): Promise<{ total: number; completed: number; progress: number }> {
    console.log("Getting project stats for project:", payload.projectId);
    return this.productBacklogService.getProjectStats(
      payload.projectId,
    );
  }
}
