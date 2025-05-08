import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateEpicDto } from './create-epic.dto';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateEpicDto extends PartialType(
  OmitType(CreateEpicDto, ['productBacklogId'] as const)
) {
  @IsUUID()
  @IsNotEmpty()
  id: string;
} 