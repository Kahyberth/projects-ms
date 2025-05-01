import { Injectable, Inject, HttpStatus, Logger } from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Issue } from './entities/issue.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, lastValueFrom, timeout } from 'rxjs';

@Injectable()
export class issuesService {
  private readonly logger = new Logger(issuesService.name);
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @Inject('NATS_SERVICE') private readonly client: ClientProxy,
  ) {}

  /**
   * Create a new issue
   * @param payload
   * @returns
   */
  async create(createIssueDto: CreateIssueDto): Promise<Issue> {
    console.log('entraaaa')
    const { createdBy, projectId, assignedTo = createdBy } = createIssueDto;

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
      });

      return await this.issueRepository.save(newIssue);
    } catch (error) {
      this.logger.error(`Error al crear issue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Read all issues
   * @param payload
   * @returns
   */
  async findAll(): Promise<Issue[]> {
    try {
      return await this.issueRepository.find({ 
        where: { isDeleted: false },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error('Error al obtener issues', error.stack);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al obtener issues',
      });
    }
  }

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
      throw error;
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

  async remove(id: string): Promise<Issue> {
    try {
      const issue = await this.findOne(id);
      issue.isDeleted = true;
      issue.updatedAt = new Date();
      return await this.issueRepository.save(issue);
    } catch (error) {
      this.logger.error(`Error al eliminar issue ${id}`, error.stack);
      throw error;
    }
  }

  private async verifyUser(userId: string): Promise<boolean> {
    try {
      const user = await lastValueFrom(
        this.client.send('auth.get.profile', userId).pipe(
          timeout(5000),
          catchError(error => {
            this.logger.error(`Error verificando usuario ${userId}:`, error);
            throw new RpcException({
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: 'Error al verificar usuario',
            });
          })
        )
      );
      return !!user;
    } catch (error) {
      this.logger.error(`Error en verifyUser para ${userId}`, error.stack);
      return false;
    }
  }

  private async verifyProjectMembership(projectId: string, userId: string): Promise<boolean> {
    // TODO: Eliminar este mock cuando la parte de projects esté listo
    this.logger.warn('⚠️ Usando mock de verificación de proyecto - Reemplazar cuando el servicio de projects esté disponible');
    
    // Implementación temporal:
    // - Devuelve true por defecto para permitir el flujo
    // - Registra en logs para identificar usos
    return true;
    
    /* Implementación final (descomentar luego):
    return lastValueFrom(
      this.client.send('projects.verify_member', { projectId, userId })
        .pipe(timeout(3000))
    */
  }
}