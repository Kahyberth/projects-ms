import { Controller } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InviteMemberDto } from './dto/invite-member.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';

@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @MessagePattern('projects.create.project')
  createProject(@Payload() data: any) {
    return this.projectsService.createProject(data);
  }

  @MessagePattern('projects.update.project')
  updateProject(@Payload() data: any) {
    const { id, ...dto } = data;
    return this.projectsService.updateProject(id, dto);
  }

  @MessagePattern('projects.delete.project')
  deleteProject(@Payload() id: string) {
    return this.projectsService.deleteProject(id);
  }

  @MessagePattern('projects.findAll.project')
  findAllProjects() {
    return this.projectsService.getAllProjects();
  }

  @MessagePattern('projects.findOne.project')
  findOneProject(@Payload() id: string) {
    return this.projectsService.findProjectById(id);
  }

  @MessagePattern('projects.findAllByUser.project')
  findAllProjectsByUser(@Payload() data: any) {
    const { userId, page, limit } = data;
    return this.projectsService.getAllProjectsByUser(userId, page, limit);
  }

  @MessagePattern('projects.members.paginated')
  getProjectMembersPaginated(@Payload() data: { projectId: string; page?: number; limit?: number }) {
    const { projectId, page = 1, limit = 10 } = data;
    return this.projectsService.getProjectMembersPaginated(projectId, page, limit);
  }

  @MessagePattern('projects.members.not.in.project')
  getMembersByTeamNotInProject(@Payload() data: { teamId: string, projectId: string }) {
    const { teamId, projectId } = data;
    return this.projectsService.getMembersByTeamNotInProject(teamId, projectId);
  }

  @MessagePattern('projects.invite.member')
  inviteMember(@Payload() payload: InviteMemberDto) {
    return this.projectsService.inviteMemberToProject(payload);
  }
  
  @MessagePattern('projects.remove.member')
  removeMember(@Payload() payload: RemoveMemberDto) {
    return this.projectsService.removeMemberFromProject(payload.projectId, payload.userId);
  }

  @MessagePattern('projects.get.projects.by.team')
  getProjectsByTeam(@Payload() teamId: string) {
    return this.projectsService.getProjectsByTeam(teamId);
  }
  
  @MessagePattern('projects.ping')
  ping() {
    return 'pong';
  }
}
