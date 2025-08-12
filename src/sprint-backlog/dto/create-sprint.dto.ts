import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateSprintDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  goal: string;

  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
