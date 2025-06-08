import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateIssueDto } from '../issues/dto/create-issue.dto';
import { Issue } from '../issues/entities/issue.entity';
import { Project } from '../projects/entities/project.entity';
import { Sprint } from '../sprint-backlog/entities/sprint.entity';
import { EntityManager, Repository } from 'typeorm';
import { ProductBacklog } from './entities/product-backlog.entity';
import { SprintBacklog } from '../sprint-backlog/entities/sprint.backlog.entity';
import { issuesService } from '../issues/issues.service';
import { Epic } from '../issues/entities/epic.entity';

@Injectable()
export class ProductBacklogService {
  private readonly logger = new Logger(ProductBacklogService.name);
  constructor(
    @InjectRepository(ProductBacklog)
    private readonly productBacklogRepository: Repository<ProductBacklog>,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    private readonly entityManager: EntityManager,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(SprintBacklog)
    private readonly sprintBacklogRepository: Repository<SprintBacklog>,
    @InjectRepository(Epic)
    private readonly epicRepository: Repository<Epic>,
  ) {}

  /**
   * Agrega una issue a un product backlog
   * @param createIssueDto dto con la issue
   * @returns issue agregada
   */
  async addIssueToBacklog(
    createIssueDto: CreateIssueDto,
    productBacklogId: string,
  ): Promise<Issue> {
    const productBacklog = await this.productBacklogRepository.findOne({
      where: { id: productBacklogId },
    });
  
    if (!productBacklog) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Product backlog not found',
      });
    }


    let epic: Epic | null = null;
    if (createIssueDto.epicId) {
      
      epic = await this.epicRepository.findOne({
        where: { id: createIssueDto.epicId },
      });

      if (!epic) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Epic not found',
        });
      }
    }
    const issue = this.issueRepository.create({
      ...createIssueDto,
      status: 'to-do',
      in_product_backlog: true,
      in_sprint: false,
      product_backlog: productBacklog,
      code: await this.generateIssueCode(productBacklogId),
      epic: epic,
    });

    await this.issueRepository.save(issue);
    return issue;
  }



   /**
   * Generate a sequential issue code based on project key
   * @param productBacklogId Project ID to get the key
   * @returns Generated issue code
   */
   private async generateIssueCode(productBacklogId: string): Promise<string> {
    try {
      const project = await this.projectRepository.findOne({
        where: { backlog: { id: productBacklogId } }
      });

      if (!project) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Project not found for backlog ${productBacklogId}`,
        });
      }

      const projectKey = project.project_key;
      const issues = await this.issueRepository.find({
        where: { 
          product_backlog: { id: productBacklogId }
        }
      });

      let maxNumber = 0;
      issues.forEach(issue => {
        if (issue.code && issue.code.startsWith(`${projectKey}-`)) {
          const numberStr = issue.code.substring(projectKey.length + 1);
          const number = parseInt(numberStr, 10);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `${projectKey}-${nextNumber}`;
    } catch (error) {
      this.logger.error(`Error generating issue code: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Elimina una issue de un product backlog
   * @param issueId id de la issue
   * @returns issue eliminada
   */
  async removeIssueFromBacklog(issueId: string): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
    });
    if (!issue) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Issue no encontrado',
      });
    }

    if (!issue.product_backlog) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Issue no tiene un product backlog asignado',
      });
    }

    const productBacklog = await this.productBacklogRepository.findOne({
      where: { id: issue.product_backlog.id },
      relations: ['issues'],
    });

    if (!productBacklog) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Product backlog no encontrado',
      });
    }

    productBacklog.issues = productBacklog.issues.filter(
      (i) => i.id !== issueId,
    );
    await this.productBacklogRepository.save(productBacklog);

    issue.product_backlog = null;
    await this.issueRepository.save(issue);
    return issue;
  }

  /**
   * Obtiene las issues de un product backlog
   * @param backlogId id del product backlog
   * @param filters filtros para obtener las issues
   * @returns issues del product backlog
   */
  async getBacklogIssues(
    backlogId: string,
    filters?: { status?: string },
  ): Promise<Issue[]> {
    const query = this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin('issue.product_backlog', 'backlog')
      .leftJoinAndSelect('issue.epic', 'epic')
      .where('backlog.id = :backlogId', { backlogId })
      .andWhere('issue.isDeleted = :isDeleted', { isDeleted: false });
  
    if (filters?.status) {
      query.andWhere('issue.status = :status', { status: filters.status });
    }
    
    const issues = await query.orderBy('issue.story_points', 'DESC').getMany();
    console.log("issues with epic", issues);
    return issues;
  }

  
  /**
   * Busca issues en un product backlog
   * @param backlogId id del product backlog
   * @param criteria filtros para buscar las issues
   * @returns issues encontradas
   */
  async searchIssues(
    backlogId: string,
    criteria: { epicId?: string; type?: string },
  ): Promise<Issue[]> {
    const query = this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin('issue.product_backlog', 'backlog')
      .where('backlog.id = :backlogId', { backlogId });

    if (criteria.epicId) {
      query.andWhere('issue.epicId = :epicId', { epicId: criteria.epicId });
    }
    if (criteria.type) {
      query.andWhere('issue.type = :type', { type: criteria.type });
    }

    return query.getMany();
  }

  /**
   * Mueve una issue a un sprint
   * @param issueId id de la issue
   * @param sprintId id del sprint
   * @returns issue actualizada
   */
  async moveIssueToSprint(issueId: string, sprintId: string): Promise<Issue> {
    return await this.entityManager.transaction(async (manager) => {
      const issue = await manager.findOne(Issue, { where: { id: issueId }, relations: ['product_backlog', 'sprint_backlog'] });
      if (!issue) throw new RpcException({ status: 404, message: 'Issue no encontrada' });

      issue.product_backlog = null;
      issue.in_product_backlog = false;

      let sprintBacklog = await manager.findOne(SprintBacklog, { where: { sprint: { id: sprintId } }, relations: ['sprint'] });
      if (!sprintBacklog) {
        const sprint = await manager.findOne(Sprint, { where: { id: sprintId } });
        if (!sprint) throw new RpcException({ status: 404, message: 'Sprint no encontrado' });
        sprintBacklog = manager.create(SprintBacklog, { sprint });
        await manager.save(SprintBacklog, sprintBacklog);
      }


      if (issue.sprint_backlog && issue.sprint_backlog.id === sprintBacklog.id) {
        throw new RpcException({
          status: 400,
          message: 'La historia de usuario ya se encuentra en el sprint backlog',
        });
      }

      issue.sprint_backlog = sprintBacklog;
      issue.sprint = sprintBacklog.sprint;
      issue.in_sprint = true;
      
      await manager.save(Issue, issue);
      return issue;
    });
  }

  /**
   * Mueve una issue del sprint al product backlog
   * @param issueId id de la issue
   * @param productBacklogId id del product backlog destino
   * @returns issue actualizada
   */
  async moveIssueToBacklog(issueId: string, productBacklogId: string): Promise<Issue> {
    return await this.entityManager.transaction(async (manager) => {
      const issue = await manager.findOne(Issue, { where: { id: issueId }, relations: ['product_backlog', 'sprint_backlog', 'sprint_backlog.sprint'] });
      if (!issue) throw new RpcException({ status: 404, message: 'Issue no encontrada' });

      if (issue.product_backlog && issue.product_backlog.id === productBacklogId) {
        throw new RpcException({
          status: 400,
          message: 'La historia de usuario ya se encuentra en el product backlog',
        });
      }


      if (!issue.sprint_backlog) {
        throw new RpcException({
          status: 400,
          message: 'La historia de usuario no está en ningún sprint backlog',
        });
      }

 
      if (issue.sprint_backlog.sprint && issue.sprint_backlog.sprint.isStarted) {
        throw new RpcException({
          status: 400,
          message: 'No se puede mover la historia de usuario al product backlog porque el sprint ya ha iniciado',
        });
      }


      issue.sprint_backlog = null;
      issue.in_sprint = false;
      issue.sprint = null;


      const productBacklog = await manager.findOne(ProductBacklog, { where: { id: productBacklogId } });
      if (!productBacklog) throw new RpcException({ status: 404, message: 'Product backlog no encontrado' });

      issue.product_backlog = productBacklog;
      issue.in_product_backlog = true;

      await manager.save(Issue, issue);
      return issue;
    });
  }

  /**
   * Obtiene un product backlog por su id
   * @param id id del product backlog
   * @returns product backlog
   */
  async getProductBacklog(id: string): Promise<ProductBacklog> {
    const productBacklog = await this.productBacklogRepository.findOne({
      where: { id },
    });
    if (!productBacklog) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Product backlog no encontrado',
      });
    }
    return productBacklog;
  }

  /**
   * Obtiene un product backlog por su id de proyecto
   * @param projectId id del proyecto
   * @returns product backlog
   */

  async getProductBacklogByProjectId(
    projectId: string,
  ): Promise<ProductBacklog> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['backlog'],
    });

    if (!project) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Project no encontrado',
      });
    }

    return project.backlog;
  }

  /**
   * Obtiene estadísticas de progreso del proyecto
   * @param projectId ID del proyecto
   * @returns Estadísticas de progreso: total de issues, completados y porcentaje
   */
  async getProjectStats(
    projectId: string,
  ): Promise<{ total: number; completed: number; progress: number }> {
    
    try {
      // Verificamos que el proyecto exista
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['backlog']
      });

      if (!project) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Proyecto no encontrado',
        });
      }

      
      // 1. Obtener issues del backlog del proyecto
      let allIssues: Issue[] = [];
      
      if (project.backlog) {
        const backlogIssues = await this.issueRepository.find({
          where: {
            product_backlog: { id: project.backlog.id },
            isDeleted: false
          }
        });
        allIssues = [...backlogIssues];
      }
      
      // 2. Obtener issues de los sprints del proyecto
      const sprints = await this.sprintRepository.find({
        where: { project: { id: projectId } }
      });
      
      for (const sprint of sprints) {
        const sprintIssues = await this.issueRepository.find({
          where: {
            sprint: { id: sprint.id },
            isDeleted: false
          }
        });
        
        // Agregamos solo issues que no están ya en la lista (para evitar duplicados)
        for (const issue of sprintIssues) {
          if (!allIssues.some(existingIssue => existingIssue.id === issue.id)) {
            allIssues.push(issue);
          }
        }
      }
      
      // Calculamos estadísticas basadas en las issues recopiladas
      const totalCount = allIssues.length;
      const completedCount = allIssues.filter(
        issue => issue.status === 'done' || issue.status === 'closed'
      ).length;
      
      const progress = totalCount > 0 
        ? Math.round((completedCount / totalCount) * 100) 
        : 0;
      
      console.log(`Project ${projectId} stats - Total: ${totalCount}, Completed: ${completedCount}, Progress: ${progress}%`);
      
      return {
        total: totalCount,
        completed: completedCount,
        progress
      };
    } catch (error) {
      console.error("Error getting project stats:", error);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener estadísticas del proyecto',
      });
    }
  }
}
