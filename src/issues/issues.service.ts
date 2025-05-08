import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { catchError, lastValueFrom, timeout } from 'rxjs';
import { Repository } from 'typeorm';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Issue } from './entities/issue.entity';

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

  /**
   * Read all issues
   * @param payload
   * @returns
   */
  async findAll(): Promise<Issue[]> {
    try {
      return await this.issueRepository.find({
        where: { isDeleted: false },
        order: { createdAt: 'DESC' },
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
        where: { id, isDeleted: false },
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
          isDeleted: false,
        },
        order: { createdAt: 'DESC' },
      });

      if (issues.length === 0) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'No se encontraron issues asignados a este usuario',
        });
      }

      return issues;
    } catch (error) {
      this.logger.error(
        `Error al obtener issues del usuario ${userId}`,
        error.stack,
      );

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
          isDeleted: false,
        },
        order: { createdAt: 'DESC' },
      });

      if (issues.length === 0) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'No se encontraron issues en este product backlog',
        });
      }

      return issues;
    } catch (error) {
      this.logger.error(
        `Error al obtener issues del backlog ${backlogId}`,
        error.stack,
      );

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
        assignedTo: updateIssueDto.assignedTo || issue.assignedTo,
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
        where: { id, isDeleted: false },
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
          catchError((error) => {
            this.logger.error(`Error verificando usuario ${userId}:`, error);
            throw new RpcException({
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: `Error al verificar usuario: ${error.message}`,
            });
          }),
        ),
      );

      if (!user) {
        this.logger.warn(`Usuario ${userId} no encontrado`);
        return false;
      }

      this.logger.debug(`Usuario ${userId} verificado exitosamente`);
      return true;
    } catch (error) {
      this.logger.error(`Error en verifyUser para ${userId}`, error.stack);
      return false;
    }
  }

  private async verifyProjectMembership(
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    // TODO: Eliminar este mock cuando la parte de projects esté listo
    this.logger.warn(
      '⚠️ Usando mock de verificación de proyecto - Reemplazar cuando el servicio de projects esté disponible',
    );

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
