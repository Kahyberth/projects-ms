import { Inject, Injectable, Logger } from '@nestjs/common';
import { Project } from './entities/project.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Members } from './entities/members.entity';
import { SendInvitationService } from 'src/send-invitation/send-invitation.service';
import { catchError, firstValueFrom } from 'rxjs';
import { User } from 'src/interfaces/user.interface';
import { Team } from 'src/interfaces/team.interface';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Members)
    private readonly membersRepository: Repository<Members>,
    @Inject(SendInvitationService)
    private readonly sendInvitationService: SendInvitationService,
    @Inject('NATS_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  /**
   * @async
   * @author Kahyberth
   * @description It is responsible for creating a new project
   * @returns newProject
   */
  async createProject(dto: CreateProjectDto): Promise<Project> {
    const queryRunner =
      this.projectRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.validateProjectName(dto.name);
      await this.validateCreatorNotMember(dto.created_by, dto.team_id);

      const project = this.projectRepository.create({
        name: dto.name,
        description: dto.description,
        createdBy: dto.created_by,
        team_id: dto.team_id,
        is_available: true,
      });

      const savedProject = await this.projectRepository.save(project);

      const creatorMember = this.membersRepository.create({
        user_id: dto.created_by,
        project: savedProject,
        joinedAt: new Date(),
      });

      await this.membersRepository.save(creatorMember);

      if (dto.members && dto.members.length > 0) {
        const additionalMembers = dto.members.map((userId) =>
          this.membersRepository.create({
            user_id: userId,
            project: savedProject,
            joinedAt: new Date(),
          }),
        );

        await this.membersRepository.save(additionalMembers);
      }

      await queryRunner.commitTransaction();

      const [lead_user, team] = await Promise.all([
        this.findUserById(dto.created_by),
        this.findTeamById(dto.team_id),
      ]);

      const invitations = await Promise.all(
        dto.members.map(async (userId) => {
          const user = await this.findUserById(userId);
          const payload = {
            host: lead_user.name,
            invitedEmail: user.email,
            invitedName: user.name,
            projectName: savedProject.name,
            projectId: savedProject.id,
            teamName: team.name,
            link: 'http://localhost:5173/dashboard/projects',
          };
          return this.sendInvitationService.viewProjectInvitation(payload);
        }),
      );

      this.logger.log(
        `Project created: ${savedProject.name} with ${dto.members.length} members invited`,
      );

      return savedProject;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Error creating project. Transaction rolled back.',
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @async
   * @author Kahyberth
   * @description It is responsible for validating the project name
   * @param name
   * @returns Promise<void>
   */
  private async validateProjectName(name: string) {
    const existing = await this.projectRepository.findOne({
      where: { name, is_available: true },
    });
    if (existing) {
      throw new RpcException('Project with this name already exists');
    }
  }

  /**
   * @async
   * @author Kahyberth
   * @description It is responsible for validating if the user is already a member of the project
   * @param userId
   * @param teamId
   * @returns Promise<void>
   */
  private async validateCreatorNotMember(userId: string, teamId: string): Promise<void> {
    const existing = await this.membersRepository.findOne({
      where: { user_id: userId, project: { id: teamId } },
    });
    if (existing) {
      throw new RpcException('User is already a member of this project');
    }
  }

  /**
   * @async
   * @author Kahyberth
   * @description It is responsible for finding the user by id
   * @param userId
   * @returns Promise<User>
   */
  private async findUserById(userId: string): Promise<User> {
    return await firstValueFrom(
      this.client.send('auth.find.user.by.id', userId).pipe(
        catchError((error) => {
          this.logger.error(`Error fetching user ${userId}`, error.stack);
          throw error;
        }),
      ),
    );
  }

  private async findTeamById(teamId: string): Promise<Team> {
    return await firstValueFrom(
      this.client.send('teams.by.id', teamId).pipe(
        catchError((error) => {
          this.logger.error(`Error fetching team ${teamId}`, error.stack);
          throw error;
        }),
      ),
    );
  }

  /**
   * @async
   * @author Kahyberth
   * @param id
   * @param dto
   * @returns Promise<Project>
   */
  async updateProject(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });

    if (!project) {
      throw new Error('Project not found');
    }

    const updatedProject = this.projectRepository.merge(project, {
      ...dto,
      updatedAt: new Date(),
    });

    return this.projectRepository.save(updatedProject);
  }

  /**
   * @async
   * @author Kahyberth
   * @description Gets all the Projects were created
   * @returns Promise<Project[]>
   */
  async getAllProjects(): Promise<Project[]> {
    return await this.projectRepository.find({
      where: {
        is_available: true,
      },
      relations: ['members', 'epic', 'backlog', 'sprint', 'logging'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * @async
   * @author Kahyberth
   * @param id
   * @returns Promise<{ message: string }>
   */
  async deleteProject(id: string): Promise<{ message: string }> {
    const project = await this.projectRepository.findOne({ where: { id } });

    if (!project) {
      throw new Error('Project not found');
    }

    project.is_available = false;
    project.deletedAt = new Date();

    await this.projectRepository.save(project);

    return { message: 'Project successfully deleted (logical deletion)' };
  }

  /**
   * @author Kahyberth
   * @param projectId
   * @param userId
   * @returns
   */
  async inviteMemberToProject(
    projectId: string,
    userId: string,
  ): Promise<Members> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, is_available: true },
    });

    if (!project) {
      throw new RpcException('Project not found or unavailable');
    }

    const existing = await this.membersRepository.findOne({
      where: { user_id: userId, project: { id: projectId } },
      relations: ['project'],
    });

    if (existing) {
      throw new RpcException('User is already a member of this project');
    }

    const member = this.membersRepository.create({
      user_id: userId,
      project,
      joinedAt: new Date(),
    });

    return this.membersRepository.save(member);
  }

  /**
   * @author Kahyberth
   * @param projectId
   * @param userId
   * @returns
   */
  async removeMemberFromProject(
    projectId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, is_available: true },
    });

    if (!project) {
      throw new RpcException('Project not found or unavailable');
    }

    const member = await this.membersRepository.findOne({
      where: { user_id: userId, project: { id: projectId } },
      relations: ['project'],
    });

    if (!member) {
      throw new RpcException('User is not a member of this project');
    }

    await this.membersRepository.remove(member);

    return { message: 'Member removed from project successfully' };
  }

  /**
   * @author Kahyberth
   * @param projectId
   * @returns
   */
  async getProjectMembers(projectId: string): Promise<Members[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, is_available: true },
    });

    if (!project) {
      throw new RpcException('Project not found or unavailable');
    }

    return this.membersRepository.find({
      where: { project: { id: projectId } },
      relations: ['project'],
    });
  }

  /**
   * @author Kahyberth
   * @param projectId
   * @returns
   */
  async getProjectById(projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, is_available: true },
      relations: ['members', 'epic', 'backlog', 'sprint', 'logging'],
    });

    if (!project) {
      throw new RpcException('Project not found or unavailable');
    }

    return project;
  }

  /**
   * @author Kahyberth
   * @param projectId
   * @returns
   */
  async getProjectByIdWithMembers(projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, is_available: true },
      relations: ['members'],
    });

    if (!project) {
      throw new RpcException('Project not found or unavailable');
    }

    return project;
  }
}
