import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { catchError, firstValueFrom } from 'rxjs';
import { Team } from 'src/interfaces/team.interface';
import { User } from 'src/interfaces/user.interface';
import { ProductBacklog } from 'src/product-backlog/entities/product-backlog.entity';
import { SendInvitationService } from 'src/send-invitation/send-invitation.service';
import { DataSource, Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Members } from './entities/members.entity';
import { Project } from './entities/project.entity';
import { InviteMemberDto } from './dto/invite-member.dto';
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
    @InjectRepository(ProductBacklog)
    private readonly productBacklogRepository: Repository<ProductBacklog>,
    private readonly dataSource: DataSource,
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
        tags: dto.tags || [dto.type],
        type: dto.type,
        project_key: dto.name.slice(0, 3).toUpperCase(),
        is_available: true,
      });

      const productBacklog = this.productBacklogRepository.create({
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      });
      await this.productBacklogRepository.save(productBacklog);

      project.backlog = productBacklog;

      const savedProject = await this.projectRepository.save(project);

      console.log('Created by', dto.created_by);

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

      if (dto.members && dto.members.length > 0) {
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

        this.logger.debug(
          `Project created: ${savedProject.name} with ${dto.members.length} members invited`,
        );
      }

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
  private async validateCreatorNotMember(
    userId: string,
    teamId: string,
  ): Promise<void> {
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


  private async getMembersByTeam(teamId: string, page: number = 1) {
    return await firstValueFrom(
      this.client.send('teams.paginate.members.by.team', { teamId, page }).pipe(
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

  //TODO: Validación para que no cualquier usuario pueda invitar a un miembro a un proyecto
  /**
   * @author Kevin
   * @description Invita a un miembro a un proyecto y envía un correo electrónico de invitación
   * @param inviteDto Datos de la invitación
   * @returns La membresía creada
   */
  async inviteMemberToProject(inviteDto: InviteMemberDto): Promise<Members> {
    const { projectId, userId, email, invitedUserId } = inviteDto;
    const invitedUser = await this.findUserById(invitedUserId);
    const user = await this.findUserById(userId);

    if (!email) throw new RpcException('Email is required');

    if (!invitedUser) {
      throw new RpcException('User to invite not found');
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectId, is_available: true },
    });

    if (!project) {
      throw new RpcException('Project not found or unavailable');
    }

    const existing = await this.membersRepository.findOne({
      where: { user_id: invitedUserId, project: { id: projectId } },
      relations: ['project'],
    });

    if (existing) {
      throw new RpcException('User is already a member of this project');
    }

    const team = await this.findTeamById(project.team_id);

    try {
      const member = this.membersRepository.create({
        user_id: invitedUserId,
        project,
        joinedAt: new Date(),
      });

      const savedMember = await this.membersRepository.save(member);

      const payload = {
        host: user?.name,
        invitedEmail: email,
        invitedName: invitedUser?.name,
        projectName: project.name,
        projectId: project.id,
        teamName: team.name,
        link: 'http://localhost:5173/dashboard/projects',
      };

      await this.sendInvitationService.viewProjectInvitation(payload);

      return savedMember;
    } catch (error) {
      this.logger.error(`Error inviting member to project: ${error.message}`);
      throw new RpcException(`Failed to invite member: ${error.message}`);
    }
  }

  /**
   * @async
   * @author Kahyberth
   * @description Gets all the Projects were created with pagination
   * @param page - Page number (starts from 1)
   * @param limit - Number of items per page
   * @returns Promise<{ data: Project[], total: number, page: number, limit: number }>
   */
  async getAllProjects(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Project[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.projectRepository.findAndCount({
      where: {
        is_available: true,
      },
      relations: ['members', 'backlog', 'sprint', 'logging'],
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * @async
   * @author Kahyberth
   * @description Gets all the Projects were created by a team
   * @param team_id
   * @returns Promise<Project[]>
   */
  async findProjectById(team_id: string): Promise<Project[]> {
    const data = await this.projectRepository.find({
      where: {
        team_id,
        is_available: true,
      },
      relations: ['members', 'backlog', 'sprint', 'logging'],
      order: {
        createdAt: 'DESC',
      },
    });

    if (!data) {
      throw new RpcException('Project not found or unavailable');
    }

    const user = await this.findUserById(data[0].createdBy);

    if (!user) {
      throw new RpcException('User not found');
    }

    console.log(user.name);

    data.map((project) => {
      project.createdBy = user.name + ' ' + user.lastName;
      return project;
    });

    return data;
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

  // /**
  //  * @author Kahyberth
  //  * @param userId
  //  * @param page
  //  * @param limit
  //  * @description It is responsible for getting all the projects where the user is a member
  //  * @returns Promise<Project[]>
  //  */
  // async getAllProjectsByUser(
  //   userId: string,
  //   page: number = 1,
  //   limit: number = 10,
  // ): Promise<Project[]> {
  //   const user = await this.findUserById(userId);

  //   if (!user) {
  //     throw new RpcException('User not found');
  //   }

  //   try {
  //     const projects = await this.getAllProjects(page, limit);

  //     const projectsWithUsers = projects.data.map((project) => {
  //       project.members = project.members.filter(
  //         (member) => member.user_id === userId,
  //       );  // ---> []
  //       return project;
  //     });

  //     return projectsWithUsers;
  //   } catch (error) {
  //     this.logger.error('Error getting projects by user', error.stack);
  //     throw error;
  //   }
  // }

  async getAllProjectsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const user = await this.findUserById(userId);

    if (!user) {
      throw new RpcException('User not found');
    }

    try {
      const skip = (page - 1) * limit;

      const query = this.projectRepository
        .createQueryBuilder('project')
        .innerJoinAndSelect(
          'project.members',
          'member',
          'member.user_id = :userId',
          { userId },
        )
        .where('project.is_available = :isAvailable', { isAvailable: true })
        .orderBy('project.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const totalQuery = this.projectRepository
        .createQueryBuilder('project')
        .innerJoin('project.members', 'member', 'member.user_id = :userId', {
          userId,
        })
        .where('project.is_available = :isAvailable', { isAvailable: true });

      const [projects, total] = await Promise.all([
        query.getMany(),
        totalQuery.getCount(),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Found ${projects.length} projects for user ${userId} (page ${page} of ${totalPages})`,
      );

      return {
        data: projects,
        meta: {
          total,
          totalPages,
          page,
          perPage: limit,
        },
      };
    } catch (error) {
      this.logger.error('Error getting projects by user', error.stack);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener los proyectos del usuario',
      });
    }
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

  /**
   * Obtiene los miembros de un proyecto por id con paginación
   * @param projectId id del proyecto
   * @param page número de página (por defecto 1)
   * @param limit cantidad por página (por defecto 10)
   * @returns Promise<{ data: Members[], total: number, page: number, limit: number }>
   */
  async getProjectMembersPaginated(
    projectId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    users: {
      name: string;
      lastName: string;
      userId: string;
      email: string;
      memberId: string;
    }[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.membersRepository.findAndCount({
      where: { project: { id: projectId } },
      relations: ['project'],
      skip,
      take: limit,
      order: { joinedAt: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    const users = await Promise.all(
      data.map(async (member) => {
        const user = await this.findUserById(member.user_id);
        return {
          name: user.name,
          lastName: user.lastName,
          userId: user.id,
          email: user.email,
          memberId: member.id,
        };
      }),
    );

    return {users, total, page, limit, totalPages };
  }









async getMembersByTeamNotInProject(teamId: string): Promise<Members[]> {

  try {
    const membersInProject = await this.membersRepository.find({
      where: { project: { team_id: teamId } },
      relations: ['project'],
    });
    
    const memberIdsInProject = membersInProject.map(member => member.user_id);
    const membersInTeam = await this.getMembersByTeam(teamId);
    
    const membersNotInProject = membersInTeam.filter(
      teamMember => !memberIdsInProject.includes(teamMember.member.id)
    );
    
    return membersNotInProject;
  } catch (error) {
    this.logger.error('Error getting members not in project:', error);
    throw new RpcException({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error al obtener los miembros no asignados al proyecto'
    });
  }
}










}
