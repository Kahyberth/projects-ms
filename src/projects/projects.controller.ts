import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProjectsService } from './projects.service';
import { Members } from './entities/members.entity';
import { InviteMemberDto } from './dto/invite-member.dto';

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

  @MessagePattern('projects.findAll.project')
  findAllProjects() {
    console.log('findAllProjects');
    return this.projectsService.getAllProjects();
  }

  @MessagePattern('projects.findOne.project')
  findOneProject(@Payload() id: string) {
    console.log(`Buscando proyecto con ID: ${id}`);
    return this.projectsService.getProjectById(id);
  }

  @MessagePattern('projects.findByUser.project')
  findProjectsByUser(@Payload() userId: string) {
    console.log('entra a findProjectsByUser');
    return this.projectsService.findProjectsByUser(userId);
  }

  @MessagePattern('projects.getMembers')
  async getProjectMembers(@Payload() projectId: string): Promise<Members[]> {
    console.log('Getting members for project:', projectId);
    return this.projectsService.getProjectMembers(projectId);
  }

  @MessagePattern('projects.invite.member')
  async inviteMemberToProject(@Payload() payload: InviteMemberDto): Promise<Members> {
    return this.projectsService.inviteMemberToProject(payload);
  }
}
