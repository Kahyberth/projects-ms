import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Epic } from './entities/epic.entity';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class EpicsService {
  private readonly logger = new Logger(EpicsService.name);

  constructor(
    @InjectRepository(Epic)
    private readonly epicRepository: Repository<Epic>,
  ) {}

  async create(createEpicDto: CreateEpicDto): Promise<Epic> {
    try {
      const existingEpic = await this.epicRepository.findOne({
        where: {
          name: createEpicDto.name,
          productBacklog: { id: createEpicDto.productBacklogId }
        }
      });

      if (existingEpic) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: 'Ya existe una épica con este nombre en el product backlog',
        });
      }

      const newEpic = this.epicRepository.create({
        ...createEpicDto,
        status: createEpicDto.status || 'to-do',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return await this.epicRepository.save(newEpic);
    } catch (error) {
      this.logger.error(`Error creating epic: ${error.message}`, error.stack);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error creating epic',
      });
    }
  }

  async findByProductBacklog(productBacklogId: string): Promise<Epic[]> {
    try {
      const epics = await this.epicRepository.find({
        where: { productBacklog: { id: productBacklogId } },
        relations: ['productBacklog', 'issue'],
        order: { createdAt: 'DESC' }
      });

      if (!epics || epics.length === 0) {
        return [];
      }

      return epics;
    } catch (error) {
      this.logger.error(`Error fetching epics for product backlog ${productBacklogId}`, error.stack);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error fetching product backlog epics',
      });
    }
  }

  async findOne(id: string): Promise<Epic> {
    try {
      const epic = await this.epicRepository.findOne({
        where: { id },
        relations: ['productBacklog', 'issue'],
      });

      if (!epic) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Epic with ID ${id} not found`,
        });
      }

      return epic;
    } catch (error) {
      this.logger.error(`Error fetching epic ${id}`, error.stack);
      
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error fetching epic',
      });
    }
  }

  async update(id: string, updateEpicDto: UpdateEpicDto): Promise<Epic> {
    try {
      const epic = await this.findOne(id);

      if (updateEpicDto.name) {
        const existingEpic = await this.epicRepository.findOne({
          where: {
            name: updateEpicDto.name,
            productBacklog: { id: epic.productBacklog.id },
            id: Not(id)
          }
        });

        if (existingEpic) {
          throw new RpcException({
            status: HttpStatus.CONFLICT,
            message: 'Ya existe una épica con este nombre en el product backlog',
          });
        }
      }

      const updatedEpic = this.epicRepository.merge(epic, {
        ...updateEpicDto,
        updatedAt: new Date(),
      });
      return await this.epicRepository.save(updatedEpic);
    } catch (error) {
      this.logger.error(`Error updating epic ${id}`, error.stack);
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error updating epic',
      });
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const epic = await this.findOne(id);
      await this.epicRepository.remove(epic);
      return { message: 'Epic successfully deleted' };
    } catch (error) {
      this.logger.error(`Error removing epic ${id}`, error.stack);
      
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error removing epic',
      });
    }
  }
} 