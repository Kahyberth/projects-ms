import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  created_by: string;

  @IsString()
  team_id: string;


  @IsString({
    each: true,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsEnum(['SCRUM', 'KANBAN'])
  type: string;

  @IsString({
    each: true,
  })
  @IsArray()
  @IsOptional()
  members?: string[];
}
