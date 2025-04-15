import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SprintBacklogService } from './sprint-backlog.service';
import { CreateSprintBacklogDto } from './dto/create-sprint-backlog.dto';
import { UpdateSprintBacklogDto } from './dto/update-sprint-backlog.dto';

@Controller()
export class SprintBacklogController {
  constructor(private readonly sprintBacklogService: SprintBacklogService) {}

  @MessagePattern('createSprintBacklog')
  create(@Payload() createSprintBacklogDto: CreateSprintBacklogDto) {
    return this.sprintBacklogService.create(createSprintBacklogDto);
  }

  @MessagePattern('findAllSprintBacklog')
  findAll() {
    return this.sprintBacklogService.findAll();
  }

  @MessagePattern('findOneSprintBacklog')
  findOne(@Payload() id: number) {
    return this.sprintBacklogService.findOne(id);
  }

  @MessagePattern('updateSprintBacklog')
  update(@Payload() updateSprintBacklogDto: UpdateSprintBacklogDto) {
    return this.sprintBacklogService.update(updateSprintBacklogDto.id, updateSprintBacklogDto);
  }

  @MessagePattern('removeSprintBacklog')
  remove(@Payload() id: number) {
    return this.sprintBacklogService.remove(id);
  }
}
