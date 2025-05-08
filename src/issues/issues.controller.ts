import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { issuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Controller()
export class issuesController {
  constructor(private readonly issuesService: issuesService) {}

  @MessagePattern('issue.create')
  create(@Payload() createIssueDto: CreateIssueDto) {
    return this.issuesService.create(createIssueDto);
  }

  @MessagePattern('issue.find.one')
  findOne(@Payload() id: string) {
    return this.issuesService.findOne(id);
  }

  @MessagePattern('issue.update')
  update(@Payload() updateIssueDto: UpdateIssueDto) {
    return this.issuesService.update(updateIssueDto.id, updateIssueDto);
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
