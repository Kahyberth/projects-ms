import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class IssueDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class CreateSprintBacklogDto {
  @IsNotEmpty()
  @IsString()
  sprintId: string;

  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsArray()
  issues: IssueDto[];
}
