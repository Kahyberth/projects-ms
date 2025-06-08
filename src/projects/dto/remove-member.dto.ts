import { IsNotEmpty } from "class-validator";
import { IsString } from "class-validator";


export class RemoveMemberDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
