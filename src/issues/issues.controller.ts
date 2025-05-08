import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { issuesService } from './issues.service';

@Controller()
export class issuesController {
  constructor(private readonly issuesService: issuesService) {}

  @MessagePattern('issue.find.all')
  findAll() {
    return this.issuesService.findAll();
  }

  @MessagePattern('issue.find.one')
  findOne(@Payload() id: string) {
    return this.issuesService.findOne(id);
  }

  @MessagePattern('issue.update')
  update(@Payload() data: { id: string; updateDto: UpdateIssueDto }) {
    return this.issuesService.update(data.id, data.updateDto);
  }

  @MessagePattern('issue.remove')
  remove(@Payload() id: string) {
    return this.issuesService.remove(id);
  }

  @MessagePattern('issues.by.user')
  findByAssignedUser(@Payload() assignedTo: string) {
    return this.issuesService.findIssuesByUser(assignedTo);
  }

  @MessagePattern('issues.by.backlog')
  findByBacklog(@Payload() backlogId: string) {
    return this.issuesService.findIssuesByBacklog(backlogId);
  }
}
