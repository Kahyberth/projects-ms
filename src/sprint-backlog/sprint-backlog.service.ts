import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Issue } from '../issues/entities/issue.entity';
import { MetricsService } from '../metrics/metrics.service';
import { Project } from '../projects/entities/project.entity';
import { Repository } from 'typeorm';
import { CreateSprintBacklogDto } from './dto/create-sprint-backlog.dto';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { IssueTransition } from './entities/issue-transition.entity';
import { SprintBacklog } from './entities/sprint.backlog.entity';
import { Sprint } from './entities/sprint.entity';
import { SprintLogging } from './entities/sprint-logging.entity';

@Injectable()
export class SprintBacklogService {
  constructor(
    @InjectRepository(SprintBacklog)
    private readonly sprintBacklogRepository: Repository<SprintBacklog>,
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(IssueTransition)
    private readonly issueTransitionRepository: Repository<IssueTransition>,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * @description: Crear un sprint backlog
   * @param {CreateSprintBacklogDto} createSprintBacklogDto
   * @returns {Promise<SprintBacklog>}
   */
  async createSprintBacklog(
    createSprintBacklogDto: CreateSprintBacklogDto,
    queryRunner?: any,
  ): Promise<SprintBacklog> {
    const { sprintId, projectId, issues } = createSprintBacklogDto;

    const sprintRepo = queryRunner
      ? queryRunner.manager.getRepository(Sprint)
      : this.sprintRepository;
    const projectRepo = queryRunner
      ? queryRunner.manager.getRepository(Project)
      : this.projectRepository;
    const issueRepo = queryRunner
      ? queryRunner.manager.getRepository(Issue)
      : this.issueRepository;
    const sprintBacklogRepo = queryRunner
      ? queryRunner.manager.getRepository(SprintBacklog)
      : this.sprintBacklogRepository;

    const sprint = await sprintRepo.findOne({
      where: { id: sprintId },
      relations: ['project', 'sprint_backlog'],
    });
    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ['sprint', 'sprint_backlog'],
    });

