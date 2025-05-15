import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateIssueDto } from './create-issue.dto';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateIssueDto extends PartialType(
  OmitType(CreateIssueDto, ['createdBy', 'productBacklogId'] as const)
) {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;
}