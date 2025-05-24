import { Controller, Get, Param, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { issuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

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
  update(@Payload() updateDto: UpdateIssueDto) {
    return this.issuesService.update(updateDto.id, updateDto, updateDto.userId);
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

  @MessagePattern('issues.create.comment')
  createComment(@Payload() createCommentDto: CreateCommentDto) {
    return this.issuesService.createComment(createCommentDto);
  }

  @MessagePattern('issues.get.comments')
  getCommentsByIssue(@Payload() issueId: string) {
    return this.issuesService.getCommentsByIssue(issueId);
  }

  @MessagePattern('issues.update.comment')
  updateComment(
    @Payload() payload: { id: string; updateCommentDto: UpdateCommentDto },
  ) {
    return this.issuesService.updateComment(payload.id, payload.updateCommentDto);
  }

  @MessagePattern('issues.delete.comment')
  deleteComment(@Payload() commentId: string) {
    return this.issuesService.deleteComment(commentId);
  }

  @MessagePattern('issues.getLastIssueNumber')
  async getLastIssueNumber(@Payload() payload: { projectId: string }) {
    return this.issuesService.getLastIssueNumber(payload.projectId);
  }

  @MessagePattern('issues.by-epic')
  async getIssuesByEpic(@Payload() epicId: string) {
    console.log("Fetching issues by epic:", epicId);
    return this.issuesService.getIssuesByEpic(epicId);
  }

}
