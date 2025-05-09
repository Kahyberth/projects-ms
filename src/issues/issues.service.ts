import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { catchError, lastValueFrom, of, timeout } from 'rxjs';
import { Repository } from 'typeorm';
import { validate as validateUUID } from 'uuid';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Comments } from './entities/comments.entity';
import { Issue } from './entities/issue.entity';

@Injectable()
export class issuesService {
  private readonly logger = new Logger(issuesService.name);
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(Comments)
    private readonly commentsRepository: Repository<Comments>,
    @Inject('NATS_SERVICE') private readonly client: ClientProxy,
  ) {}

  /**
   * Create a new issue
   * @param payload
   * @returns
   */
  async create(createIssueDto: CreateIssueDto): Promise<Issue> {
    console.log('entraaaa')
    const { createdBy, productBacklogId, assignedTo = createdBy } = createIssueDto;

    try {
      // Verificación de usuarios en paralelo
      const [creatorExists, assigneeExists] = await Promise.all([
        this.verifyUser(createdBy),
        assignedTo !== createdBy ? this.verifyUser(assignedTo) : true,
      ]);

      if (!creatorExists) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'El usuario creador no existe',
        });
      }

      if (!assigneeExists) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'El usuario asignado no existe',
        });
      }

      const newIssue = this.issueRepository.create({
        ...createIssueDto,
        assignedTo,
        status: createIssueDto.status || 'to-do',
        priority: createIssueDto.priority || 'medium',
        type: createIssueDto.type || 'user_story',
        story_points: createIssueDto.story_points ?? null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        product_backlog: { id: productBacklogId },
      });

      return await this.issueRepository.save(newIssue);
    } catch (error) {
      this.logger.error(`Error al crear issue: ${error.message}`, error.stack);
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

  async update(id: string, updateIssueDto: UpdateIssueDto): Promise<Issue> {
    try {
      const issue = await this.findOne(id);

      if (updateIssueDto.assignedTo) {
        const isValidUser = await this.verifyUser(updateIssueDto.assignedTo);
        if (!isValidUser) {
          throw new RpcException({
            status: HttpStatus.NOT_FOUND,
            message: 'El usuario asignado no existe',
          });
        }
      }

      const updatedIssue = this.issueRepository.merge(issue, {
        ...updateIssueDto,
        updatedAt: new Date(),
        assignedTo: updateIssueDto.assignedTo || issue.assignedTo
      });

      return await this.issueRepository.save(updatedIssue);
    } catch (error) {
      this.logger.error(`Error al actualizar issue ${id}`, error.stack);
      throw error;
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

  private async verifyUser(userId: string): Promise<boolean> {
    try {
      this.logger.debug(`Intentando verificar usuario ${userId}`);
      
      const user = await lastValueFrom(
        this.client.send('auth.get.profile', userId).pipe(
          timeout(5000),
          catchError(error => {
            this.logger.error(`Error detallado verificando usuario ${userId}:`, {
              error: error.message,
              stack: error.stack,
              name: error.name,
              code: error.code
            });
            
            if (error.name === 'TimeoutError') {
              throw new RpcException({
                status: HttpStatus.REQUEST_TIMEOUT,
                message: 'Timeout al verificar usuario',
              });
            }
            
            // Si es un error de conexión NATS
            if (error.code === 'ECONNREFUSED' || error.code === 'NATS_CONNECTION_ERROR') {
              throw new RpcException({
                status: HttpStatus.SERVICE_UNAVAILABLE,
                message: 'Servicio de autenticación no disponible',
              });
            }

            // Si el error es que el usuario no existe
            if (error.code === 404 || error.message?.includes('Usuario no encontrado')) {
              return of(false);
            }
            
            throw new RpcException({
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: `Error al verificar usuario: ${error.message}`,
            });
          })
        )
      );
      
      if (!user) {
        this.logger.warn(`Usuario ${userId} no encontrado`);
        return false;
      }
      
      this.logger.debug(`Usuario ${userId} verificado exitosamente`);
      return true;
    } catch (error) {
      this.logger.error(`Error en verifyUser para ${userId}:`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      
      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error al verificar usuario: ${error.message}`,
      });
    }
  }

  async createComment(createCommentDto: CreateCommentDto): Promise<Comments> {
    try {
      const { issue_id, user_id, comment } = createCommentDto;

      // Verify if the issue exists
      const issue = await this.findOne(issue_id);
      if (!issue) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Issue no encontrado',
        });
      }

      // Verify if the user exists
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
}