import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class SendEmailDto {
  @Transform(({ value }) => typeof value === "string" ? [value] : Array.isArray(value) ? value : [])
  @IsEmail({}, { each: true })
  to: string[];

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  replyTo?: string;

  @Transform(({ value }) => typeof value === "string" ? [value] : Array.isArray(value) ? value : undefined)
  @IsOptional()
  @IsEmail({}, { each: true })
  cc?: string[];

  @Transform(({ value }) => typeof value === "string" ? [value] : Array.isArray(value) ? value : undefined)
  @IsOptional()
  @IsEmail({}, { each: true })
  bcc?: string[];
}
