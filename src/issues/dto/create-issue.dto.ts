import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum Status {
  REVIEW = 'review',
  TODO = 'to-do',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IssueType {
  BUG = 'bug',
  FEATURE = 'feature',
  TASK = 'task',
  REFACTOR = 'refactor',
  USER_STORY = 'user_story',
}

export class CreateIssueDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @IsEnum(IssueType)
  @IsOptional()
  type?: IssueType;

  @IsString()
  @IsOptional()
  acceptanceCriteria: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  story_points?: number | null;

  @IsUUID()
  createdBy: string;

  @IsUUID()
  @IsOptional()
  assignedTo: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;

  @IsUUID()
  productBacklogId: string;

  @IsUUID()
  @IsOptional()
  epicId?: string;

}
