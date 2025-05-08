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

  @MessagePattern('product-backlog.getProductBacklog')
  async getProductBacklog(
    @Payload() payload: { backlogId: string },
  ): Promise<ProductBacklog> {
    return this.productBacklogService.getProductBacklog(payload.backlogId);
  }

  @MessagePattern('product-backlog.getProductBacklogByProjectId')
  async getProductBacklogByProjectId(
    @Payload() payload: { projectId: string },
  ): Promise<ProductBacklog> {
    return this.productBacklogService.getProductBacklogByProjectId(
      payload.projectId,
    );
  }

  @MessagePattern('product-backlog.addIssueToBacklog')
  async addIssueToBacklog(
    @Payload()
    payload: {
      createIssueDto: CreateIssueDto;
      productBacklogId: string;
    },
  ): Promise<Issue> {
    console.log(payload);
    return this.productBacklogService.addIssueToBacklog(
      payload.createIssueDto,
      payload.productBacklogId,
    );
  }

  @MessagePattern('product-backlog.getBacklogIssues')
  async getBacklogIssues(
    @Payload() payload: { backlogId: string; filters?: { status?: string } },
  ): Promise<Issue[]> {
    console.log(payload);
    return this.productBacklogService.getBacklogIssues(
      payload.backlogId,
      payload.filters,
    );
  }

  @MessagePattern('product-backlog.updateIssueOrder')
  async updateIssueOrder(@Payload() payload: UpdateIssueDto): Promise<Issue> {
    return this.productBacklogService.updateIssueOrder(payload);
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
}
