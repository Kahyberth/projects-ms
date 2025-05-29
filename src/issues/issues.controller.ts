import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { issuesService } from './issues.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller()
export class issuesController {
  constructor(private readonly issuesService: issuesService) {}

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

  @MessagePattern('issues.update.status')
  async updateIssueStatus(@Payload() payload: { id: string; newStatus: string }) {
    console.log("Payload",payload);
    return this.issuesService.updateIssueStatus(payload.id, payload.newStatus);
  }

  @MessagePattern('issues.by-epic')
  async getIssuesByEpic(@Payload() epicId: string) {
    console.log("Fetching issues by epic:", epicId);
    return this.issuesService.getIssuesByEpic(epicId);
  }

  @MessagePattern('issues.get.comments')
  async getCommentsByIssue(@Payload() issueId: string) {
    return this.issuesService.getCommentsByIssue(issueId);
  }

  @MessagePattern('issues.create.comment')
  async createComment(@Payload() createCommentDto: CreateCommentDto) {
    return this.issuesService.createComment(createCommentDto);
  }

  @MessagePattern('issues.update.comment')
  async updateComment(@Payload() updateCommentDto: UpdateCommentDto) {
    return this.issuesService.updateComment(updateCommentDto.id, updateCommentDto);
  }

  @MessagePattern('issues.delete.comment')
  async deleteComment(@Payload() id: string) {
    return this.issuesService.deleteComment(id);
  }

}
