import { Injectable } from '@nestjs/common';
import { CreateSprintBacklogDto } from './dto/create-sprint-backlog.dto';
import { UpdateSprintBacklogDto } from './dto/update-sprint-backlog.dto';

@Injectable()
export class SprintBacklogService {
  create(createSprintBacklogDto: CreateSprintBacklogDto) {
    return 'This action adds a new sprintBacklog';
  }

  findAll() {
    return `This action returns all sprintBacklog`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sprintBacklog`;
  }

  update(id: number, updateSprintBacklogDto: UpdateSprintBacklogDto) {
    return `This action updates a #${id} sprintBacklog`;
  }

  remove(id: number) {
    return `This action removes a #${id} sprintBacklog`;
  }
}
