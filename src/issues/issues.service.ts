import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { catchError, firstValueFrom, lastValueFrom, of, timeout } from 'rxjs';
import { Repository, DataSource } from 'typeorm';
import { validate as validateUUID } from 'uuid';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Comments } from './entities/comments.entity';
import { Issue } from './entities/issue.entity';
import { ProductBacklog } from '../product-backlog/entities/product-backlog.entity';
import { User } from 'src/interfaces/user.interface';
import { Members } from '../projects/entities/members.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class issuesService {
  private readonly logger = new Logger(issuesService.name);
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(Comments)
    private readonly commentsRepository: Repository<Comments>,
    @InjectRepository(ProductBacklog)
    private readonly productBacklogRepository: Repository<ProductBacklog>,
    @InjectRepository(Members)
    private readonly membersRepository: Repository<Members>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @Inject('NATS_SERVICE') private readonly client: ClientProxy,
    private readonly dataSource: DataSource,
  ) {}

 
  /**
   * Create a new issue
   * @param payload
   * @returns
   */
  async create(createIssueDto: CreateIssueDto): Promise<Issue> {
    try {
      this.logger.debug(`Creating issue with data: ${JSON.stringify(createIssueDto)}`);
      
      // Verificar que el backlog existe
      const backlog = await this.productBacklogRepository.findOne({
        where: { id: createIssueDto.productBacklogId }
      });

      if (!backlog) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Product backlog with ID ${createIssueDto.productBacklogId} not found`,
        });
      }

      // Verificación de usuarios en paralelo
      this.logger.debug(`Verifying creator: ${createIssueDto.createdBy} and assignee: ${createIssueDto.assignedTo}`);
      const [creatorExists, assigneeExists] = await Promise.all([
        this.verifyUser(createIssueDto.createdBy),
        createIssueDto.assignedTo ? this.verifyUser(createIssueDto.assignedTo) : Promise.resolve(true),
      ]);

      if (!creatorExists) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'El usuario creador no existe',
        });
      }

      if (createIssueDto.assignedTo && !assigneeExists) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'El usuario asignado no existe',
        });
      }

      // Generate issue code automatically
      const issueCode = await this.generateIssueCode(createIssueDto.productBacklogId);

      const newIssue = this.issueRepository.create({
        ...createIssueDto,
        assignedTo: createIssueDto.assignedTo || createIssueDto.createdBy,
        status: createIssueDto.status || 'to-do',
        code: issueCode, // Use the generated code
        priority: createIssueDto.priority || 'medium',
        type: createIssueDto.type || 'user_story',
        story_points: createIssueDto.storyPoints ?? null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        product_backlog: { id: createIssueDto.productBacklogId },
      });

      return await this.issueRepository.save(newIssue);
    } catch (error) {
      this.logger.error(`Error al crear issue: ${error.message}`, error.stack);
      throw error;
    }
  }

   /**
   * Generate a sequential issue code based on project key
   * @param productBacklogId Project ID to get the key
   * @returns Generated issue code
   */
   private async generateIssueCode(productBacklogId: string): Promise<string> {
    try {
      // Get the project associated with this backlog
      const project = await this.projectRepository.findOne({
        where: { backlog: { id: productBacklogId } }
      });

      if (!project) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Project not found for backlog ${productBacklogId}`,
        });
      }

      // Get the project key
      const projectKey = project.project_key;

      // Get all issues for this project's backlog, including deleted ones
      const issues = await this.issueRepository.find({
        where: { 
          product_backlog: { id: productBacklogId }
          // No isDeleted filter to include all issues ever created
        }
      });

      // Find the highest issue number used so far
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

      // Generate the new code with the format PROJECT_KEY-NUMBER
      const nextNumber = maxNumber + 1;
      return `${projectKey}-${nextNumber}`;
    } catch (error) {
      this.logger.error(`Error generating issue code: ${error.message}`, error.stack);
      throw error;
    }
  }


  async findOne(id: string): Promise<Issue> {
    try {
      if (!validateUUID(id)) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'ID inválido',
        });
      }

      const issue = await this.issueRepository.findOne({ 
        where: { id, isDeleted: false } 
      });
      
      if (!issue) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Issue con ID ${id} no encontrado`,
        });
      }
      return issue;
    } catch (error) {
      this.logger.error(`Error al buscar issue ${id}`, error.stack);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al buscar el issue',
      });
    }
  }
  
  /**
   * Obtener issues asignados a un usuario
   * @param userId ID del usuario asignado
   */
  async findIssuesByUser(userId: string): Promise<Issue[]> {
    try {
      const issues = await this.issueRepository.find({
        where: {
          assignedTo: userId,
          isDeleted: false
        },
        order: { createdAt: 'DESC' }
      });

      if (issues.length === 0) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'No se encontraron issues asignados a este usuario',
        });
      }

      return issues;
    } catch (error) {
      this.logger.error(`Error al obtener issues del usuario ${userId}`, error.stack);
      
      // Si ya es un RpcException, lo relanzamos
      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener issues del usuario',
      });
    }
}

  /**
   * Obtener issues de un product backlog (sin filtros adicionales)
   * @param BacklogId ID del product backlog
   */

  ////BORRAR, QUE TRAIGA TODOS LOS ISSUES,AGREGAR FILTROS Y PAGINACIÓN 
  async findIssuesByBacklog(backlogId: string): Promise<Issue[]> {
    try {
      const issues = await this.issueRepository.find({
        where: {
          product_backlog: { id: backlogId },
          isDeleted: false
        },
        order: { createdAt: 'DESC' }
      });

      if (issues.length === 0) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'No se encontraron issues en este product backlog',
        });
      }

      return issues;
    } catch (error) {
      this.logger.error(`Error al obtener issues del backlog ${backlogId}`, error.stack);
      
      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener issues del backlog',
      });
    }
  }

  async update(id: string, updateIssueDto: UpdateIssueDto, userId: string): Promise<Issue> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.debug(`Updating issue ${id} with data: ${JSON.stringify(updateIssueDto)}`);
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id, isDeleted: false },
        relations: ['product_backlog']
      });

      if (!issue) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Issue con ID ${id} no encontrado`,
        });
      }

      if (!issue.product_backlog) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Issue does not have an associated product backlog',
        });
      }

      // Check if the user is a member of the project that owns this issue's product backlog
      const isMember = await queryRunner.manager.findOne(Members, {
        where: { 
          user_id: userId,
          project: {
            backlog: {
              id: issue.product_backlog.id
            }
          }
        },
        relations: ['project', 'project.backlog']
      });

      if (!isMember) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'You are not a member of this project',
        });
      }

      if (updateIssueDto.assignedTo) {
        this.logger.debug(`Verifying new assignee: ${updateIssueDto.assignedTo}`);
        const isValidUser = await this.verifyUser(updateIssueDto.assignedTo);
        if (!isValidUser) {
          throw new RpcException({
            status: HttpStatus.NOT_FOUND,
            message: 'El usuario asignado no existe',
          });
        }
      }

      const updatedIssue = queryRunner.manager.merge(Issue, issue, {
        ...updateIssueDto,
        updatedAt: new Date(),
        assignedTo: updateIssueDto.assignedTo || issue.assignedTo
      });

      const savedIssue = await queryRunner.manager.save(updatedIssue);
      await queryRunner.commitTransaction();
      return savedIssue;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al actualizar issue ${id}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const issue = await this.issueRepository.findOne({ 
        where: { id, isDeleted: false } 
      });
      
      if (!issue) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Issue con ID ${id} no encontrado`,
        });
      }

      issue.isDeleted = true;
      issue.updatedAt = new Date();
      await this.issueRepository.save(issue);
      return { message: 'Issue successfully deleted' };
    } catch (error) {
      this.logger.error(`Error al eliminar issue ${id}`, error.stack);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al eliminar el issue',
      });
    }
  }

  private async verifyUser(userId: string): Promise<User> {
    console.log('userId', userId)
    return await firstValueFrom(
      this.client.send('auth.find.user.by.id', userId).pipe(
        catchError((error) => {
          this.logger.error(`Error fetching user ${userId}`, error.stack);
          throw error;
        }),
      ),
    );
  }

  async createComment(createCommentDto: CreateCommentDto): Promise<Comments> {
    try {
      const { issue_id, user_id, comment } = createCommentDto;
      this.logger.debug(`Creating comment for issue ${issue_id} by user ${user_id}`);

      // Verify if the issue exists
      const issue = await this.findOne(issue_id);
      if (!issue) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Issue no encontrado',
        });
      }

      // Verify if the user exists
      this.logger.debug(`Verifying comment author: ${user_id}`);
      const userExists = await this.verifyUser(user_id);
      if (!userExists) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Usuario no encontrado',
        });
      }

      const newComment = this.commentsRepository.create({
        comment,
        user_id,
        issue,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return await this.commentsRepository.save(newComment);
    } catch (error) {
      this.logger.error(`Error al crear comentario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCommentsByIssue(issueId: string): Promise<Comments[]> {
    try {
      if (!validateUUID(issueId)) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'ID de issue inválido',
        });
      }

      const comments = await this.commentsRepository.find({
        where: { issue: { id: issueId } },
        order: { createdAt: 'DESC' },
      });

      return comments;
    } catch (error) {
      this.logger.error(`Error al obtener comentarios del issue ${issueId}`, error.stack);
      throw error;
    }
  }

  async updateComment(commentId: string, updateCommentDto: UpdateCommentDto): Promise<Comments> {
    try {
      if (!validateUUID(commentId)) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'ID de comentario inválido',
        });
      }

      const comment = await this.commentsRepository.findOne({
        where: { id: commentId },
      });

      if (!comment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Comentario no encontrado',
        });
      }

      const updatedComment = this.commentsRepository.merge(comment, {
        ...updateCommentDto,
        updatedAt: new Date(),
      });

      return await this.commentsRepository.save(updatedComment);
    } catch (error) {
      this.logger.error(`Error al actualizar comentario ${commentId}`, error.stack);
      throw error;
    }
  }

  async deleteComment(commentId: string): Promise<{ message: string }> {
    try {
      if (!validateUUID(commentId)) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'ID de comentario inválido',
        });
      }

      const comment = await this.commentsRepository.findOne({
        where: { id: commentId },
        relations: ['issue'],
      });

      if (!comment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Comentario no encontrado',
        });
      }

      // Verificar que el issue asociado no esté eliminado
      if (comment.issue.isDeleted) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'No se puede eliminar un comentario de un issue eliminado',
        });
      }

      await this.commentsRepository.remove(comment);
      return { message: 'Comentario eliminado exitosamente' };
    } catch (error) {
      this.logger.error(`Error al eliminar comentario ${commentId}`, error.stack);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al eliminar el comentario',
      });
    }
  }

  /**
   * Get the last issue number for a specific project
   * @param projectId Project ID
   * @returns Last issue number
   */
  async getLastIssueNumber(projectId: string): Promise<number> {
    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId }
      });

      if (!project) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Project with ID ${projectId} not found`,
        });
      }

      const projectKey = project.project_key;

      // Find all issues for this project
      const issues = await this.issueRepository
        .createQueryBuilder('issue')
        .innerJoin('issue.product_backlog', 'backlog')
        .innerJoin('backlog.project', 'project')
        .where('project.id = :projectId', { projectId })
        .getMany();
      
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

      return maxNumber;
    } catch (error) {
      this.logger.error(`Error getting last issue number: ${error.message}`, error.stack);
      throw error;
    }
  }
}
