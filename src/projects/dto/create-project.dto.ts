import { IsString, IsOptional, IsDate, IsArray } from 'class-validator';
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
  members: string[];
}
