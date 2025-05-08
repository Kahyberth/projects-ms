import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EpicsService } from './epics.service';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';

@Controller()
export class EpicsController {
  constructor(private readonly epicsService: EpicsService) {}

  @MessagePattern('epics.create')
  create(@Payload() createEpicDto: CreateEpicDto) {
    return this.epicsService.create(createEpicDto);
  }

  @MessagePattern('epics.findOne')
  findOne(@Payload() id: string) {
    return this.epicsService.findOne(id);
  }

  @MessagePattern('epics.findByProductBacklog')
  findByProductBacklog(@Payload() productBacklogId: string) {
    return this.epicsService.findByProductBacklog(productBacklogId);
  }

  @MessagePattern('epics.update')
  update(@Payload() updateEpicDto: UpdateEpicDto) {
    return this.epicsService.update(updateEpicDto.id, updateEpicDto);
  }

  @MessagePattern('epics.remove')
  remove(@Payload() id: string) {
    return this.epicsService.remove(id);
  }
} 