<<<<<<< HEAD
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
=======
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
>>>>>>> master
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
<<<<<<< HEAD
  @MinLength(8)
=======
  @MinLength(6)
>>>>>>> master
  password: string;
}
