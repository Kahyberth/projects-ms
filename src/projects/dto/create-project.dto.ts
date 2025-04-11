import { IsString, IsOptional, IsDate} from 'class-validator';
export class CreateProjectDto {
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsOptional()
  @IsDate()
  startDate: Date;
  @IsOptional()
  @IsDate()
  endDate: Date;
}
