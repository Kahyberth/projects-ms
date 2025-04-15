import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

@Controller()
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @MessagePattern('createIncident')
  create(@Payload() createIncidentDto: CreateIncidentDto) {
    return this.incidentsService.create(createIncidentDto);
  }

  @MessagePattern('findAllIncidents')
  findAll() {
    return this.incidentsService.findAll();
  }

  @MessagePattern('findOneIncident')
  findOne(@Payload() id: number) {
    return this.incidentsService.findOne(id);
  }

  @MessagePattern('updateIncident')
  update(@Payload() updateIncidentDto: UpdateIncidentDto) {
    return this.incidentsService.update(updateIncidentDto.id, updateIncidentDto);
  }

  @MessagePattern('removeIncident')
  remove(@Payload() id: number) {
    return this.incidentsService.remove(id);
  }
}
