import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductBacklog } from '../../product-backlog/entities/product-backlog.entity';
import { SendInvitationService } from '../../send-invitation/send-invitation.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { Members } from '../entities/members.entity';
import { Project } from '../entities/project.entity';
import { ProjectsService } from '../projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let membersRepository: jest.Mocked<Repository<Members>>;
  let productBacklogRepository: jest.Mocked<Repository<ProductBacklog>>;
  let sendInvitationService: jest.Mocked<SendInvitationService>;
  let client: any;
  let dataSource: any;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            merge: jest.fn(),
            manager: {
              connection: {
                createQueryRunner: () => mockQueryRunner,
              },
            },
          },
        },
        {
          provide: getRepositoryToken(Members),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductBacklog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: SendInvitationService,
          useValue: {
            viewProjectInvitation: jest.fn(),
          },
        },
        {
          provide: 'NATS_SERVICE',
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get(getRepositoryToken(Project));
    membersRepository = module.get(getRepositoryToken(Members));
    productBacklogRepository = module.get(getRepositoryToken(ProductBacklog));
    sendInvitationService = module.get(SendInvitationService);
    client = module.get('NATS_SERVICE');
    dataSource = module.get(DataSource);
  });

  describe('createProject', () => {
    const createProjectDto: CreateProjectDto = {
      name: 'Test Project',
      description: 'Test Description',
      created_by: 'user-1',
      team_id: 'team-1',
      type: 'SCRUM',
      tags: ['development'],
      members: ['user-2'],
    };

    it('should create a project successfully', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        description: 'Test Description',
        createdBy: 'user-1',
        team_id: 'team-1',
        type: 'SCRUM',
        project_key: 'TES',
        is_available: true,
        backlog: { id: 'backlog-1' },
      };

      const mockProductBacklog = { id: 'backlog-1' };
      const mockUser = { id: 'user-1', name: 'John', lastName: 'Doe', email: 'john@example.com' };
      const mockTeam = { id: 'team-1', name: 'Test Team' };


      projectRepository.findOne.mockResolvedValue(null); 
      membersRepository.findOne.mockResolvedValue(null); 
      projectRepository.create.mockReturnValue(mockProject as any);
      productBacklogRepository.create.mockReturnValue(mockProductBacklog as any);
      productBacklogRepository.save.mockResolvedValue(mockProductBacklog as any);
      projectRepository.save.mockResolvedValue(mockProject as any);
      membersRepository.create.mockReturnValue({ user_id: 'user-1', project: mockProject } as any);
      membersRepository.save.mockResolvedValue({ user_id: 'user-1', project: mockProject } as any);
      
      client.send.mockReturnValue({
        pipe: () => ({
          subscribe: (fn) => fn(mockUser),
        }),
      });

   
      jest.spyOn(service as any, 'findUserById').mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'findTeamById').mockResolvedValue(mockTeam);

      const result = await service.createProject(createProjectDto);

      expect(result).toEqual(mockProject);
      expect(projectRepository.create).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'Test Description',
        createdBy: 'user-1',
        team_id: 'team-1',
        tags: ['development'],
        type: 'SCRUM',
        project_key: 'TES',
        is_available: true,
      });
    });

    it('should throw error if project name already exists', async () => {
      const existingProject = { id: 'existing-1', name: 'Test Project' };
      projectRepository.findOne.mockResolvedValue(existingProject as any);

      await expect(service.createProject(createProjectDto)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getProjectById', () => {
    it('should return a project by id', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        is_available: true,
        members: [],
        epic: [],
        backlog: {},
        sprint: [],
        logging: [],
      };

      projectRepository.findOne.mockResolvedValue(mockProject as any);

      const result = await service.getProjectById('project-1');

      expect(result).toEqual(mockProject);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-1', is_available: true },
        relations: ['members', 'epic', 'backlog', 'sprint', 'logging'],
      });
    });

    it('should throw error if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.getProjectById('nonexistent')).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('updateProject', () => {
    const updateProjectDto: UpdateProjectDto = {
      name: 'Updated Project',
      description: 'Updated Description',
    };

    it('should update a project successfully', async () => {
      const existingProject = {
        id: 'project-1',
        name: 'Old Project',
        description: 'Old Description',
      };

      const updatedProject = {
        ...existingProject,
        ...updateProjectDto,
        updatedAt: expect.any(Date),
      };

      projectRepository.findOne.mockResolvedValue(existingProject as any);
      projectRepository.merge.mockReturnValue(updatedProject as any);
      projectRepository.save.mockResolvedValue(updatedProject as any);

      const result = await service.updateProject('project-1', updateProjectDto);

      expect(result).toEqual(updatedProject);
      expect(projectRepository.merge).toHaveBeenCalledWith(
        existingProject,
        expect.objectContaining({
          ...updateProjectDto,
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should throw error if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProject('nonexistent', updateProjectDto),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project logically', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        is_available: true,
      };

      projectRepository.findOne.mockResolvedValue(mockProject as any);
      projectRepository.save.mockResolvedValue({
        ...mockProject,
        is_available: false,
        deletedAt: expect.any(Date),
      } as any);

      const result = await service.deleteProject('project-1');

      expect(result).toEqual({
        message: 'Project successfully deleted (logical deletion)',
      });
      expect(projectRepository.save).toHaveBeenCalledWith({
        ...mockProject,
        is_available: false,
        deletedAt: expect.any(Date),
      });
    });

    it('should throw error if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteProject('nonexistent')).rejects.toThrow(
        'Project not found',
      );
    });
  });
});
