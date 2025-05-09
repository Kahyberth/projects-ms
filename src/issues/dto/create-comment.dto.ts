import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  comment: string;

  @IsNotEmpty()
  @IsUUID()
  issue_id: string;

  @IsNotEmpty()
  @IsString()
  user_id: string;
} 