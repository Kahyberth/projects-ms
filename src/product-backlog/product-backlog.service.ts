import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateIssueDto } from 'src/issues/dto/create-issue.dto';
import { UpdateIssueDto } from 'src/issues/dto/update-issue.dto';
import { Issue } from 'src/issues/entities/issue.entity';
import { Project } from 'src/projects/entities/project.entity';
import { Sprint } from 'src/sprint-backlog/entities/sprint.entity';
import { EntityManager, Repository } from 'typeorm';
import { ProductBacklog } from './entities/product-backlog.entity';
import { CreateProductBacklogDto } from './dto/create-product-backlog.dto';
import { UpdateProductBacklogDto } from './dto/update-product-backlog.dto';
import { IsNull, Like } from 'typeorm';

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
  ) {}

  async create(createProductBacklogDto: CreateProductBacklogDto) {
    const productBacklog = this.productBacklogRepository.create(
      createProductBacklogDto,
    );
    return await this.productBacklogRepository.save(productBacklog);
  }

  async findAll() {
    return await this.productBacklogRepository.find();
  }

  async findOne(id: string) {
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

  async update(id: string, updateProductBacklogDto: UpdateProductBacklogDto) {
    const productBacklog = await this.findOne(id);

    Object.assign(productBacklog, updateProductBacklogDto);
    return await this.productBacklogRepository.save(productBacklog);
  }

  async remove(id: string) {
    const productBacklog = await this.findOne(id);
    return await this.productBacklogRepository.remove(productBacklog);
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
    filters?: { page?: number; limit?: number }
  ): Promise<{ issues: Issue[]; total: number }> {
    try {
      console.log('Service received filters:', filters);
      
      // Build base query
      const query: any = {
        where: { 
          product_backlog: { id: backlogId },
          isDeleted: false,
          sprint: IsNull()
        }
      };
      
      // Get total count
      const total = await this.issueRepository.count({
        where: query.where
      });
      
      console.log('Total issues:', total);
      
      // Apply pagination if provided
      if (filters?.page && filters?.limit) {
        query.skip = (filters.page - 1) * filters.limit;
        query.take = filters.limit;
      }
      
      // Execute query
      const issues = await this.issueRepository.find({
        ...query,
        relations: ['product_backlog', 'sprint']
      });
      
      console.log(`Found ${issues.length} issues for page ${filters?.page || 1}`);
      
      return { issues, total };
    } catch (error) {
      console.error('Error in getBacklogIssues:', error);
      throw new Error(`Failed to get backlog issues: ${error.message}`);
    }
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
    return await this.entityManager.transaction(
      async (transactionalEntityManager) => {
        const issue = await transactionalEntityManager.findOne(Issue, {
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

        const productBacklog = await transactionalEntityManager.findOne(
          ProductBacklog,
          {
            where: { id: issue.product_backlog.id },
          },
        );

        if (!productBacklog) {
          throw new RpcException({
            status: HttpStatus.NOT_FOUND,
            message: 'Product backlog no encontrado',
          });
        }

        productBacklog.issues = productBacklog.issues.filter(
          (i) => i.id !== issueId,
        );
        await transactionalEntityManager.save(ProductBacklog, productBacklog);

        const sprint = await transactionalEntityManager.findOne(Sprint, {
          where: { id: sprintId },
        });

        if (!sprint) {
          throw new RpcException({
            status: HttpStatus.NOT_FOUND,
            message: 'Sprint no encontrado',
          });
        }

        issue.sprint = sprint;
        await transactionalEntityManager.save(Issue, issue);

        return issue;
      },
    );
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
    console.log(`Backend: Getting stats for project: ${projectId}`);
    
    try {
      // Primero, obtenemos el backlog del proyecto
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['backlog'],
      });

      if (!project || !project.backlog) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Proyecto o backlog no encontrado',
        });
      }

      // Consultamos todos los issues del backlog sin paginación
      const backlogId = project.backlog.id;
      
      // Query para contar el total de issues
      const totalCount = await this.issueRepository
        .createQueryBuilder('issue')
        .innerJoin('issue.product_backlog', 'backlog')
        .where('backlog.id = :backlogId', { backlogId })
        .andWhere('issue.isDeleted = :isDeleted', { isDeleted: false })
        .getCount();
      
      // Query para contar los issues completados
      const completedCount = await this.issueRepository
        .createQueryBuilder('issue')
        .innerJoin('issue.product_backlog', 'backlog')
        .where('backlog.id = :backlogId', { backlogId })
        .andWhere('issue.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere('issue.status IN (:...completedStatuses)', { 
          completedStatuses: ['done', 'closed'] 
        })
        .getCount();
      
      // Calcular el porcentaje de progreso
      const progress = totalCount > 0 
        ? Math.round((completedCount / totalCount) * 100) 
        : 0;
      
      console.log(`Backend: Project ${projectId} stats - Total: ${totalCount}, Completed: ${completedCount}, Progress: ${progress}%`);
      
      return {
        total: totalCount,
        completed: completedCount,
        progress
      };
    } catch (error) {
      console.error(`Error getting project stats:`, error);
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
