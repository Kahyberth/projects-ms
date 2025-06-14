import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { catchError, firstValueFrom, lastValueFrom, timeout } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Issue } from './entities/issue.entity';
import { Project } from '../projects/entities/project.entity';
import { Members } from '../projects/entities/members.entity';
import { Comments } from './entities/comments.entity';
import { User } from '../interfaces/user.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Epic } from './entities/epic.entity';
@Injectable()
export class issuesService {
  private readonly logger = new Logger(issuesService.name);
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @Inject('NATS_SERVICE') private readonly client: ClientProxy,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Comments)
    private readonly commentsRepository: Repository<Comments>,
    @InjectRepository(Epic)
    private readonly epicRepository: Repository<Epic>,
    private readonly dataSource: DataSource,
  ) {}

  
 
  async findOne(id: string): Promise<Issue> {
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
      

      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener issues del usuario',
      });
    }
}

  async update(id: string, updateIssueDto: UpdateIssueDto): Promise<Issue> {
    if (!updateIssueDto) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'No se proporcionaron datos para actualizar',
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.debug(`Updating issue ${id} with data: ${JSON.stringify(updateIssueDto)}`);
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id, isDeleted: false },
        relations: ['product_backlog', 'sprint']
      });

      if (!issue) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Issue con ID ${id} no encontrado`,
        });
      }

      // Issue should be either in a product backlog or in a sprint
      if (!issue.product_backlog && !issue.sprint) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Issue must be associated with either a product backlog or a sprint',
        });
      }

      if (updateIssueDto.assignedTo && updateIssueDto.assignedTo !== issue.assignedTo) {
        const isValidUser = await this.verifyUser(updateIssueDto.assignedTo);
        if (!isValidUser) {
          throw new RpcException({
            status: HttpStatus.NOT_FOUND,
            message: 'El usuario asignado no existe',
          });
        }

        this.client.emit('notification.issue.assigned', {
          userId: updateIssueDto.assignedTo,
          issueData: {
            id: issue.id,
            title: issue.title,
            description: issue.description,
            code: issue.code,
            status: issue.status,
            priority: issue.priority,
            type: issue.type,
          }
        });
      }

      const updatedIssue = queryRunner.manager.merge(Issue, issue, {
        ...updateIssueDto,
        updatedAt: new Date(),
        assignedTo: updateIssueDto.assignedTo || issue.assignedTo,
        epic: updateIssueDto.epicId ? { id: updateIssueDto.epicId } : null,
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

      const issue = await this.findOne(issue_id);
      if (!issue) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Issue no encontrado',
        });
      }

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

  async getIssuesByEpic(epicId: string): Promise<Issue[]> {
    try {

      this.logger.debug(`Buscando épica con ID: ${epicId}`);
      const epic = await this.epicRepository.findOne({ 
        where: { id: epicId } 
      });
      
      if (!epic) {
        this.logger.warn(`Épica no encontrada con ID: ${epicId}`);
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Epic con ID ${epicId} no encontrado`,
        });
      }

      this.logger.debug(`Buscando issues para la épica: ${epicId}`);
      const issues = await this.issueRepository.find({
        where: { 
          epic: { id: epicId },
          isDeleted: false 
        },
        relations: ['epic', 'product_backlog'],
        order: {
          createdAt: 'DESC'
        }
      });

      
      return issues;
    } catch (error) {
      this.logger.error(`Error al obtener issues de la épica ${epicId}:`, error.stack);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error al obtener los issues de la épica: ${error.message}`,
      });
    }
  }

  async getIssuesByProject(projectId: string): Promise<Issue[]> {
    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['backlog']
      });

      if (!project) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Project with ID ${projectId} not found`,
        });
      }
      const allIssues: Issue[] = [];

      // 1. Get issues from project backlog
      if (project.backlog) {
        const backlogIssues = await this.issueRepository
          .createQueryBuilder('issue')
          .leftJoinAndSelect('issue.product_backlog', 'product_backlog')
          .leftJoinAndSelect('issue.epic', 'epic')
          .where('product_backlog.id = :backlogId', { backlogId: project.backlog.id })
          .andWhere('issue.isDeleted = :isDeleted', { isDeleted: false })
          .getMany();
        
        allIssues.push(...backlogIssues);
      }

      // 2. Get issues from project sprints
      const sprintIssues = await this.issueRepository
        .createQueryBuilder('issue')
        .leftJoinAndSelect('issue.sprint', 'sprint')
        .leftJoinAndSelect('issue.epic', 'epic')
        .where('sprint.project = :projectId', { projectId })
        .andWhere('issue.isDeleted = :isDeleted', { isDeleted: false })
        .getMany();

      allIssues.push(...sprintIssues);

      const uniqueIssues = allIssues.filter((issue, index, self) => 
        index === self.findIndex(i => i.id === issue.id)
      );

      uniqueIssues.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      this.logger.debug(`Found ${uniqueIssues.length} issues for project ${projectId}`);
      return uniqueIssues;
    } catch (error) {
      this.logger.error(`Error al obtener issues del proyecto ${projectId}:`, error.stack);
      if (error instanceof RpcException) {
      throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error al obtener los issues del proyecto: ${error.message}`,
      });
    }
  }




   /**
   * Actualiza el status de una issue
   * @param id ID de la issue
   * @param newStatus Nuevo status de la issue
   * @returns Issue actualizada
   */
   async updateIssueStatus(id: string, newStatus: string): Promise<Issue> {
    try {
      const issue = await this.findOne(id);
      const validStatuses = ['to-do', 'in-progress', 'review', 'resolved', 'closed'];
      if (!validStatuses.includes(newStatus)) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Status inválido',
        });
      }
      issue.status = newStatus;
      issue.updatedAt = new Date();
      return await this.issueRepository.save(issue);
    } catch (error) {
      this.logger.error(`Error al actualizar status de issue ${id}`, error.stack);
      throw error;
    }
  }




}
