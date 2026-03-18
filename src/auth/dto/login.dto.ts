<<<<<<< HEAD
import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';
=======
import { IsEmail, IsString, MinLength } from 'class-validator';
>>>>>>> master

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
<<<<<<< HEAD
  password: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
=======
  @MinLength(6)
  password: string;
>>>>>>> master
}
