import { IsNotEmpty, IsString } from 'class-validator';

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
}
