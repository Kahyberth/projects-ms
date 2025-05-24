import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  invitedUserId: string;
  
}