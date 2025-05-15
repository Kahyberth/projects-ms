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
    filters?: { status?: string },
  ): Promise<Issue[]> {
    const query = this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin('issue.product_backlog', 'backlog')
      .where('backlog.id = :backlogId', { backlogId })
      .andWhere('issue.isDeleted = :isDeleted', { isDeleted: false });

    if (filters?.status) {
      query.andWhere('issue.status = :status', { status: filters.status });
    }

    return query.orderBy('issue.story_points', 'DESC').getMany();
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
}
