import { IsNotEmpty, IsString } from 'class-validator';

export class AssistantRequestDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  query: string;
}
