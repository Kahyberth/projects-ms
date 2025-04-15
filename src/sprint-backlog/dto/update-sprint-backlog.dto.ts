import { PartialType } from '@nestjs/mapped-types';
import { CreateSprintBacklogDto } from './create-sprint-backlog.dto';

export class UpdateSprintBacklogDto extends PartialType(CreateSprintBacklogDto) {
  id: number;
}
