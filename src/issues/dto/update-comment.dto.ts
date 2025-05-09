import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UpdateCommentDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsString()
  comment: string;

  @IsNotEmpty()
  @IsString()
  user_id: string;
} 