import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsUUID } from 'class-validator';
import { CreateIssueDto } from './create-issue.dto';

export class UpdateIssueDto extends PartialType(
  OmitType(CreateIssueDto, ['createdBy'] as const),
) {
  @IsUUID()
  id: string;
  newPriority: number;
  issueId: string;
}
