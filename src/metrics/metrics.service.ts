import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue } from '../issues/entities/issue.entity';
import { Project } from '../projects/entities/project.entity';
import { Sprint } from '../sprint-backlog/entities/sprint.entity';
import { IssueMetric } from './entities/issue-metric.entity';
import { ProjectMetric } from './entities/project-metric.entity';
import { SprintMetric } from './entities/sprint-metric.entity';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(SprintMetric)
    private readonly sprintMetricRepository: Repository<SprintMetric>,
    @InjectRepository(ProjectMetric)
    private readonly projectMetricRepository: Repository<ProjectMetric>,
    @InjectRepository(IssueMetric)
    private readonly issueMetricRepository: Repository<IssueMetric>,
  ) {}

  /**
   * Registra una métrica relacionada con un sprint
   * @param sprint El sprint relacionado
   * @param metricType Tipo de métrica (velocidad, burndown, etc.)
   * @param value Valor de la métrica
   * @param additionalData Datos adicionales opcionales
   * @returns La métrica registrada
   */
  async recordSprintMetric(
    sprint: Sprint,
    metricType: string,
    value: number,
    additionalData?: Record<string, any>,
  ): Promise<SprintMetric> {
    try {
      const metric = this.sprintMetricRepository.create({
        sprint,
        metricType,
        value,
        additionalData,
      });

      this.logger.log(
        `Registrando métrica de sprint: ${metricType} = ${value} para sprint ${sprint.id}`,
      );
      return await this.sprintMetricRepository.save(metric);
    } catch (error) {
      this.logger.error(
        `Error al registrar métrica de sprint: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Registra una métrica relacionada con un proyecto
   * @param project El proyecto relacionado
   * @param metricType Tipo de métrica (lead time, cycle time, etc.)
   * @param value Valor de la métrica
   * @param additionalData Datos adicionales opcionales
   * @returns La métrica registrada
   */
  async recordProjectMetric(
    project: Project,
    metricType: string,
    value: number,
    additionalData?: Record<string, any>,
  ): Promise<ProjectMetric> {
    try {
      const metric = this.projectMetricRepository.create({
        project,
        metricType,
        value,
        additionalData,
      });

      this.logger.log(
        `Registrando métrica de proyecto: ${metricType} = ${value} para proyecto ${project.id}`,
      );
      return await this.projectMetricRepository.save(metric);
    } catch (error) {
      this.logger.error(
        `Error al registrar métrica de proyecto: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Registra una métrica relacionada con una issue
   * @param issue La issue relacionada
   * @param metricType Tipo de métrica (time to resolution, time in progress, etc.)
   * @param value Valor de la métrica
   * @param additionalData Datos adicionales opcionales
   * @returns La métrica registrada
   */
  async recordIssueMetric(
    issue: Issue,
    metricType: string,
    value: number,
    additionalData?: Record<string, any>,
  ): Promise<IssueMetric> {
    try {
      const metric = this.issueMetricRepository.create({
        issue,
        metricType,
        value,
        additionalData,
      });

      this.logger.log(
        `Registrando métrica de issue: ${metricType} = ${value} para issue ${issue.id}`,
      );
      return await this.issueMetricRepository.save(metric);
    } catch (error) {
      this.logger.error(
        `Error al registrar métrica de issue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calcula la velocidad del sprint (story points completados)
   * @param sprint El sprint a calcular
   * @returns La métrica de velocidad registrada
   */
  async calculateSprintVelocity(sprint: Sprint): Promise<SprintMetric> {
    try {
      // 1. Obtener todas las issues completadas del sprint
      const completedIssues =
        sprint.issues?.filter((issue) =>
          ['resolved', 'closed'].includes(issue.status),
        ) || [];

      // 2. Sumar los story points
      const totalStoryPoints = completedIssues.reduce(
        (sum, issue) => sum + (issue.story_points || 0),
        0,
      );

      // 3. Registrar la métrica de velocidad
      return this.recordSprintMetric(sprint, 'velocity', totalStoryPoints, {
        completedIssuesCount: completedIssues.length,
      });
    } catch (error) {
      this.logger.error(
        `Error al calcular velocidad del sprint: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calcula la tasa de finalización del sprint (% de issues completadas)
   * @param sprint El sprint a calcular
   * @returns La métrica de tasa de finalización registrada
   */
  async calculateSprintCompletionRate(sprint: Sprint): Promise<SprintMetric> {
    try {
      if (!sprint.issues || sprint.issues.length === 0) {
        return this.recordSprintMetric(sprint, 'completion-rate', 0);
      }

      const totalIssues = sprint.issues.length;
      const completedIssues = sprint.issues.filter((issue) =>
        ['resolved', 'closed'].includes(issue.status),
      ).length;

      const completionRate = (completedIssues / totalIssues) * 100;

      return this.recordSprintMetric(
        sprint,
        'completion-rate',
        completionRate,
        { totalIssues, completedIssues },
      );
    } catch (error) {
      this.logger.error(
        `Error al calcular tasa de finalización: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calcula el tiempo promedio de resolución de issues en un proyecto
   * @param project El proyecto a analizar
   * @returns La métrica registrada
   */
  async calculateAverageResolutionTime(
    project: Project,
  ): Promise<ProjectMetric> {
    try {
      const avgResolutionTime = 0;

      return this.recordProjectMetric(
        project,
        'avg-resolution-time',
        avgResolutionTime,
      );
    } catch (error) {
      this.logger.error(
        `Error al calcular tiempo promedio de resolución: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene las métricas de un sprint específico
   * @param sprintId ID del sprint
   * @param type Tipo de métrica (opcional)
   * @returns Lista de métricas
   */
  async getSprintMetrics(
    sprintId: string,
    type?: string,
  ): Promise<SprintMetric[]> {
    const query = this.sprintMetricRepository
      .createQueryBuilder('metric')
      .innerJoin('metric.sprint', 'sprint')
      .where('sprint.id = :sprintId', { sprintId });

    if (type) {
      query.andWhere('metric.metricType = :type', { type });
    }

    return query.orderBy('metric.recordedAt', 'DESC').getMany();
  }

  /**
   * Obtiene las métricas de un proyecto específico
   * @param projectId ID del proyecto
   * @param type Tipo de métrica (opcional)
   * @returns Lista de métricas
   */
  async getProjectMetrics(
    projectId: string,
    type?: string,
  ): Promise<ProjectMetric[]> {
    const query = this.projectMetricRepository
      .createQueryBuilder('metric')
      .innerJoin('metric.project', 'project')
      .where('project.id = :projectId', { projectId });

    if (type) {
      query.andWhere('metric.metricType = :type', { type });
    }

    return query.orderBy('metric.recordedAt', 'DESC').getMany();
  }

  /**
   * Calcula las métricas diarias para todos los sprints activos
   * Este método debe ser ejecutado por un cron job una vez al día
   */
  async calculateDailyMetricsForAllSprints() {
    try {
      this.logger.log(
        'Comenzando cálculo de métricas diarias para todos los sprints activos',
      );

      const activeSprintsQuery = `
        SELECT s.id 
        FROM sprint s
        WHERE s."isStarted" = true 
        AND s."isFinished" = false
      `;

      const activeSprintsResult =
        await this.sprintMetricRepository.query(activeSprintsQuery);
      const sprintIds = activeSprintsResult.map((result) => result.id);

      this.logger.log(`Encontrados ${sprintIds.length} sprints activos`);

      for (const sprintId of sprintIds) {
        try {
          const sprintRepository =
            this.sprintMetricRepository.manager.getRepository(Sprint);
          const sprint = await sprintRepository.findOne({
            where: { id: sprintId },
            relations: ['issues', 'project'],
          });

          if (!sprint) {
            this.logger.warn(
              `No se pudo encontrar el sprint con ID ${sprintId}`,
            );
            continue;
          }

          await this.calculateSprintVelocity(sprint);
          await this.calculateSprintCompletionRate(sprint);

          const pendingIssues =
            sprint.issues?.filter(
              (issue) => !['resolved', 'closed'].includes(issue.status),
            ) || [];

          const pendingStoryPoints = pendingIssues.reduce(
            (sum, issue) => sum + (issue.story_points || 0),
            0,
          );

          await this.recordSprintMetric(
            sprint,
            'burndown',
            pendingStoryPoints,
            {
              date: new Date(),
              pendingIssues: pendingIssues.length,
              totalIssues: sprint.issues?.length || 0,
            },
          );

          this.logger.log(
            `Métricas diarias calculadas para sprint ${sprint.id} - ${sprint.name}`,
          );
        } catch (error) {
          this.logger.error(
            `Error al calcular métricas para sprint ${sprintId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log('Cálculo de métricas diarias completado');

      return {
        success: true,
        sprintsProcessed: sprintIds.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error al calcular métricas diarias: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
