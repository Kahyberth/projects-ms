import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateIssueDto } from './create-issue.dto';
import { IsUUID } from 'class-validator';

export class UpdateIssueDto extends PartialType(
  OmitType(CreateIssueDto, ['createdBy', 'productBacklogId'] as const)
) {
  @IsUUID()
  id: string;
}