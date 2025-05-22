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
import { SprintBacklog } from 'src/sprint-backlog/entities/sprint.backlog.entity';

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
        message: 'Product backlog no encontrado',
      });
    }

    const issue = this.issueRepository.create({
      ...createIssueDto,
      status: 'to-do',
      in_product_backlog: true,
      in_sprint: false,
      product_backlog: productBacklog,
    });

    await this.issueRepository.save(issue);
    return issue;
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
      .where('backlog.id = :backlogId', { backlogId });

    if (filters?.status) {
      query.andWhere('issue.status = :status', { status: filters.status });
    }

    return query.orderBy('issue.story_points', 'DESC').getMany();
  }

  /**
   * Actualiza el orden de las issues de un product backlog
   * @param updateOrderDto dto con el id de la issue y el nuevo orden
   * @returns issue actualizada
   */
  async updateIssueOrder(updateOrderDto: UpdateIssueDto): Promise<Issue> {
    await this.issueRepository.update(
      { id: updateOrderDto.issueId },
      { story_points: updateOrderDto.newPriority },
    );
    const issue = await this.issueRepository.findOne({
      where: { id: updateOrderDto.issueId },
    });
    if (!issue) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Issue no encontrado',
      });
    }
    return issue;
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

      // Quitar del product backlog
      issue.product_backlog = null;
      issue.in_product_backlog = false;

      // Buscar o crear el sprint backlog correcto
      let sprintBacklog = await manager.findOne(SprintBacklog, { where: { sprint: { id: sprintId } }, relations: ['sprint'] });
      if (!sprintBacklog) {
        const sprint = await manager.findOne(Sprint, { where: { id: sprintId } });
        if (!sprint) throw new RpcException({ status: 404, message: 'Sprint no encontrado' });
        sprintBacklog = manager.create(SprintBacklog, { sprint });
        await manager.save(SprintBacklog, sprintBacklog);
      }

      // Validar si la issue ya está en el sprint backlog destino
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

      // Validar si ya está en el product backlog destino
      if (issue.product_backlog && issue.product_backlog.id === productBacklogId) {
        throw new RpcException({
          status: 400,
          message: 'La historia de usuario ya se encuentra en el product backlog',
        });
      }

      // Validar que esté en un sprint backlog antes de moverla
      if (!issue.sprint_backlog) {
        throw new RpcException({
          status: 400,
          message: 'La historia de usuario no está en ningún sprint backlog',
        });
      }

      // Validar si el sprint ya está iniciado
      if (issue.sprint_backlog.sprint && issue.sprint_backlog.sprint.isStarted) {
        throw new RpcException({
          status: 400,
          message: 'No se puede mover la historia de usuario al product backlog porque el sprint ya ha iniciado',
        });
      }

      // Quitar del sprint backlog
      issue.sprint_backlog = null;
      issue.in_sprint = false;
      issue.sprint = null;

      // Asignar al product backlog correcto
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
}
