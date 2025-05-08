import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum Status {
  REVIEW = 'review',
  TODO = 'to-do',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export class CreateEpicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @IsUUID()
  @IsNotEmpty()
  productBacklogId: string;
} 