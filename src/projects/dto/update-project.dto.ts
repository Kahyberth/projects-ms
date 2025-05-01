import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['completed', 'in-progress', 'on-hold'])
  status?: 'completed' | 'in-progress' | 'on-hold';

  @IsOptional()
  @IsString()
  team_id?: string;
}