    if (!sprint || !project) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Sprint o proyecto no encontrado',
      });
    }

    const sprintBacklog = new SprintBacklog();
    sprintBacklog.sprint = sprint;
    sprintBacklog.project = project;
    sprintBacklog.issues = [];

    if (issues.length > 0) {
      for (const issue of issues) {
        const issueEntity = await issueRepo.findOne({
          where: { id: issue.id },
        });
        if (!issueEntity) {
          throw new RpcException({
            status: HttpStatus.NOT_FOUND,
            message: 'Issue no encontrado',
          });
        }
        sprintBacklog.issues.push(issueEntity);
      }
    }

    return sprintBacklogRepo.save(sprintBacklog);
  }

  async createSprint(createSprintDto: CreateSprintDto): Promise<Sprint> {
    const { name, goal, projectId } = createSprintDto;
    const queryRunner =
      this.sprintRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const project = await queryRunner.manager.getRepository(Project).findOne({
        where: { id: projectId },
        relations: ['sprint', 'sprint_backlog'],
      });

      if (!project) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Proyecto no encontrado',
        });
      }

      const sprint = new Sprint();
      sprint.name = name;
      sprint.goal = goal;
      sprint.project = project;

      await queryRunner.manager.save(Sprint, sprint);

      await this.createSprintBacklog(
        {
          sprintId: sprint.id,
          projectId: project.id,
          issues: [],
        },
        queryRunner,
      );

      await queryRunner.commitTransaction();
      return sprint;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al crear el sprint',
        error: error.message,
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @description: Inicia un sprint
   * @param sprintId id del sprint
   * @returns sprint iniciado
   */
  async startSprint(sprintId: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['project', 'issues'],
    });

    if (!sprint) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Sprint no encontrado',
      });
    }

    if (sprint.isStarted) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Sprint ya iniciado',
      });
    }

    sprint.startedAt = new Date();
    sprint.isStarted = true;
    const updatedSprint = await this.sprintRepository.save(sprint);

    await this.metricsService.recordSprintMetric(updatedSprint, 'start', 1, {
      plannedStoryPoints: this.calculateTotalStoryPoints(updatedSprint),
      issueCount: updatedSprint.issues?.length || 0,
    });

    return updatedSprint;
  }

  /**
   * Calcula el total de story points planeados para un sprint
   * @param sprint El sprint para calcular
   * @returns Total de story points
   */
  private calculateTotalStoryPoints(sprint: Sprint): number {
    if (!sprint.issues || sprint.issues.length === 0) {
      return 0;
    }

    return sprint.issues.reduce(
      (total, issue) => total + (issue.story_points || 0),
      0,
    );
  }

  async getSprint(sprintId: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['project', 'sprint_backlog'],
    });

    if (!sprint) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Sprint no encontrado',
      });
    }

    return sprint;
  }

  async getSprintBacklog(sprintId: string): Promise<SprintBacklog> {
    const sprintBacklog = await this.sprintBacklogRepository.findOne({
      where: { sprint: { id: sprintId } },
    });

    if (!sprintBacklog) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Sprint backlog no encontrado',
      });
    }

    return sprintBacklog;
  }

  /**
   * @description: Obtener las issues de un sprint backlog
   * @param sprintId id del sprint
   * @param pagination opciones de paginación
   * @param filters filtros para las issues
   * @returns issues del sprint backlog
   */
  async getSprintBacklogIssues(
    sprintId: string,
    pagination?: { page?: number; limit?: number },
    filters?: { status?: string; type?: string },
  ): Promise<{ issues: Issue[]; total: number }> {
    const query = this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin('issue.sprint_backlog', 'sprint_backlog')
      .innerJoin('sprint_backlog.sprint', 'sprint')
      .leftJoinAndSelect('issue.epic', 'epic')
      .where('sprint.id = :sprintId', { sprintId })
      .andWhere('issue.isDeleted = :isDeleted', { isDeleted: false });


    if (filters?.status) {
      query.andWhere('issue.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('issue.type = :type', { type: filters.type });
    }

    const total = await query.getCount();

    if (pagination) {
      const { page = 1, limit = 10 } = pagination;
      query.skip((page - 1) * limit).take(limit);
    }

    const issues = await query.getMany();
    console.log("issues", issues);

    return { issues, total };
  }

  /**
   * @description Completa un sprint y crea uno nuevo con las historias de usuario incompletas
   * @param sprintId ID del sprint a completar
   * @param newSprintData Datos para el nuevo sprint
   * @returns El nuevo sprint creado
   */
  async completeSprint(
    sprintId: string,
    newSprintData?: { name?: string; goal?: string },
  ): Promise<Sprint> {
    const queryRunner =
      this.sprintRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const currentSprint = await this.sprintRepository.findOne({
        where: { id: sprintId },
        relations: ['project', 'issues'],
      });

      if (!currentSprint) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Sprint no encontrado',
        });
      }

      currentSprint.isFinished = true;
      currentSprint.fnishedAt = new Date();
      await queryRunner.manager.save(Sprint, currentSprint);

      const sprintCount = await this.sprintRepository.count({
        where: { project: { id: currentSprint.project.id } },
      });

      const newSprintName = newSprintData?.name || `Sprint ${sprintCount + 1}`;
      const newSprintGoal = newSprintData?.goal || '';

      const newSprint = new Sprint();
      newSprint.name = newSprintName;
      newSprint.goal = newSprintGoal;
      newSprint.project = currentSprint.project;
      newSprint.isStarted = false;
      newSprint.isFinished = false;
      newSprint.startedAt = new Date();

      const currentSprintDuration = this.calculateSprintDuration(currentSprint);
      newSprint.fnishedAt = new Date(
        newSprint.startedAt.getTime() +
          currentSprintDuration * 24 * 60 * 60 * 1000,
      );
      await queryRunner.manager.save(Sprint, newSprint);

      const newSprintBacklog = new SprintBacklog();
      newSprintBacklog.sprint = newSprint;
      newSprintBacklog.project = currentSprint.project;
      await queryRunner.manager.save(SprintBacklog, newSprintBacklog);

      const incompleteIssues = currentSprint.issues.filter((issue) =>
        ['to-do', 'in-progress', 'review'].includes(issue.status),
      );

      for (const issue of incompleteIssues) {
        issue.sprint = newSprint;
        issue.sprint_backlog = newSprintBacklog;
        await queryRunner.manager.save(Issue, issue);
      }

      await queryRunner.commitTransaction();

      await this.metricsService.calculateSprintVelocity(currentSprint);
      await this.metricsService.calculateSprintCompletionRate(currentSprint);

      const sprintDuration = this.calculateSprintDuration(currentSprint);
      await this.metricsService.recordSprintMetric(
        currentSprint,
        'duration',
        sprintDuration,
        {
          startDate: currentSprint.startedAt,
          endDate: currentSprint.fnishedAt,
        },
      );

      return newSprint;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al completar el sprint',
        error: error.message,
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calcula la duración del sprint en días
   * @param sprint El sprint a calcular
   * @returns Duración en días
   */
  private calculateSprintDuration(sprint: Sprint): number {
    if (!sprint.startedAt || !sprint.fnishedAt) {
      return 0;
    }
    const startDate = new Date(sprint.startedAt);
    const endDate = new Date(sprint.fnishedAt);
    const durationMs = endDate.getTime() - startDate.getTime();
    return Math.ceil(durationMs / (1000 * 60 * 60 * 24));
  }

  /**
   * @description Añade historias de usuario al sprint backlog
   * @param sprintId ID del sprint
   * @param issueIds IDs de las historias de usuario a añadir
   * @returns El sprint actualizado con las nuevas historias
   */
  async addIssuesToSprint(
    sprintId: string,
    issueIds: string[],
  ): Promise<Sprint> {
    const queryRunner =
      this.sprintRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const sprint = await this.sprintRepository.findOne({
        where: { id: sprintId },
        relations: ['project', 'issues'],
      });

      if (!sprint) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Sprint no encontrado',
        });
      }

      if (sprint.isFinished) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'No se pueden añadir historias a un sprint finalizado',
        });
      }

      const issues = await this.issueRepository
        .createQueryBuilder('issue')
        .whereInIds(issueIds)
        .getMany();

      if (issues.length !== issueIds.length) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Una o más historias de usuario no existen',
        });
      }

      for (const issue of issues) {
        const existingAssignment = await this.issueRepository.findOne({
          where: {
            id: issue.id,
            sprint: {
              isFinished: false,
            },
          },
          relations: ['sprint'],
        });

        if (
          existingAssignment &&
          existingAssignment.sprint &&
          existingAssignment.sprint.id !== sprintId
        ) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: `La historia ${issue.title} ya está asignada a otro sprint activo`,
          });
        }

        issue.sprint = sprint;
        await queryRunner.manager.save(Issue, issue);
      }

      // 4. Actualizar el sprint backlog
      const sprintBacklog = await this.sprintBacklogRepository.findOne({
        where: { sprint: { id: sprintId } },
      });

      if (!sprintBacklog) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Sprint backlog no encontrado',
        });
      }

      await queryRunner.commitTransaction();

      // 5. Obtener el sprint actualizado con todas sus historias
      const updatedSprint = await this.sprintRepository.findOne({
        where: { id: sprintId },
        relations: ['issues'],
      });

      if (!updatedSprint) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Sprint no encontrado después de la actualización',
        });
      }

      return updatedSprint;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al añadir historias al sprint',
        error: error.message,
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene las métricas de un sprint específico
   * @param sprintId ID del sprint
   * @param metricType Tipo de métrica (opcional)
   * @returns Las métricas del sprint
   */
  async getSprintMetrics(sprintId: string, metricType?: string) {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Sprint no encontrado',
      });
    }

    return this.metricsService.getSprintMetrics(sprintId, metricType);
  }

  /**
   * Obtiene las métricas de un proyecto específico
   * @param projectId ID del proyecto
   * @param metricType Tipo de métrica (opcional)
   * @returns Las métricas del proyecto
   */
  async getProjectMetrics(projectId: string, metricType?: string) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Proyecto no encontrado',
      });
    }

    return this.metricsService.getProjectMetrics(projectId, metricType);
  }

  /**
   * Genera un reporte de sprint con todas las métricas relevantes
   * @param sprintId ID del sprint
   * @returns El reporte del sprint
   */
  async generateSprintReport(sprintId: string) {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['project', 'issues'],
    });

    if (!sprint) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Sprint no encontrado',
      });
    }

    // Calcular todas las métricas relevantes
    const velocityMetric =
      await this.metricsService.calculateSprintVelocity(sprint);
    const completionRateMetric =
      await this.metricsService.calculateSprintCompletionRate(sprint);

    // Si el sprint está completado, calcular la duración
    let durationValue = 0;
    if (sprint.isFinished && sprint.startedAt && sprint.fnishedAt) {
      const duration = this.calculateSprintDuration(sprint);
      const durationMetric = await this.metricsService.recordSprintMetric(
        sprint,
        'duration',
        duration,
        { startDate: sprint.startedAt, endDate: sprint.fnishedAt },
      );
      durationValue = durationMetric.value;
    }

    // Estadísticas de issues por estado
    const issuesByStatus: Record<string, number> = {
      'to-do': 0,
      'in-progress': 0,
      review: 0,
      resolved: 0,
      closed: 0,
    };

    if (sprint.issues && sprint.issues.length > 0) {
      sprint.issues.forEach((issue) => {
        if (issue.status in issuesByStatus) {
          issuesByStatus[issue.status]++;
        }
      });
    }

    return {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        isStarted: sprint.isStarted,
        isFinished: sprint.isFinished,
        startedAt: sprint.startedAt,
        finishedAt: sprint.fnishedAt,
      },
      metrics: {
        velocity: velocityMetric.value,
        completionRate: completionRateMetric.value,
        duration: durationValue,
      },
      issueStats: {
        total: sprint.issues?.length || 0,
        byStatus: issuesByStatus,
      },
      recordedAt: new Date(),
    };
  }

  /**
   * Registra una métrica manual para un sprint
   * @param sprint El sprint para el que se registra la métrica
   * @param metricType Tipo de métrica a registrar
   * @param value Valor de la métrica
   * @param additionalData Datos adicionales opcionales
   * @returns La métrica registrada
   */
  async recordSprintMetric(
    sprint: Sprint,
    metricType: string,
    value: number,
    additionalData?: Record<string, any>,
  ) {
    return this.metricsService.recordSprintMetric(
      sprint,
      metricType,
      value,
      additionalData,
    );
  }

  /**
   * Get the transition history of an issue between sprints
   * @param issueId ID of the issue
   * @returns Array of transitions
   */
  async getIssueTransitionHistory(issueId: string): Promise<IssueTransition[]> {
    return this.issueTransitionRepository.find({
      where: { issueId },
      relations: ['fromSprint', 'toSprint'],
      order: { transitionDate: 'DESC' },
    });
  }

  /**
   * Get all issues that were moved from one sprint to another
   * @param fromSprintId Source sprint ID
   * @param toSprintId Target sprint ID
   * @returns Array of transitions
   */
  async getSprintTransitionIssues(
    fromSprintId: string,
    toSprintId: string,
  ): Promise<IssueTransition[]> {
    return this.issueTransitionRepository.find({
      where: { fromSprintId, toSprintId },
      relations: ['issue', 'fromSprint', 'toSprint'],
      order: { transitionDate: 'DESC' },
    });
  }

  /**
   * Calculate the total story points of pending work moved between sprints
   * @param fromSprintId Source sprint ID
   * @param toSprintId Target sprint ID
   * @returns Total story points of moved issues
   */
  async calculateMovedWorkStoryPoints(
    fromSprintId: string,
    toSprintId: string,
  ): Promise<number> {
    const transitions = await this.issueTransitionRepository.find({
      where: { fromSprintId, toSprintId },
    });

    return transitions.reduce((total, transition) => {
      return total + (transition.storyPoints ?? 0);
    }, 0);
  }

  /**
   * Obtiene todos los sprints de un proyecto
   * @param projectId ID del proyecto
   * @author Kevin
   * @returns Lista de sprints
   */
  async getProjectSprints(projectId: string) {
    try {
      const sprints = await this.sprintRepository.find({
        where: {
          project: { id: projectId },
          isFinished: false
        },
        relations: ['project'],
      });

      if (!sprints) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'No se encontraron sprints para este proyecto',
        });
      }

      const sprintsWithIssues = await Promise.all(
        sprints.map(async (sprint) => {
          const { issues } = await this.getSprintBacklogIssues(sprint.id);
          return {
            ...sprint,
            issues,
            status: sprint.isStarted ? 'active' : 'inactive'
          };
        })
      );

      return sprintsWithIssues;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener los sprints del proyecto',
        error: error.message,
      });
    }
  }
}
