import { INestMicroservice, ValidationPipe } from '@nestjs/common';
import { ClientProxy, ClientsModule, MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { envs } from '../../config/envs';
import { ProductBacklog } from '../../product-backlog/entities/product-backlog.entity';
import { Members } from '../entities/members.entity';
import { Project } from '../entities/project.entity';
import { ProjectsModule } from '../projects.module';
import { ProjectsService } from '../projects.service';

import { Comments } from '../../issues/entities/comments.entity';
import { Epic } from '../../issues/entities/epic.entity';
import { Issue } from '../../issues/entities/issue.entity';
import { IssueTransition } from '../../sprint-backlog/entities/issue-transition.entity';
import { SprintBacklog } from '../../sprint-backlog/entities/sprint.backlog.entity';
import { Sprint } from '../../sprint-backlog/entities/sprint.entity';
import { SprintLogging } from '../../sprint-backlog/entities/sprint.logging.entity';

describe('ProjectsController - E2E Tests', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let natsClient: ClientProxy;
  let projectRepository: Repository<Project>;
  let membersRepository: Repository<Members>;
  let productBacklogRepository: Repository<ProductBacklog>;
  let projectsService: ProjectsService;

  const TEAM_ID = '550e8400-e29b-41d4-a716-446655440000';
  const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
  const CREATOR_ID = '550e8400-e29b-41d4-a716-446655440002';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: envs.DB_HOST,
          port: envs.DB_PORT,
          username: 'postgres',
          password: envs.DB_PASSWORD,
          database: envs.DB_DATABASE,
          synchronize: true,
          dropSchema: true,
          entities: [
            Project, 
            Members, 
            ProductBacklog, 
            Epic, 
            Issue, 
            Comments, 
            Sprint, 
            SprintBacklog, 
            SprintLogging, 
            IssueTransition
          ],
        }),
        ProjectsModule,
        ClientsModule.register([
          {
            name: 'PROJECTS_SERVICE',
            transport: Transport.NATS,
            options: {
              servers: envs.NATS_SERVERS,
            },
          },
          {
            name: 'NATS_SERVICE',
            transport: Transport.NATS,
            options: {
              servers: envs.NATS_SERVERS,
            },
          },
        ]),
      ],
    }).compile();

    app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.NATS,
      options: {
        servers: envs.NATS_SERVERS,
      },
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    client = moduleFixture.get<ClientProxy>('PROJECTS_SERVICE');
    natsClient = moduleFixture.get<ClientProxy>('NATS_SERVICE');
    projectRepository = moduleFixture.get(getRepositoryToken(Project));
    membersRepository = moduleFixture.get(getRepositoryToken(Members));
    productBacklogRepository = moduleFixture.get(getRepositoryToken(ProductBacklog));
    projectsService = moduleFixture.get<ProjectsService>(ProjectsService);

    await app.listen();
    await client.connect();
    await natsClient.connect();

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, 60000);

  afterAll(async () => {
    if (client) await client.close();
    if (natsClient) await natsClient.close();
    if (app) await app.close();
  });

  beforeEach(async () => {
    await membersRepository.query(`TRUNCATE TABLE members CASCADE`);
    await projectRepository.query(`TRUNCATE TABLE projects CASCADE`);
    await productBacklogRepository.query(`TRUNCATE TABLE product_backlog CASCADE`);
  });

  describe('projects.ping', () => {
    it('should return pong', async () => {
      const response = await client.send('projects.ping', {}).toPromise();
      expect(response).toBe('pong');
    });
  });

  describe('projects.create.project', () => {
    it('should create a new project successfully', async () => {
      const payload = {
        name: 'Test Project',
        description: 'This is a test project',
        created_by: CREATOR_ID,
        team_id: TEAM_ID,
        type: 'SCRUM',
        tags: ['test', 'development'],
        members: [USER_ID],
      };

      jest.spyOn(projectsService as any, 'findUserById').mockResolvedValue({
        id: CREATOR_ID,
        name: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      });

      jest.spyOn(projectsService as any, 'findTeamById').mockResolvedValue({
        id: TEAM_ID,
        name: 'Test Team',
      });

      jest.spyOn(projectsService as any, 'validateCreatorNotMember').mockResolvedValue(undefined);

      const mockSendInvitationService = {
        viewProjectInvitation: jest.fn().mockResolvedValue(true),
      };
      (projectsService as any).sendInvitationService = mockSendInvitationService;

      const response = await client
        .send('projects.create.project', payload)
        .toPromise();

      expect(response).toBeDefined();
      expect(response.name).toBe(payload.name);
      expect(response.description).toBe(payload.description);
      expect(response.createdBy).toBe(payload.created_by);
      expect(response.team_id).toBe(payload.team_id);
      expect(response.type).toBe(payload.type);

      const savedProject = await projectRepository.findOne({
        where: { name: payload.name },
        relations: ['members', 'backlog'],
      });

      expect(savedProject).toBeDefined();
      expect(savedProject!.is_available).toBe(true);
      expect(savedProject!.project_key).toBe('TES');
      expect(savedProject!.members).toHaveLength(2);
      expect(savedProject!.backlog).toBeDefined();
    }, 30000);

    it('should throw error when project name already exists', async () => {
      const payload = {
        name: 'Duplicate Project',
        description: 'This is a duplicate project',
        created_by: CREATOR_ID,
        team_id: TEAM_ID,
        type: 'SCRUM',
      };

      await projectRepository.save(
        projectRepository.create({
          name: payload.name,
          description: payload.description,
          createdBy: payload.created_by,
          team_id: payload.team_id,
          type: payload.type,
          project_key: 'DUP',
          is_available: true,
        }),
      );

      try {
        await client.send('projects.create.project', payload).toPromise();
        fail('Should have thrown an error for duplicate project name');
      } catch (error) {
        expect(error.message).toBe('Project with this name already exists');
      }
    }, 30000);
  });

  describe('projects.findAll.project', () => {
    it('should return all available projects with pagination', async () => {
      const project1 = projectRepository.create({
        name: 'Project 1',
        description: 'First project',
        createdBy: CREATOR_ID,
        team_id: TEAM_ID,
        type: 'SCRUM',
        project_key: 'PR1',
        is_available: true,
      });

      const project2 = projectRepository.create({
        name: 'Project 2',
        description: 'Second project',
        createdBy: CREATOR_ID,
        team_id: TEAM_ID,
        type: 'KANBAN',
        project_key: 'PR2',
        is_available: true,
      });

      await projectRepository.save([project1, project2]);

      const response = await client
        .send('projects.findAll.project', { page: 1, limit: 10 })
        .toPromise();

      expect(response).toBeDefined();
      expect(response.data).toHaveLength(2);
      expect(response.total).toBe(2);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(10);
    }, 30000);
  });

  describe('projects.findOne.project', () => {
    it('should return a specific project by ID', async () => {
      jest.spyOn(projectsService as any, 'findUserById').mockResolvedValue({
        id: CREATOR_ID,
        name: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      });

      const project = await projectRepository.save(
        projectRepository.create({
          name: 'Find Me Project',
          description: 'Project to be found',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'FMP',
          is_available: true,
        }),
      );

      const response = await client
        .send('projects.findOne.project', project.id)
        .toPromise();

      expect(response).toBeDefined();
      expect(response).toHaveLength(1);
      expect(response[0].id).toBe(project.id);
      expect(response[0].name).toBe(project.name);
      expect(response[0].createdBy).toBe('John Doe');
    }, 30000);

    it('should throw error when project not found', async () => {
      const nonExistentId = '12345678-1234-1234-1234-123456789abc';

      try {
        await client.send('projects.findOne.project', nonExistentId).toPromise();
        fail('Should have thrown an error for non-existent project');
      } catch (error) {
        expect(error.message).toBe('Project not found or unavailable');
      }
    }, 30000);
  });

  describe('projects.update.project', () => {
    it('should update an existing project', async () => {
      const project = await projectRepository.save(
        projectRepository.create({
          name: 'Original Project',
          description: 'Original description',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'ORP',
          is_available: true,
        }),
      );

      const updatePayload = {
        id: project.id,
        name: 'Updated Project',
        description: 'Updated description',
        status: 'completed',
      };

      const response = await client
        .send('projects.update.project', updatePayload)
        .toPromise();

      expect(response).toBeDefined();
      expect(response.name).toBe(updatePayload.name);
      expect(response.description).toBe(updatePayload.description);
      expect(response.status).toBe(updatePayload.status);

      const updatedProject = await projectRepository.findOne({
        where: { id: project.id },
      });
      expect(updatedProject).toBeDefined();
      expect(updatedProject!.name).toBe(updatePayload.name);
    }, 30000);
  });

  describe('projects.delete.project', () => {
    it('should perform logical deletion of a project', async () => {
      const project = await projectRepository.save(
        projectRepository.create({
          name: 'Project to Delete',
          description: 'This project will be deleted',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'PTD',
          is_available: true,
        }),
      );

      const response = await client
        .send('projects.delete.project', project.id)
        .toPromise();

      expect(response).toBeDefined();
      expect(response.message).toBe('Project successfully deleted (logical deletion)');

      const deletedProject = await projectRepository.findOne({
        where: { id: project.id },
      });
      expect(deletedProject).toBeDefined();
      expect(deletedProject!.is_available).toBe(false);
      expect(deletedProject!.deletedAt).toBeDefined();
    }, 30000);
  });

  describe('projects.invite.member', () => {
    it('should invite a member to a project successfully', async () => {
      const project = await projectRepository.save(
        projectRepository.create({
          name: 'Invitation Test Project',
          description: 'Project for testing invitations',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'ITP',
          is_available: true,
        }),
      );

      const invitePayload = {
        projectId: project.id,
        userId: CREATOR_ID,
        email: 'invited@example.com',
        invitedUserId: '550e8400-e29b-41d4-a716-446655440003',
      };

      jest.spyOn(projectsService as any, 'findUserById')
        .mockResolvedValueOnce({
          id: CREATOR_ID,
          name: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        })
        .mockResolvedValueOnce({
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Jane',
          lastName: 'Smith',
          email: 'invited@example.com',
        });

      jest.spyOn(projectsService as any, 'findTeamById').mockResolvedValue({
        id: TEAM_ID,
        name: 'Test Team',
      });

      const mockSendInvitationService = {
        viewProjectInvitation: jest.fn().mockResolvedValue(true),
      };
      (projectsService as any).sendInvitationService = mockSendInvitationService;

      const response = await client
        .send('projects.invite.member', invitePayload)
        .toPromise();

      expect(response).toBeDefined();
      expect(response.user_id).toBe(invitePayload.invitedUserId);
      expect(response.project.id).toBe(project.id);

      const member = await membersRepository.findOne({
        where: { user_id: invitePayload.invitedUserId, project: { id: project.id } },
        relations: ['project'],
      });
      expect(member).toBeDefined();
      expect(member!.joinedAt).toBeDefined();
    }, 30000);

    it('should throw error when inviting existing member', async () => {
      const project = await projectRepository.save(
        projectRepository.create({
          name: 'Existing Member Project',
          description: 'Project with existing member',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'EMP',
          is_available: true,
        }),
      );

      await membersRepository.save(
        membersRepository.create({
          user_id: '550e8400-e29b-41d4-a716-446655440004',
          project: project,
          joinedAt: new Date(),
        }),
      );

      const invitePayload = {
        projectId: project.id,
        userId: CREATOR_ID,
        email: 'existing@example.com',
        invitedUserId: '550e8400-e29b-41d4-a716-446655440004',
      };

      jest.spyOn(projectsService as any, 'findUserById').mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Existing',
        lastName: 'User',
        email: 'existing@example.com',
      });

      try {
        await client.send('projects.invite.member', invitePayload).toPromise();
        fail('Should have thrown an error for existing member');
      } catch (error) {
        expect(error.message).toBe('User is already a member of this project');
      }
    }, 30000);
  });

  describe('projects.remove.member', () => {
    it('should remove a member from a project', async () => {
      const project = await projectRepository.save(
        projectRepository.create({
          name: 'Member Removal Project',
          description: 'Project for testing member removal',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'MRP',
          is_available: true,
        }),
      );

      const member = await membersRepository.save(
        membersRepository.create({
          user_id: '550e8400-e29b-41d4-a716-446655440005',
          project: project,
          joinedAt: new Date(),
        }),
      );

      const removePayload = {
        projectId: project.id,
        userId: '550e8400-e29b-41d4-a716-446655440005',
      };

      const response = await client
        .send('projects.remove.member', removePayload)
        .toPromise();

      expect(response).toBeDefined();
      expect(response.message).toBe('Member removed from project successfully');

      const removedMember = await membersRepository.findOne({
        where: { id: member.id },
      });
      expect(removedMember).toBeNull();
    }, 30000);

    it('should throw error when removing non-existent member', async () => {
      const project = await projectRepository.save(
        projectRepository.create({
          name: 'Non-member Project',
          description: 'Project without the member',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'NMP',
          is_available: true,
        }),
      );

      const removePayload = {
        projectId: project.id,
        userId: '550e8400-e29b-41d4-a716-446655440006',
      };

      try {
        await client.send('projects.remove.member', removePayload).toPromise();
        fail('Should have thrown an error for non-existent member');
      } catch (error) {
        expect(error.message).toBe('User is not a member of this project');
      }
    }, 30000);
  });

  describe('projects.members.paginated', () => {
    it('should return paginated project members', async () => {
      const project = await projectRepository.save(
        projectRepository.create({
          name: 'Members Pagination Project',
          description: 'Project for testing member pagination',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'MPP',
          is_available: true,
        }),
      );

      const members: Members[] = [];
      for (let i = 1; i <= 5; i++) {
        members.push(
          membersRepository.create({
            user_id: `550e8400-e29b-41d4-a716-44665544000${i}`,
            project: project,
            joinedAt: new Date(),
          }),
        );
      }
      await membersRepository.save(members);

      jest.spyOn(projectsService as any, 'findUserById').mockImplementation((userId: string) => {
        const userNumber = userId.slice(-1);
        return Promise.resolve({
          id: userId,
          name: `User${userNumber}`,
          lastName: `Last${userNumber}`,
          email: `user${userNumber}@example.com`,
        });
      });

      const response = await client
        .send('projects.members.paginated', {
          projectId: project.id,
          page: 1,
          limit: 3,
        })
        .toPromise();

      expect(response).toBeDefined();
      expect(response.users).toHaveLength(3);
      expect(response.total).toBe(5);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(3);
      expect(response.totalPages).toBe(2);
      expect(response.users[0]).toHaveProperty('name');
      expect(response.users[0]).toHaveProperty('email');
      expect(response.users[0]).toHaveProperty('userId');
    }, 30000);
  });

  describe('projects.get.projects.by.team', () => {
    it('should return all projects for a specific team', async () => {
      const project1 = await projectRepository.save(
        projectRepository.create({
          name: 'Team Project 1',
          description: 'First team project',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'TP1',
          is_available: true,
        }),
      );

      const project2 = await projectRepository.save(
        projectRepository.create({
          name: 'Team Project 2',
          description: 'Second team project',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'KANBAN',
          project_key: 'TP2',
          is_available: true,
        }),
      );

      await projectRepository.save(
        projectRepository.create({
          name: 'Other Team Project',
          description: 'Project for different team',
          createdBy: CREATOR_ID,
          team_id: '550e8400-e29b-41d4-a716-446655440099',
          type: 'SCRUM',
          project_key: 'OTP',
          is_available: true,
        }),
      );

      const response = await client
        .send('projects.get.projects.by.team', TEAM_ID)
        .toPromise();

      expect(response).toBeDefined();
      expect(response).toHaveLength(2);
      expect(response[0].team_id).toBe(TEAM_ID);
      expect(response[1].team_id).toBe(TEAM_ID);
    }, 30000);
  });

  describe('projects.findAllByUser.project', () => {
    it('should return paginated projects for a specific user', async () => {
      jest.spyOn(projectsService as any, 'findUserById').mockResolvedValue({
        id: USER_ID,
        name: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      });

      const project1 = await projectRepository.save(
        projectRepository.create({
          name: 'User Project 1',
          description: 'First user project',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'SCRUM',
          project_key: 'UP1',
          is_available: true,
        }),
      );

      const project2 = await projectRepository.save(
        projectRepository.create({
          name: 'User Project 2',
          description: 'Second user project',
          createdBy: CREATOR_ID,
          team_id: TEAM_ID,
          type: 'KANBAN',
          project_key: 'UP2',
          is_available: true,
        }),
      );

      await membersRepository.save([
        membersRepository.create({
          user_id: USER_ID,
          project: project1,
          joinedAt: new Date(),
        }),
        membersRepository.create({
          user_id: USER_ID,
          project: project2,
          joinedAt: new Date(),
        }),
      ]);

      const response = await client
        .send('projects.findAllByUser.project', {
          userId: USER_ID,
          page: 1,
          limit: 10,
        })
        .toPromise();

      expect(response).toBeDefined();
      expect(response.data).toHaveLength(2);
      expect(response.meta.total).toBe(2);
      expect(response.meta.page).toBe(1);
      expect(response.meta.perPage).toBe(10);
    }, 30000);
  });
});
